import {
  CITYWALK_REVENUECAT_PACKAGE_IDS,
  CITYWALK_REVENUECAT_PRODUCT_IDS,
  matchesCitywalkRevenueCatProduct,
} from "@citywalk/traveler-core";

export const CITYWALK_PREMIUM_PRODUCTS = Object.freeze({
  monthly: {
    kind: "monthly" as const,
    packageIdentifier: CITYWALK_REVENUECAT_PACKAGE_IDS.monthly,
    productIdentifier: CITYWALK_REVENUECAT_PRODUCT_IDS.monthly,
  },
  annual: {
    kind: "annual" as const,
    packageIdentifier: CITYWALK_REVENUECAT_PACKAGE_IDS.annual,
    productIdentifier: CITYWALK_REVENUECAT_PRODUCT_IDS.annual,
  },
});

export type PremiumPlanKind = keyof typeof CITYWALK_PREMIUM_PRODUCTS;

export type PremiumPlan = Readonly<{
  kind: PremiumPlanKind;
  packageIdentifier: string;
  productIdentifier: string;
  localizedPrice: string;
  currencyCode?: string;
  price?: number;
}>;

export type RevenueCatPremiumPackage = Readonly<{
  identifier: string;
  product: Readonly<{ identifier: string }>;
}>;

export type PremiumActionResult =
  | Readonly<{ status: "active" }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "not_active" }>;

export type RevenueCatPremiumDependencies = Readonly<{
  ensureConfigured: (account?: string) => Promise<boolean>;
  loadPlans: () => Promise<readonly PremiumPlan[]>;
  getOfferings: () => Promise<Readonly<{ current?: Readonly<{ availablePackages: readonly RevenueCatPremiumPackage[] }> | null }>>;
  purchasePackage: (pkg: RevenueCatPremiumPackage) => Promise<unknown>;
  restorePurchases: () => Promise<unknown>;
  access: (account: string) => Promise<boolean>;
  wait: (milliseconds: number) => Promise<void>;
}>;

function cancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { userCancelled?: unknown; code?: unknown };
  return value.userCancelled === true || value.code === "PURCHASE_CANCELLED_ERROR";
}

export function premiumEnabled(): boolean {
  return process.env.EXPO_PUBLIC_CITYWALK_REVENUECAT_PREMIUM === "1" &&
    process.env.EXPO_PUBLIC_CITYWALK_BILLING !== "sandbox";
}

export class RevenueCatPremiumBilling {
  constructor(
    private dependencies: RevenueCatPremiumDependencies,
    private platform: "ios" | "android" = "ios",
  ) {}

  async plans(): Promise<readonly PremiumPlan[]> {
    if (!await this.dependencies.ensureConfigured()) return [];
    const plans = await this.dependencies.loadPlans();
    return plans.filter((plan) => {
      const expected = CITYWALK_PREMIUM_PRODUCTS[plan.kind];
      return expected &&
        plan.packageIdentifier === expected.packageIdentifier &&
        matchesCitywalkRevenueCatProduct(expected.productIdentifier, plan.productIdentifier, this.platform) &&
        Boolean(plan.localizedPrice.trim());
    });
  }

  private async pkg(kind: PremiumPlanKind, account: string): Promise<RevenueCatPremiumPackage> {
    if (!await this.dependencies.ensureConfigured(account)) throw new Error("REVENUECAT_UNAVAILABLE");
    const expected = CITYWALK_PREMIUM_PRODUCTS[kind];
    const offerings = await this.dependencies.getOfferings();
    const pkg = offerings.current?.availablePackages.find((candidate) =>
      candidate.identifier === expected.packageIdentifier &&
      matchesCitywalkRevenueCatProduct(expected.productIdentifier, candidate.product.identifier, this.platform),
    );
    if (!pkg) throw new Error("PREMIUM_PACKAGE_UNAVAILABLE");
    return pkg;
  }

  private async activate(account: string): Promise<boolean> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (await this.dependencies.access(account)) return true;
      if (attempt < 7) await this.dependencies.wait(750);
    }
    return false;
  }

  async purchase(kind: PremiumPlanKind, account: string): Promise<PremiumActionResult> {
    try {
      await this.dependencies.purchasePackage(await this.pkg(kind, account));
    } catch (error) {
      if (cancelled(error)) return { status: "cancelled" };
      throw error;
    }
    return { status: await this.activate(account) ? "active" : "not_active" };
  }

  async restore(account: string): Promise<PremiumActionResult> {
    if (!await this.dependencies.ensureConfigured(account)) throw new Error("REVENUECAT_UNAVAILABLE");
    await this.dependencies.restorePurchases();
    return { status: await this.activate(account) ? "active" : "not_active" };
  }
}
