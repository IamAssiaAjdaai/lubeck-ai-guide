import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";

import type { PurchaseResult, RestoreResult, StoreProduct } from "./cityUnlock";

const cityPass = CITYWALK_CITY_PASS_72H.lubeck;

export type CityPassPlan = Readonly<{
  kind: "city_pass_72h";
  packageIdentifier: string;
  productIdentifier: string;
  localizedPrice: string;
  currencyCode?: string;
  price?: number;
}>;

export type RevenueCatStorePackage = Readonly<{
  identifier: string;
  product: Readonly<{ identifier: string }>;
}>;

export type RevenueCatCityPassDependencies = Readonly<{
  ensureConfigured: (account?: string) => Promise<boolean>;
  loadPlans: () => Promise<readonly CityPassPlan[]>;
  getOfferings: () => Promise<Readonly<{ current?: Readonly<{ availablePackages: readonly RevenueCatStorePackage[] }> | null }>>;
  purchasePackage: (pkg: RevenueCatStorePackage) => Promise<unknown>;
  restorePurchases: () => Promise<unknown>;
  access: (citySlug: string, account: string) => Promise<boolean>;
  wait: (milliseconds: number) => Promise<void>;
}>;

function isCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { userCancelled?: unknown; code?: unknown };
  return value.userCancelled === true || value.code === "PURCHASE_CANCELLED_ERROR";
}

export class RevenueCatCityPassBilling {
  constructor(private dependencies: RevenueCatCityPassDependencies) {}

  subscribe(): () => void {
    return () => undefined;
  }

  async product(id: string): Promise<StoreProduct | undefined> {
    if (id !== cityPass.productIdentifier) return undefined;
    if (!await this.dependencies.ensureConfigured()) return undefined;
    const plan = (await this.dependencies.loadPlans()).find(
      (candidate) => candidate.packageIdentifier === cityPass.packageIdentifier &&
        candidate.productIdentifier === cityPass.productIdentifier,
    );
    return plan?.localizedPrice
      ? { id: plan.productIdentifier, localizedPrice: plan.localizedPrice }
      : undefined;
  }

  private async package(account: string): Promise<RevenueCatStorePackage> {
    if (!await this.dependencies.ensureConfigured(account)) throw new Error("REVENUECAT_UNAVAILABLE");
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
    if (!await this.dependencies.ensureConfigured(account)) throw new Error("REVENUECAT_UNAVAILABLE");
    await this.dependencies.restorePurchases();
    return { storeSynced: true };
  }

  async verify(): Promise<void> {
    // RevenueCat store evidence is reconciled only by the authenticated server webhook.
  }

  async activate(account: string): Promise<boolean> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (await this.dependencies.access(cityPass.citySlug, account)) return true;
      if (attempt < 7) await this.dependencies.wait(750);
    }
    return false;
  }
}
