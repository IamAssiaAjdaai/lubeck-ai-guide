import { beforeEach, describe, expect, it, vi } from "vitest";

import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";
import {
  RevenueCatCityPassBilling,
  type RevenueCatCityPassDependencies,
} from "../src/lib/revenueCatCityPass";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("react-native-purchases", () => ({
  default: {
    configure: vi.fn(),
    getAppUserID: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    getOfferings: vi.fn(),
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
  },
}));

const pass = CITYWALK_CITY_PASS_72H.lubeck;
const storePackage = {
  identifier: pass.packageIdentifier,
  product: { identifier: pass.productIdentifier },
};

function fixture() {
  const configure = vi.fn(() => ({ configured: true as const, platform: "ios" as const }));
  const loadPlans = vi.fn(async () => [{
    kind: "city_pass_72h" as const,
    packageIdentifier: pass.packageIdentifier,
    productIdentifier: pass.productIdentifier,
    localizedPrice: "4,99 €",
    currencyCode: "EUR",
    price: 4.99,
  }]);
  const syncIdentity = vi.fn(async () => ({ configured: true as const, platform: "ios" as const }));
  const getOfferings = vi.fn(async () => ({ current: { availablePackages: [storePackage] } }));
  const purchasePackage = vi.fn(async () => ({ customerInfo: {} }));
  const restorePurchases = vi.fn(async () => ({}));
  const access = vi.fn(async () => false);
  const wait = vi.fn(async () => undefined);
  const deps = {
    configure,
    loadPlans,
    syncIdentity,
    getOfferings,
    purchasePackage,
    restorePurchases,
    access,
    wait,
  } as unknown as RevenueCatCityPassDependencies;
  return {
    billing: new RevenueCatCityPassBilling(deps),
    configure,
    loadPlans,
    syncIdentity,
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
    await expect(h.billing.product("wrong-product")).resolves.toBeUndefined();
  });

  it("synchronizes immutable CITYWALK identity before an explicit purchase", async () => {
    const h = fixture();
    await expect(h.billing.purchase(pass.productIdentifier, "user-123")).resolves.toEqual({ status: "purchased" });
    expect(h.syncIdentity).toHaveBeenCalledWith("user-123");
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
    expect(h.syncIdentity).toHaveBeenCalledWith("user-123");
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
