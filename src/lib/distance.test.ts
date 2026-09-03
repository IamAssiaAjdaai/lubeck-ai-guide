import { describe, expect, it } from "vitest";

import { lubeckLandmarks, lubeckPlaces } from "@/data/places";
import {
  calculateDistanceMeters,
  DEFAULT_WALKING_SPEED_KMH,
  estimateWalkingMinutes,
  formatDistance,
  formatWalkingTime,
  sortPlacesByDistance,
  withPlaceDistance,
  withPlacesDistance,
} from "@/lib/distance";

describe("distance calculation", () => {
  it("returns approximately zero for identical coordinates", () => {
    const point = { lat: 53.8662, lng: 10.6797 };
    expect(calculateDistanceMeters(point, point)).toBeCloseTo(0, 6);
  });

  it("produces a reasonable distance for a known long coordinate pair", () => {
    const newYork = { lat: 40.7128, lng: -74.006 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const distance = calculateDistanceMeters(newYork, london);

    expect(distance).toBeGreaterThan(5_500_000);
    expect(distance).toBeLessThan(5_650_000);
  });

  it("produces a reasonable short distance in Lübeck", () => {
    const holstentor = { lat: 53.8662, lng: 10.6797 };
    const rathaus = { lat: 53.867, lng: 10.6855 };
    const distance = calculateDistanceMeters(holstentor, rathaus);

    expect(distance).toBeGreaterThan(350);
    expect(distance).toBeLessThan(450);
  });

  it("is symmetric and safely rejects invalid coordinates", () => {
    const first = { lat: 53.8662, lng: 10.6797 };
    const second = { lat: 53.8714, lng: 10.6899 };

    expect(calculateDistanceMeters(first, second)).toBeCloseTo(
      calculateDistanceMeters(second, first) ?? -1,
      8,
    );
    expect(
      calculateDistanceMeters(first, { lat: 91, lng: 10.68 }),
    ).toBeUndefined();
  });
});

describe("walking-time estimate", () => {
  it("uses the documented default walking speed", () => {
    expect(DEFAULT_WALKING_SPEED_KMH).toBe(4.8);
    expect(estimateWalkingMinutes(4_800)).toBe(60);
  });

  it("uses at least one minute for very close places", () => {
    expect(estimateWalkingMinutes(0)).toBe(1);
    expect(estimateWalkingMinutes(10)).toBe(1);
  });

  it("supports a configurable walking speed", () => {
    expect(estimateWalkingMinutes(1_000, 6)).toBe(10);
    expect(estimateWalkingMinutes(1_000, 0)).toBeUndefined();
  });
});

describe("distance formatting", () => {
  it("formats meter and kilometer values", () => {
    expect(formatDistance(852, "en")).toBe("850 m");
    expect(formatDistance(1_400, "en")).toBe("1.4 km");
  });

  it("uses locale-aware decimal separators", () => {
    expect(formatDistance(1_400, "de")).toBe("1,4 km");
  });

  it("formats the localized approximate walking label", () => {
    expect(formatWalkingTime(5, "en", "~{minutes} min walk")).toBe(
      "~5 min walk",
    );
    expect(formatWalkingTime(5, "de", "~{minutes} Min. zu Fuß")).toBe(
      "~5 Min. zu Fuß",
    );
  });
});

describe("derived place distance", () => {
  const origin = { lat: 53.865, lng: 10.686 };

  it("adds distance to all 20 Lübeck places without mutating them", () => {
    const derivedPlaces = withPlacesDistance(lubeckPlaces, origin);

    expect(derivedPlaces).toHaveLength(20);
    expect(derivedPlaces.every((place) => place.distance)).toBe(true);
    expect(lubeckPlaces.every((place) => !("distance" in place))).toBe(true);
  });

  it("recomputes when the supplied location changes", () => {
    const place = lubeckPlaces[0];
    const first = withPlaceDistance(place, origin);
    const second = withPlaceDistance(place, { lat: 53.9, lng: 10.72 });

    expect(first.distance?.distanceMeters).not.toBe(
      second.distance?.distanceMeters,
    );
  });

  it("preserves catalog/category and five-stop tour boundaries", () => {
    expect(lubeckPlaces).toHaveLength(20);
    expect(lubeckPlaces.filter((place) => place.category === "see")).toHaveLength(12);
    expect(lubeckPlaces.filter((place) => place.category === "eat")).toHaveLength(5);
    expect(lubeckPlaces.filter((place) => place.category === "fun")).toHaveLength(3);
    expect(lubeckLandmarks).toHaveLength(5);
  });
});

describe("distance sorting", () => {
  it("sorts places from nearest to farthest", () => {
    const places = [
      {
        slug: "far",
        distance: { distanceMeters: 800, walkingMinutes: 10 },
      },
      {
        slug: "near",
        distance: { distanceMeters: 120, walkingMinutes: 2 },
      },
      {
        slug: "middle",
        distance: { distanceMeters: 450, walkingMinutes: 6 },
      },
    ];

    const sorted = sortPlacesByDistance(places);

    expect(sorted.map((place) => place.slug)).toEqual([
      "near",
      "middle",
      "far",
    ]);
  });

  it("keeps places without distance at the end", () => {
    const places = [
      { slug: "unknown" },
      {
        slug: "known",
        distance: { distanceMeters: 200, walkingMinutes: 3 },
      },
    ];

    const sorted = sortPlacesByDistance(places);

    expect(sorted.map((place) => place.slug)).toEqual([
      "known",
      "unknown",
    ]);
  });

  it("does not mutate the original array", () => {
    const places = [
      {
        slug: "far",
        distance: { distanceMeters: 800, walkingMinutes: 10 },
      },
      {
        slug: "near",
        distance: { distanceMeters: 120, walkingMinutes: 2 },
      },
    ];

    const originalOrder = places.map((place) => place.slug);

    sortPlacesByDistance(places);

    expect(places.map((place) => place.slug)).toEqual(originalOrder);
  });
});