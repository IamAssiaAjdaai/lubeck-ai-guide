import { describe, expect, it } from "vitest";

import {
  defineCityPassConfiguration,
  getCityPassConfiguration,
  getCityPassPaywallContext,
  LUBECK_CITY_PASS,
  listCityPassConfigurations,
} from "@/lib/commerce/cityPassConfig";

describe("city pass configuration", () => {
  it("keeps Lübeck as one city-scoped product configuration", () => {
    expect(LUBECK_CITY_PASS).toMatchObject({
      citySlug: "lubeck",
      productSlug: "lubeck-digital-guide-pass-72h",
      entitlement: { scopeType: "city", scopeKey: "lubeck" },
      durationDays: 3,
      recommendedLaunchPrice: { currency: "eur", unitAmount: 699 },
    });
    expect(listCityPassConfigurations()).toEqual([LUBECK_CITY_PASS]);
    expect(getCityPassConfiguration("test-city")).toBeUndefined();
  });

  it("builds reusable paywall data without embedding a city in the component", () => {
    const testCity = defineCityPassConfiguration({
      ...LUBECK_CITY_PASS,
      citySlug: "test-city",
      productSlug: "test-city-pass",
      entitlement: { scopeType: "city", scopeKey: "test-city" },
      primaryPremiumFeature: {
        id: "test_city_audio",
        kind: "narrated_audio",
        placement: "place_detail",
      },
    });

    expect(getCityPassPaywallContext(testCity)).toEqual({
      citySlug: "test-city",
      productSlug: "test-city-pass",
      featureId: "test_city_audio",
      placement: "place_detail",
      durationHours: 72,
    });
  });

  it("rejects a configuration whose entitlement scope does not match its city", () => {
    expect(() =>
      defineCityPassConfiguration({
        ...LUBECK_CITY_PASS,
        citySlug: "test-city",
      }),
    ).toThrow("INVALID_CITY_PASS_CONFIGURATION");
  });
});
