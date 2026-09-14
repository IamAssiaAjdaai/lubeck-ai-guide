import { describe, expect, it } from "vitest";

import {
  TOUR_TIME_BUDGETS,
  buildPersonalizedTour,
  calculateDistanceMeters,
  rankPlacesForTourPreferences,
} from "./index";

const origin = { lat: 53.55, lng: 10 };
const places = [
  {
    slug: "history",
    category: "see" as const,
    coordinates: origin,
    durationMinutes: 20,
    tags: ["history"],
  },
  {
    slug: "architecture",
    category: "see" as const,
    coordinates: { lat: 53.551, lng: 10.001 },
    durationMinutes: 20,
    tags: ["architecture"],
  },
] as const;

describe("shared traveler core", () => {
  it("exposes one deterministic ranking and route implementation", () => {
    expect(rankPlacesForTourPreferences(places, {
      interests: ["architecture"],
      walkingPreference: "standard",
    })[0]?.slug).toBe("architecture");

    const route = buildPersonalizedTour({
      places,
      preferences: { interests: ["history"], walkingPreference: "standard" },
      timeBudgetMinutes: 60,
      origin,
    });
    expect(route.stops[0]?.place.slug).toBe("history");
    expect(route.totalMinutes).toBeLessThanOrEqual(60);
  });

  it("keeps the shared time budgets and geographic calculation stable", () => {
    expect(TOUR_TIME_BUDGETS).toEqual([60, 90, 120, 180]);
    expect(calculateDistanceMeters(origin, origin)).toBe(0);
  });
});
