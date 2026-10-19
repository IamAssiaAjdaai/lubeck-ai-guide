import { describe, expect, it } from "vitest";
import { configuredAccountErasureProviders, isAccountErasureScheduleConfigured } from "./accountErasureScheduleConfig";

const apple = {
  BETTER_AUTH_SECRET: "synthetic-auth-secret",
  CITYWALK_APPLE_OAUTH_CLIENT_ID: "synthetic.service",
  CITYWALK_APPLE_TEAM_ID: "synthetic-team",
  CITYWALK_APPLE_KEY_ID: "synthetic-key",
  CITYWALK_APPLE_PRIVATE_KEY: "synthetic-private-key",
  CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: "synthetic.app",
};
const revenuecat = { COMMERCE_REVENUECAT_SECRET_API_KEY: "synthetic-rc-secret" };

describe("account erasure schedule configuration", () => {
  it("accepts either provider independently and both together", () => {
    expect(configuredAccountErasureProviders(apple)).toEqual(["apple"]);
    expect(configuredAccountErasureProviders(revenuecat)).toEqual(["revenuecat"]);
    expect(configuredAccountErasureProviders({ ...apple, ...revenuecat })).toEqual(["apple", "revenuecat"]);
    expect(isAccountErasureScheduleConfigured(apple)).toBe(true);
    expect(isAccountErasureScheduleConfigured(revenuecat)).toBe(true);
  });
  it.each(Object.keys(apple))("missing %s disables only Apple", key => {
    const partial = { ...apple, [key]: "" };
    expect(configuredAccountErasureProviders(partial)).toEqual([]);
    expect(configuredAccountErasureProviders({ ...partial, ...revenuecat })).toEqual(["revenuecat"]);
  });
  it("ignores whitespace-only credentials without falling back to process.env", () => {
    expect(isAccountErasureScheduleConfigured({})).toBe(false);
    expect(isAccountErasureScheduleConfigured({ ...revenuecat, COMMERCE_REVENUECAT_SECRET_API_KEY: "   " })).toBe(false);
    expect(configuredAccountErasureProviders({ ...apple, CITYWALK_APPLE_PRIVATE_KEY: " \n ", ...revenuecat })).toEqual(["revenuecat"]);
    expect(configuredAccountErasureProviders({ ...apple, COMMERCE_REVENUECAT_SECRET_API_KEY: " " })).toEqual(["apple"]);
  });
});
