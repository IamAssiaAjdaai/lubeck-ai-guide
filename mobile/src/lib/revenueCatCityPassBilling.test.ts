import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CITY_PASS_PRODUCT_ID,
  CITY_PASS_PROOF,
  RevenueCatCityPassBilling,
  type RevenueCatCityPassDependencies,
} from "./revenueCatCityPassBilling";

const LOGICAL_PRODUCT_ID = "com.citywalk.luebeck.premium";

function fixture() {
  let account = "user-1" as string | undefined;
  let access = false;
  const pkg = {
    identifier: "city_pass_72h",
    product: {
      identifier: CITY_PASS_PRODUCT_ID,
      priceString: "4,99 €",
    },
  } as never;
  const dependencies: Partial<RevenueCatCityPassDependencies> = {
    configured: vi.fn(() => true),
    syncIdentity: vi.fn(async () => true),
    packages: vi.fn(async () => [pkg]),
    purchase: vi.fn(async () => undefined),
    restore: vi.fn(async () => ({
      allPurchasedProductIdentifiers: [CITY_PASS_PRODUCT_ID],
    } as never)),
    account: vi.fn(async () => account),
    access: vi.fn(async () => access),
    sleep: vi.fn(async () => undefined),
  };
  const billing = new RevenueCatCityPassBilling(dependencies);
  return {
    billing,
    dependencies,
    setAccount(value: string | undefined) { account = value; },
    setAccess(value: boolean) { access = value; },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("RevenueCat City Pass billing", () => {
  it("surfaces the localized RevenueCat price through the existing logical City Unlock product", async () => {
    const f = fixture();
    await expect(f.billing.product(LOGICAL_PRODUCT_ID)).resolves.toEqual({
      id: LOGICAL_PRODUCT_ID,
      localizedPrice: "4,99 €",
    });
  });

  it("fails benignly when RevenueCat is not configured or the approved package is absent", async () => {
    const unconfigured = fixture();
    unconfigured.dependencies.configured = vi.fn(() => false);
    const billing = new RevenueCatCityPassBilling(unconfigured.dependencies);
    await expect(billing.product(LOGICAL_PRODUCT_ID)).resolves.toBeUndefined();

    const absent = fixture();
    absent.dependencies.packages = vi.fn(async () => []);
    await expect(new RevenueCatCityPassBilling(absent.dependencies).product(LOGICAL_PRODUCT_ID))
      .resolves.toBeUndefined();
  });

  it("synchronizes Better Auth identity before opening the approved package purchase", async () => {
    const f = fixture();
    await expect(f.billing.purchase(LOGICAL_PRODUCT_ID, "user-1")).resolves.toEqual({
      status: "purchased",
      proof: CITY_PASS_PROOF,
    });
    expect(f.dependencies.syncIdentity).toHaveBeenCalledWith("user-1");
    expect(f.dependencies.purchase).toHaveBeenCalledTimes(1);
  });

  it("treats a RevenueCat user cancellation as cancellation rather than failure", async () => {
    const f = fixture();
    f.dependencies.purchase = vi.fn(async () => { throw { userCancelled: true }; });
    await expect(new RevenueCatCityPassBilling(f.dependencies).purchase(LOGICAL_PRODUCT_ID, "user-1"))
      .resolves.toEqual({ status: "cancelled" });
  });

  it("never grants from purchase success and waits for PostgreSQL access", async () => {
    const f = fixture();
    await f.billing.purchase(LOGICAL_PRODUCT_ID, "user-1");
    await expect(f.billing.verify(CITY_PASS_PROOF, "user-1")).rejects.toThrow("UNAVAILABLE");
    expect(f.dependencies.access).toHaveBeenCalledTimes(8);
    expect(f.dependencies.sleep).toHaveBeenCalledTimes(7);
  });

  it("accepts only after the independently refreshed server entitlement becomes active", async () => {
    const f = fixture();
    let checks = 0;
    f.dependencies.access = vi.fn(async () => {
      checks += 1;
      return checks >= 3;
    });
    const billing = new RevenueCatCityPassBilling(f.dependencies);
    await expect(billing.verify(CITY_PASS_PROOF, "user-1")).resolves.toBeUndefined();
    expect(f.dependencies.access).toHaveBeenCalledTimes(3);
  });

  it("restores only store history for the approved City Pass and still requires server verification", async () => {
    const f = fixture();
    await expect(f.billing.restore(LOGICAL_PRODUCT_ID, "user-1")).resolves.toEqual([CITY_PASS_PROOF]);
    expect(f.dependencies.restore).toHaveBeenCalledTimes(1);
    await expect(f.billing.verify(CITY_PASS_PROOF, "user-1")).rejects.toThrow("UNAVAILABLE");
  });

  it("returns an empty restore when CustomerInfo has no City Pass purchase history", async () => {
    const f = fixture();
    f.dependencies.restore = vi.fn(async () => ({ allPurchasedProductIdentifiers: [] } as never));
    await expect(new RevenueCatCityPassBilling(f.dependencies).restore(LOGICAL_PRODUCT_ID, "user-1"))
      .resolves.toEqual([]);
  });

  it("fails closed if the CITYWALK account changes during purchase or restore", async () => {
    const purchase = fixture();
    purchase.dependencies.purchase = vi.fn(async () => { purchase.setAccount("user-2"); });
    await expect(new RevenueCatCityPassBilling(purchase.dependencies).purchase(LOGICAL_PRODUCT_ID, "user-1"))
      .rejects.toThrow("ACCOUNT_CONFLICT");

    const restore = fixture();
    restore.dependencies.restore = vi.fn(async () => {
      restore.setAccount("user-2");
      return { allPurchasedProductIdentifiers: [CITY_PASS_PRODUCT_ID] } as never;
    });
    await expect(new RevenueCatCityPassBilling(restore.dependencies).restore(LOGICAL_PRODUCT_ID, "user-1"))
      .rejects.toThrow("ACCOUNT_CONFLICT");
  });

  it("rejects unknown proof markers", async () => {
    const f = fixture();
    f.setAccess(true);
    await expect(f.billing.verify("client-says-owned", "user-1")).rejects.toThrow("UNAVAILABLE");
    expect(f.dependencies.access).not.toHaveBeenCalled();
  });
});

vi.mock("./launchPolicy", () => ({ requirePublicPurchases: vi.fn().mockResolvedValue(undefined) }));
