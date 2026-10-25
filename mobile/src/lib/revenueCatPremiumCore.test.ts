import { describe, expect, it, vi } from "vitest";

import {
  CITYWALK_PREMIUM_PRODUCTS,
  RevenueCatPremiumBilling,
  type PremiumPlan,
  type RevenueCatPremiumDependencies,
} from "./revenueCatPremiumCore";

type MutableDependencies = {
  -readonly [Key in keyof RevenueCatPremiumDependencies]: RevenueCatPremiumDependencies[Key];
};

function fixture() {
  let access = false;
  const monthlyPackage = {
    identifier: "$rc_monthly",
    product: { identifier: "com.citywalk.premium.monthly" },
  };
  const annualPackage = {
    identifier: "$rc_annual",
    product: { identifier: "com.citywalk.premium.yearly" },
  };
  const plans: readonly PremiumPlan[] = [
    {
      kind: "monthly",
      packageIdentifier: "$rc_monthly",
      productIdentifier: "com.citywalk.premium.monthly",
      localizedPrice: "7,99 €",
      currencyCode: "EUR",
      price: 7.99,
    },
    {
      kind: "annual",
      packageIdentifier: "$rc_annual",
      productIdentifier: "com.citywalk.premium.yearly",
      localizedPrice: "39,99 €",
      currencyCode: "EUR",
      price: 39.99,
    },
  ];
  const dependencies: MutableDependencies = {
    ensureConfigured: vi.fn(async () => true),
    loadPlans: vi.fn(async () => plans),
    getOfferings: vi.fn(async () => ({
      current: { availablePackages: [monthlyPackage, annualPackage] },
    })),
    purchasePackage: vi.fn(async () => undefined),
    restorePurchases: vi.fn(async () => undefined),
    access: vi.fn(async () => access),
    wait: vi.fn(async () => undefined),
  };
  return {
    dependencies,
    billing: new RevenueCatPremiumBilling(dependencies),
    setAccess(value: boolean) { access = value; },
  };
}

describe("RevenueCat Premium billing", () => {
  it("returns only canonical monthly/yearly plans and localized store prices", async () => {
    const f = fixture();
    await expect(f.billing.plans()).resolves.toEqual([
      expect.objectContaining({
        kind: "monthly",
        productIdentifier: CITYWALK_PREMIUM_PRODUCTS.monthly.productIdentifier,
        localizedPrice: "7,99 €",
      }),
      expect.objectContaining({
        kind: "annual",
        productIdentifier: CITYWALK_PREMIUM_PRODUCTS.annual.productIdentifier,
        localizedPrice: "39,99 €",
      }),
    ]);
  });

  it("ignores a package whose store product id does not match the canonical contract", async () => {
    const f = fixture();
    f.dependencies.loadPlans = vi.fn(async (): Promise<readonly PremiumPlan[]> => [{
      kind: "monthly",
      packageIdentifier: "$rc_monthly",
      productIdentifier: "com.citywalk.wrong",
      localizedPrice: "0,99 €",
    }]);
    await expect(new RevenueCatPremiumBilling(f.dependencies).plans()).resolves.toEqual([]);
  });

  it("treats Store cancellation as benign and never polls access", async () => {
    const f = fixture();
    f.dependencies.purchasePackage = vi.fn(async () => { throw { userCancelled: true }; });
    await expect(new RevenueCatPremiumBilling(f.dependencies).purchase("monthly", "user-1"))
      .resolves.toEqual({ status: "cancelled" });
    expect(f.dependencies.access).not.toHaveBeenCalled();
  });

  it("does not grant Premium from a successful purchase when PostgreSQL never activates", async () => {
    const f = fixture();
    await expect(f.billing.purchase("monthly", "user-1"))
      .resolves.toEqual({ status: "not_active" });
    expect(f.dependencies.purchasePackage).toHaveBeenCalledTimes(1);
    expect(f.dependencies.access).toHaveBeenCalledTimes(8);
    expect(f.dependencies.wait).toHaveBeenCalledTimes(7);
  });

  it("accepts purchase only after the server entitlement becomes active", async () => {
    const f = fixture();
    let checks = 0;
    f.dependencies.access = vi.fn(async () => ++checks >= 3);
    await expect(new RevenueCatPremiumBilling(f.dependencies).purchase("annual", "user-1"))
      .resolves.toEqual({ status: "active" });
    expect(f.dependencies.access).toHaveBeenCalledTimes(3);
  });

  it("restore is explicit store sync and still requires server entitlement", async () => {
    const f = fixture();
    await expect(f.billing.restore("user-1")).resolves.toEqual({ status: "not_active" });
    expect(f.dependencies.restorePurchases).toHaveBeenCalledTimes(1);
    expect(f.dependencies.access).toHaveBeenCalledTimes(8);
  });

  it("restore succeeds when webhook-backed Premium is already active", async () => {
    const f = fixture();
    f.setAccess(true);
    await expect(f.billing.restore("user-1")).resolves.toEqual({ status: "active" });
  });
});

describe("Google Play RevenueCat Premium base plans", () => {
  it("accepts valid Android base-plan IDs for display and purchase", async () => {
    const f = fixture();
    const monthly = "com.citywalk.premium.monthly:monthly-autorenew";
    const yearly = "com.citywalk.premium.yearly:yearly-autorenew";
    f.dependencies.loadPlans = vi.fn(async () => [
      { kind: "monthly", packageIdentifier: "$rc_monthly", productIdentifier: monthly, localizedPrice: "7,99 €" },
      { kind: "annual", packageIdentifier: "$rc_annual", productIdentifier: yearly, localizedPrice: "39,99 €" },
    ]);
    f.dependencies.getOfferings = vi.fn(async () => ({
      current: { availablePackages: [
        { identifier: "$rc_monthly", product: { identifier: monthly } },
        { identifier: "$rc_annual", product: { identifier: yearly } },
      ] },
    }));
    const android = new RevenueCatPremiumBilling(f.dependencies, "android");
    expect(await android.plans()).toHaveLength(2);
    expect(await new RevenueCatPremiumBilling(f.dependencies, "ios").plans()).toEqual([]);
    f.dependencies.access = vi.fn(async () => true);
    await expect(new RevenueCatPremiumBilling(f.dependencies, "android").purchase("annual", "user-1"))
      .resolves.toEqual({ status: "active" });
    expect(f.dependencies.purchasePackage).toHaveBeenCalledWith({
      identifier: "$rc_annual", product: { identifier: yearly },
    });
  });

  it("rejects unexpected base-plan characters or subscription IDs", async () => {
    const f = fixture();
    f.dependencies.loadPlans = vi.fn(async () => [
      { kind: "monthly", packageIdentifier: "$rc_monthly", productIdentifier: "com.citywalk.premium.monthly:Bad_plan", localizedPrice: "7,99 €" },
      { kind: "annual", packageIdentifier: "$rc_annual", productIdentifier: "com.citywalk.wrong:yearly-autorenew", localizedPrice: "39,99 €" },
    ]);
    await expect(new RevenueCatPremiumBilling(f.dependencies, "android").plans()).toEqual([]);
  });
});
