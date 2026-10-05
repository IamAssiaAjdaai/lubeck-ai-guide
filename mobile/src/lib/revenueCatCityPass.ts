import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";
import Purchases from "react-native-purchases";

import { readCityUnlock } from "./cityUnlockAccess";
import {
  configureRevenueCat,
  loadRevenueCatPlans,
  syncRevenueCatIdentity,
} from "./revenueCat";
import type { PurchaseResult, RestoreResult, StoreProduct } from "./cityUnlock";

const cityPass = CITYWALK_CITY_PASS_72H.lubeck;

type PurchasesPackage = Parameters<typeof Purchases.purchasePackage>[0];

type RevenueCatCityPassDependencies = Readonly<{
  configure: typeof configureRevenueCat;
  loadPlans: typeof loadRevenueCatPlans;
  syncIdentity: typeof syncRevenueCatIdentity;
  getOfferings: typeof Purchases.getOfferings;
  purchasePackage: typeof Purchases.purchasePackage;
  restorePurchases: typeof Purchases.restorePurchases;
  access: typeof readCityUnlock;
  wait: (milliseconds: number) => Promise<void>;
}>;

const defaultDependencies: RevenueCatCityPassDependencies = {
  configure: configureRevenueCat,
  loadPlans: loadRevenueCatPlans,
  syncIdentity: syncRevenueCatIdentity,
  getOfferings: () => Purchases.getOfferings(),
  purchasePackage: (pkg) => Purchases.purchasePackage(pkg),
  restorePurchases: () => Purchases.restorePurchases(),
  access: readCityUnlock,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

function isCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { userCancelled?: unknown; code?: unknown };
  return value.userCancelled === true || value.code === "PURCHASE_CANCELLED_ERROR";
}

export class RevenueCatCityPassBilling {
  constructor(private dependencies: RevenueCatCityPassDependencies = defaultDependencies) {}

  subscribe(): () => void {
    return () => undefined;
  }

  async product(id: string): Promise<StoreProduct | undefined> {
    if (id !== cityPass.productIdentifier) return undefined;
    const plan = (await this.dependencies.loadPlans()).find(
      (candidate) => candidate.kind === "city_pass_72h" &&
        candidate.packageIdentifier === cityPass.packageIdentifier &&
        candidate.productIdentifier === cityPass.productIdentifier,
    );
    return plan?.localizedPrice
      ? { id: plan.productIdentifier, localizedPrice: plan.localizedPrice }
      : undefined;
  }

  private async package(account: string): Promise<PurchasesPackage> {
    const status = this.dependencies.configure();
    if (!status.configured) throw new Error("REVENUECAT_UNAVAILABLE");
    await this.dependencies.syncIdentity(account);
    const offerings = await this.dependencies.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (candidate) => candidate.identifier === cityPass.packageIdentifier &&
        candidate.product.identifier === cityPass.productIdentifier,
    );
    if (!pkg) throw new Error("CITY_PASS_PACKAGE_UNAVAILABLE");
    return pkg;
  }

  async purchase(id: string, account: string): Promise<PurchaseResult> {
    if (id !== cityPass.productIdentifier) throw new Error("CITY_PASS_PRODUCT_MISMATCH");
    try {
      await this.dependencies.purchasePackage(await this.package(account));
      return { status: "purchased" };
    } catch (error) {
      if (isCancelled(error)) return { status: "cancelled" };
      throw error;
    }
  }

  async restore(id: string, account: string): Promise<RestoreResult> {
    if (id !== cityPass.productIdentifier) throw new Error("CITY_PASS_PRODUCT_MISMATCH");
    const status = this.dependencies.configure();
    if (!status.configured) throw new Error("REVENUECAT_UNAVAILABLE");
    await this.dependencies.syncIdentity(account);
    await this.dependencies.restorePurchases();
    return { storeSynced: true };
  }

  async verify(): Promise<void> {
    // RevenueCat store evidence is reconciled only by the authenticated server webhook.
    // This adapter never writes or verifies a client receipt locally.
  }

  async activate(account: string): Promise<boolean> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (await this.dependencies.access(cityPass.citySlug, account)) return true;
      if (attempt < 7) await this.dependencies.wait(750);
    }
    return false;
  }
}

export const revenueCatCityPassBilling = new RevenueCatCityPassBilling();
