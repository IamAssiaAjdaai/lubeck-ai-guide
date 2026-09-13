import { describe, expect, it } from "vitest";

import {
  cityRoute,
  guideRoute,
  parseCityRouteIdentity,
  parsePlaceRouteIdentity,
  parseTourRouteIdentity,
  placeRoute,
  resolvePlaceForRoute,
  resolveTourForRoute,
  tourRoute,
} from "../src/lib/routing";

const response = {
  city: {
    slug: "test-city",
    requestedLocale: "en",
    resolvedLocale: "en",
    didFallback: false,
    content: { name: "Test City" },
    media: [],
  },
  places: [{
    slug: "old-market",
    category: "see" as const,
    coordinates: { lat: 1, lng: 2 },
    durationMinutes: 10,
    requestedLocale: "en",
    resolvedLocale: "en",
    didFallback: false,
    content: { name: "Old Market", shortDescription: "Published place" },
    media: [],
  }],
  tours: [{
    slug: "old-town-walk",
    requestedLocale: "en",
    resolvedLocale: "en",
    didFallback: false,
    content: { title: "Old town walk" },
    stops: [{ placeSlug: "old-market", position: 1 }],
    media: [],
  }],
};

describe("generic native route identity", () => {
  it("supports any safe city and place slug", () => {
    expect(parsePlaceRouteIdentity("test-city", "old-market")).toEqual({ citySlug: "test-city", placeSlug: "old-market" });
    expect(cityRoute("test-city")).toBe("/city/test-city");
    expect(placeRoute("test-city", "old-market")).toBe("/city/test-city/place/old-market");
    expect(tourRoute("test-city", "old-town-walk")).toBe("/city/test-city/tour/old-town-walk");
    expect(guideRoute("test-city", "old-market")).toBe("/city/test-city/guide/old-market");
    expect(parseTourRouteIdentity("test-city", "old-town-walk")).toEqual({
      citySlug: "test-city",
      tourSlug: "old-town-walk",
    });
  });

  it("rejects arrays and unsafe path values", () => {
    expect(parseCityRouteIdentity(["lubeck"])).toBeUndefined();
    expect(parsePlaceRouteIdentity("lubeck", "../admin")).toBeUndefined();
    expect(parseTourRouteIdentity("lubeck", ["historic-walk"])).toBeUndefined();
  });

  it("resolves a place only inside the requested public city response", () => {
    expect(resolvePlaceForRoute(response, {
      citySlug: "test-city",
      placeSlug: "old-market",
    })?.slug).toBe("old-market");
    expect(resolvePlaceForRoute(response, {
      citySlug: "other-city",
      placeSlug: "old-market",
    })).toBeUndefined();
    expect(resolvePlaceForRoute(response, {
      citySlug: "test-city",
      placeSlug: "unknown-place",
    })).toBeUndefined();
  });

  it("resolves tours only inside their requested public city", () => {
    expect(resolveTourForRoute(response, {
      citySlug: "test-city",
      tourSlug: "old-town-walk",
    })?.slug).toBe("old-town-walk");
    expect(resolveTourForRoute(response, {
      citySlug: "other-city",
      tourSlug: "old-town-walk",
    })).toBeUndefined();
  });
});
