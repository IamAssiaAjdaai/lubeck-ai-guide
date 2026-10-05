import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  configureRevenueCat,
  getRevenueCatPublicKey,
  loadRevenueCatPlans,
  resetRevenueCatFoundationForTests,
  revenueCatPlanKind,
  syncRevenueCatIdentity,
  type RevenueCatDependencies,
} from "./revenueCat";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("react-native-purchases", () => ({
  default: {
    configure: vi.fn(),
    getAppUserID: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    getOfferings: vi.fn(),
  },
}));

function dependencies(overrides: Partial<RevenueCatDependencies> = {}): RevenueCatDependencies {
  return {
    configure: vi.fn(),
    getAppUserID: vi.fn().mockResolvedValue("$RCAnonymousID:test"),
    logIn: vi.fn().mockResolvedValue(undefined),
    logOut: vi.fn().mockResolvedValue(undefined),
    getCurrentOffering: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("RevenueCat mobile foundation", () => {
  beforeEach(() => {
    resetRevenueCatFoundationForTests();
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", "appl_public_test");
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY", "goog_public_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    resetRevenueCatFoundationForTests();
  });

  it("selects only the public key for the current platform", () => {
    const environment = {
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: " ios-key ",
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: " android-key ",
    };
    expect(getRevenueCatPublicKey("ios", environment)).toBe("ios-key");
    expect(getRevenueCatPublicKey("android", environment)).toBe("android-key");
    expect(getRevenueCatPublicKey("web", environment)).toBeUndefined();
  });

  it("rejects a RevenueCat secret key from the mobile bundle", () => {
    expect(getRevenueCatPublicKey("ios", {
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "sk_must-stay-server-side",
    })).toBeUndefined();
  });

  it("fails benignly when the platform public key is missing", () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", "");
    const deps = dependencies();
    expect(configureRevenueCat(deps)).toEqual({
      configured: false,
      reason: "missing_public_key",
    });
    expect(deps.configure).not.toHaveBeenCalled();
  });

  it("returns no plans without touching Offerings when RevenueCat is unconfigured", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", "");
    const deps = dependencies();
    await expect(loadRevenueCatPlans(deps)).resolves.toEqual([]);
    expect(deps.getCurrentOffering).not.toHaveBeenCalled();
  });

  it("configures at most once for the active platform", () => {
    const deps = dependencies();
    expect(configureRevenueCat(deps)).toEqual({ configured: true, platform: "ios" });
    expect(configureRevenueCat(deps)).toEqual({ configured: true, platform: "ios" });
    expect(deps.configure).toHaveBeenCalledTimes(1);
    expect(deps.configure).toHaveBeenCalledWith({ apiKey: "appl_public_test" });
  });

  it("logs an authenticated Better Auth user into RevenueCat by user id", async () => {
    const deps = dependencies({
      getAppUserID: vi.fn().mockResolvedValue("$RCAnonymousID:before-login"),
    });
    await expect(syncRevenueCatIdentity("user_123", deps)).resolves.toMatchObject({ configured: true });
    expect(deps.logIn).toHaveBeenCalledWith("user_123");
    expect(deps.logOut).not.toHaveBeenCalled();
  });

  it("does not re-login an already synchronized user", async () => {
    const deps = dependencies({
      getAppUserID: vi.fn().mockResolvedValue("user_123"),
    });
    await syncRevenueCatIdentity("user_123", deps);
    expect(deps.logIn).not.toHaveBeenCalled();
  });

  it("returns an identified RevenueCat customer to anonymous state on app sign-out", async () => {
    const deps = dependencies({
      getAppUserID: vi.fn().mockResolvedValue("user_123"),
    });
    await syncRevenueCatIdentity(undefined, deps);
    expect(deps.logOut).toHaveBeenCalledTimes(1);
  });

  it("does not call logout when RevenueCat is already anonymous", async () => {
    const deps = dependencies({
      getAppUserID: vi.fn().mockResolvedValue("$RCAnonymousID:already-anonymous"),
    });
    await syncRevenueCatIdentity(undefined, deps);
    expect(deps.logOut).not.toHaveBeenCalled();
  });

  it("normalizes only the approved Offering package identifiers and keeps localized prices", async () => {
    const deps = dependencies({
      getCurrentOffering: vi.fn().mockResolvedValue({
        availablePackages: [
          { identifier: "$rc_monthly", product: { identifier: "com.citywalk.premium.monthly", priceString: "7,99 €", currencyCode: "EUR", price: 7.99 } },
          { identifier: "$rc_annual", product: { identifier: "com.citywalk.premium.yearly", priceString: "39,99 €", currencyCode: "EUR", price: 39.99 } },
          { identifier: "city_pass_72h", product: { identifier: "com.citywalk.lubeck.pass72h", priceString: "4,99 €", currencyCode: "EUR", price: 4.99 } },
          { identifier: "experiment", product: { identifier: "ignore-me", priceString: "1,00 €" } },
        ],
      }),
    });

    await expect(loadRevenueCatPlans(deps)).resolves.toEqual([
      { kind: "monthly", packageIdentifier: "$rc_monthly", productIdentifier: "com.citywalk.premium.monthly", localizedPrice: "7,99 €", currencyCode: "EUR", price: 7.99 },
      { kind: "annual", packageIdentifier: "$rc_annual", productIdentifier: "com.citywalk.premium.yearly", localizedPrice: "39,99 €", currencyCode: "EUR", price: 39.99 },
      { kind: "city_pass_72h", packageIdentifier: "city_pass_72h", productIdentifier: "com.citywalk.lubeck.pass72h", localizedPrice: "4,99 €", currencyCode: "EUR", price: 4.99 },
    ]);
  });

  it("keeps package mapping explicit", () => {
    expect(revenueCatPlanKind("$rc_monthly")).toBe("monthly");
    expect(revenueCatPlanKind("$rc_annual")).toBe("annual");
    expect(revenueCatPlanKind("city_pass_72h")).toBe("city_pass_72h");
    expect(revenueCatPlanKind("other")).toBeUndefined();
  });
});
