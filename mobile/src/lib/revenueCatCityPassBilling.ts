import Purchases from "react-native-purchases";

import { getCityUnlockProduct } from "@citywalk/traveler-core";

import type { PurchaseResult, StoreProduct } from "./cityUnlock";
import {
  CITYWALK_REVENUECAT_PACKAGE_IDS,
  configureRevenueCat,
  syncRevenueCatIdentity,
} from "./revenueCat";

const CITY_PASS_PRODUCT_ID = "com.citywalk.lubeck.pass72h";
const CITY_PASS_PROOF = "revenuecat:city_pass_72h";

type NativePackage = Parameters<typeof Purchases.purchasePackage>[0];
type CustomerInfo = Awaited<ReturnType<typeof Purchases.restorePurchases>>;

type RevenueCatCityPassDependencies = Readonly<{
  configured(): boolean;
  syncIdentity(account: string): Promise<boolean>;
  packages(): Promise<readonly NativePackage[]>;
  purchase(pkg: NativePackage): Promise<void>;
  restore(): Promise<CustomerInfo>;
  account(): Promise<string | undefined>;
  access(account: string): Promise<boolean>;
  sleep(ms: number): Promise<void>;
}>;

const defaultDependencies: RevenueCatCityPassDependencies = {
  configured() {
    return configureRevenueCat().configured;
  },
  async syncIdentity(account) {
    return (await syncRevenueCatIdentity(account)).configured;
  },
  async packages() {
    const offering = (await Purchases.getOfferings()).current;
    return offering?.availablePackages ?? [];
  },
  async purchase(pkg) {
    await Purchases.purchasePackage(pkg);
  },
  restore: () => Purchases.restorePurchases(),
  async account() {
    return undefined;
  },
  async access() {
    return false;
  },
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
};

export class RevenueCatBillingFailure extends Error {
  constructor(readonly code: "ACCOUNT_CONFLICT" | "UNAVAILABLE" = "UNAVAILABLE") {
    super(code);
    this.name = "RevenueCatBillingFailure";
  }
}

function userCancelled(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "userCancelled" in error &&
    (error as { userCancelled?: unknown }).userCancelled === true,
  );
}

/**
 * RevenueCat is store orchestration only. `verify()` waits for the independently verified
 * webhook -> PostgreSQL entitlement; CustomerInfo never grants CITYWALK access.
 */
export class RevenueCatCityPassBilling {
  private busy = false;
  private observers = new Set<(outcome?: "cancelled" | "failed") => void>();

  constructor(
    private dependencies: RevenueCatCityPassDependencies = defaultDependencies,
    private citySlug = "lubeck",
  ) {}

  subscribe(callback: (outcome?: "cancelled" | "failed") => void) {
    this.observers.add(callback);
    return () => { this.observers.delete(callback); };
  }

  private async assertAccount(account: string) {
    if (await this.dependencies.account() !== account) {
      throw new RevenueCatBillingFailure("ACCOUNT_CONFLICT");
    }
  }

  private async cityPassPackage(): Promise<NativePackage | undefined> {
    if (!this.dependencies.configured()) return undefined;
    return (await this.dependencies.packages()).find(pkg =>
      pkg.identifier === CITYWALK_REVENUECAT_PACKAGE_IDS.cityPass72h &&
      pkg.product.identifier === CITY_PASS_PRODUCT_ID,
    );
  }

  async product(id: string): Promise<StoreProduct | undefined> {
    const logicalProduct = getCityUnlockProduct(this.citySlug);
    if (!logicalProduct || id !== logicalProduct.productId) return undefined;
    const pkg = await this.cityPassPackage();
    const localizedPrice = pkg?.product.priceString?.trim();
    return pkg && localizedPrice ? { id, localizedPrice } : undefined;
  }

  async purchase(id: string, account: string): Promise<PurchaseResult> {
    if (this.busy) throw new RevenueCatBillingFailure();
    const logicalProduct = getCityUnlockProduct(this.citySlug);
    if (!logicalProduct || id !== logicalProduct.productId) throw new RevenueCatBillingFailure();
    this.busy = true;
    try {
      await this.assertAccount(account);
      if (!(await this.dependencies.syncIdentity(account))) throw new RevenueCatBillingFailure();
      const pkg = await this.cityPassPackage();
      if (!pkg) throw new RevenueCatBillingFailure();
      await this.assertAccount(account);
      try {
        await this.dependencies.purchase(pkg);
      } catch (error) {
        if (userCancelled(error)) return { status: "cancelled" };
        throw new RevenueCatBillingFailure();
      }
      await this.assertAccount(account);
      return { status: "purchased", proof: CITY_PASS_PROOF };
    } finally {
      this.busy = false;
    }
  }

  async restore(id: string, account: string): Promise<readonly string[]> {
    const logicalProduct = getCityUnlockProduct(this.citySlug);
    if (!logicalProduct || id !== logicalProduct.productId) throw new RevenueCatBillingFailure();
    await this.assertAccount(account);
    if (!(await this.dependencies.syncIdentity(account))) throw new RevenueCatBillingFailure();
    const info = await this.dependencies.restore();
    await this.assertAccount(account);
    return info.allPurchasedProductIdentifiers.includes(CITY_PASS_PRODUCT_ID)
      ? [CITY_PASS_PROOF]
      : [];
  }

  async verify(proof: string, account: string): Promise<void> {
    if (proof !== CITY_PASS_PROOF) throw new RevenueCatBillingFailure();
    await this.assertAccount(account);
    // Webhook delivery is asynchronous. Never accept CustomerInfo as the answer: poll the
    // canonical server entitlement for a bounded window and fail recoverably if it is late.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (await this.dependencies.access(account)) return;
      await this.assertAccount(account);
      if (attempt < 7) await this.dependencies.sleep(500);
    }
    throw new RevenueCatBillingFailure();
  }

  async recover(): Promise<void> {
    // RevenueCat automatically syncs Store transactions. Explicit restore remains user-
    // initiated because it can show an OS account prompt.
  }

  async dispose(): Promise<void> {
    this.observers.clear();
  }
}

export type { RevenueCatCityPassDependencies };
export { CITY_PASS_PRODUCT_ID, CITY_PASS_PROOF };
