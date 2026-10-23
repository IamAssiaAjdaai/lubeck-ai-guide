import { describe, expect, it } from "vitest";

import {
  CITYWALK_ACCESS_LEVELS,
  CITYWALK_GUIDE_DAILY_LIMITS,
  CITYWALK_PREMIUM_ENTITLEMENT,
  CITYWALK_REVENUECAT_PRODUCT_IDS,
  CITYWALK_REVENUECAT_PACKAGE_IDS,
  matchesCitywalkRevenueCatProduct,
} from "./monetization";

describe("CITYWALK monetization domain", () => {
  it("defines one global Premium entitlement independent of billing product", () => {
    expect(CITYWALK_PREMIUM_ENTITLEMENT).toEqual({
      scopeType: "feature",
      scopeKey: "premium",
    });
  });

  it("keeps access tiers and AI limits explicit and bounded", () => {
    expect(CITYWALK_ACCESS_LEVELS).toEqual(["free", "city_pass", "premium"]);
    expect(CITYWALK_GUIDE_DAILY_LIMITS).toEqual({ free: 3, paid: 20 });
  });
});

describe("RevenueCat subscription ID matching", () => {
  it("keeps approved product and offering package IDs", () => {
    expect(CITYWALK_REVENUECAT_PRODUCT_IDS).toEqual({
      monthly: "com.citywalk.premium.monthly",
      annual: "com.citywalk.premium.yearly",
      cityPass72h: "com.citywalk.lubeck.pass72h",
    });
    expect(CITYWALK_REVENUECAT_PACKAGE_IDS).toEqual({
      monthly: "$rc_monthly",
      annual: "$rc_annual",
      cityPass72h: "city_pass_72h",
    });
  });

  it.each([
    ["ios", "com.citywalk.premium.monthly", true],
    ["ios", "com.citywalk.premium.monthly:monthly-autorenew", false],
    ["android", "com.citywalk.premium.monthly", true],
    ["android", "com.citywalk.premium.monthly:monthly-autorenew", true],
    ["android", "com.citywalk.premium.monthly:", false],
    ["android", "com.citywalk.premium.monthly:monthly:extra", false],
    ["android", "com.citywalk.premium.monthly:Bad_Plan", false],
    ["android", "com.citywalk.premium.yearly:yearly-autorenew", false],
    ["android", "com.citywalk.premium.monthly.evil:monthly", false],
  ] as const)("matches the monthly product on %s: %s", (platform, actual, expected) => {
    expect(matchesCitywalkRevenueCatProduct(
      CITYWALK_REVENUECAT_PRODUCT_IDS.monthly, actual, platform,
    )).toBe(expected);
  });
});
