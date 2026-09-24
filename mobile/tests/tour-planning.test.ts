import { describe, expect, it } from "vitest";

import type { PublicPlace } from "../src/lib/api/contracts";
import {
  buildNativePersonalizedTour,
  rankNativePlaces,
} from "../src/lib/tourPlanning";

const places: readonly PublicPlace[] = [
  place("history-place", 53.55, 10, ["history"], 20),
  place("architecture-place", 53.551, 10.001, ["architecture"], 20),
  place("family-place", 53.7, 10.2, ["family"], 20),
];

describe("native personalized tour planning", () => {
  it("uses the same interest model for recommended places", () => {
    expect(rankNativePlaces(places, {
      interests: ["architecture"],
      walkingPreference: "standard",
    }, places[0]!.coordinates)[0]?.slug).toBe("architecture-place");
  });

  it("builds a deterministic route within the selected budget", () => {
    const result = buildNativePersonalizedTour({
      places,
      preferences: { interests: ["history"], walkingPreference: "standard" },
      timeBudgetMinutes: 60,
      origin: places[0]!.coordinates,
    });

    expect(result.stops[0]?.place.slug).toBe("history-place");
    expect(result.totalMinutes).toBeLessThanOrEqual(60);
    expect(result.totalWalkingMinutes).toBeGreaterThan(0);
    expect(result.totalDistanceMeters).toBeGreaterThanOrEqual(0);
  });

  it("makes less-walking prefer a compact next stop", () => {
    const ranked = rankNativePlaces(places, {
      interests: [],
      walkingPreference: "less-walking",
    }, places[1]!.coordinates);

    expect(ranked[0]?.slug).toBe("architecture-place");
  });
});

function place(
  slug: string,
  lat: number,
  lng: number,
  tags: readonly string[],
  durationMinutes: number,
): PublicPlace {
  return {
    slug,
    category: "see",
    coordinates: { lat, lng },
    durationMinutes,
    tags,
    requestedLocale: "en",
    resolvedLocale: "en",
    didFallback: false,
    content: { name: slug, shortDescription: slug },
    media: [],
  };
}
