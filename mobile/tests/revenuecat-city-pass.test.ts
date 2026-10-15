import { beforeEach, describe, expect, it, vi } from "vitest";

import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";
import {
  RevenueCatCityPassBilling,
  type RevenueCatCityPassDependencies,
} from "../src/lib/revenueCatCityPassCore";

const pass = CITYWALK_CITY_PASS_72H.lubeck;
const storePackage = {
  identifier: pass.packageIdentifier,
  product: { identifier: pass.productIdentifier },
};

function fixture(platform: "ios" | "android" = "ios") {
  const ensureConfigured = vi.fn(async () => true);
  const loadPlans = vi.fn(async () => [{
    kind: "city_pass_72h" as const,
    packageIdentifier: pass.packageIdentifier,
    productIdentifier: pass.productIdentifier,
    localizedPrice: "4,99 €",
    currencyCode: "EUR",
    price: 4.99,
  }]);
  const getOfferings = vi.fn(async () => ({ current: { availablePackages: [storePackage] } }));
  const purchasePackage = vi.fn(async () => ({ customerInfo: {} }));
  const restorePurchases = vi.fn(async () => ({}));
  const access = vi.fn(async () => false);
  const wait = vi.fn(async () => undefined);
  const deps = {
    ensureConfigured,
    loadPlans,
    getOfferings,
    purchasePackage,
    restorePurchases,
    access,
    wait,
  } as RevenueCatCityPassDependencies;
  return {
    billing: new RevenueCatCityPassBilling(deps, platform),
    ensureConfigured,
    loadPlans,
    getOfferings,
    purchasePackage,
    restorePurchases,
    access,
    wait,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("RevenueCat City Pass adapter", () => {
  it("uses only the approved package/product and keeps the localized Store price", async () => {
    const h = fixture();
    await expect(h.billing.product(pass.productIdentifier)).resolves.toEqual({
      id: pass.productIdentifier,
      localizedPrice: "4,99 €",
    });
    expect(h.ensureConfigured).toHaveBeenCalledWith();
    await expect(h.billing.product("wrong-product")).resolves.toBeUndefined();
  });

  it("synchronizes immutable CITYWALK identity before an explicit purchase", async () => {
    const h = fixture();
    await expect(h.billing.purchase(pass.productIdentifier, "user-123")).resolves.toEqual({ status: "purchased" });
    expect(h.ensureConfigured).toHaveBeenCalledWith("user-123");
    expect(h.purchasePackage).toHaveBeenCalledWith(storePackage);
  });

  it("treats Store cancellation as a benign cancelled result", async () => {
    const h = fixture();
    h.purchasePackage.mockRejectedValueOnce({ userCancelled: true });
    await expect(h.billing.purchase(pass.productIdentifier, "user-123")).resolves.toEqual({ status: "cancelled" });
  });

  it("restores only after identity sync and returns store-synced evidence, not local access", async () => {
    const h = fixture();
    await expect(h.billing.restore(pass.productIdentifier, "user-123")).resolves.toEqual({ storeSynced: true });
    expect(h.ensureConfigured).toHaveBeenCalledWith("user-123");
    expect(h.restorePurchases).toHaveBeenCalledTimes(1);
  });

  it("waits for canonical server entitlement instead of trusting CustomerInfo", async () => {
    const h = fixture();
    h.access.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(h.billing.activate("user-123")).resolves.toBe(true);
    expect(h.access).toHaveBeenCalledTimes(3);
    expect(h.wait).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the webhook-backed server entitlement never appears", async () => {
    const h = fixture();
    await expect(h.billing.activate("user-123")).resolves.toBe(false);
    expect(h.access).toHaveBeenCalledTimes(8);
    expect(h.wait).toHaveBeenCalledTimes(7);
  });
});

describe("Google Play prepaid City Pass", () => {
  it("matches the prepaid base plan and returns the canonical logical unlock ID", async () => {
    const h = fixture("android");
    const googleId = `${pass.productIdentifier}:prepaid-3d`;
    h.loadPlans.mockResolvedValueOnce([{
      kind: "city_pass_72h",
      packageIdentifier: pass.packageIdentifier,
      productIdentifier: googleId,
      localizedPrice: "4,99 €",
      currencyCode: "EUR",
      price: 4.99,
    }]);
    await expect(h.billing.product(pass.productIdentifier))
      .resolves.toEqual({ id: pass.productIdentifier, localizedPrice: "4,99 €" });
    h.getOfferings.mockResolvedValueOnce({
      current: { availablePackages: [{ identifier: pass.packageIdentifier, product: { identifier: googleId } }] },
    });
    await expect(h.billing.purchase(pass.productIdentifier, "user-123"))
      .resolves.toEqual({ status: "purchased" });
    expect(h.purchasePackage).toHaveBeenCalledWith({
      identifier: pass.packageIdentifier,
      product: { identifier: googleId },
    });
  });

  it("rejects Android base-plan IDs when loading Apple products", async () => {
    const h = fixture("ios");
    h.loadPlans.mockResolvedValueOnce([{
      kind: "city_pass_72h",
      packageIdentifier: pass.packageIdentifier,
      productIdentifier: `${pass.productIdentifier}:prepaid-3d`,
      localizedPrice: "4,99 €",
      currencyCode: "EUR",
      price: 4.99,
    }]);
    await expect(h.billing.product(pass.productIdentifier)).resolves.toBeUndefined();
  });
});
