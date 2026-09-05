import { describe, expect, it } from "vitest";

import {
  lubeckCitySeed,
  lubeckPlaceSeeds,
} from "@/db/seedData";
import {
  DatabaseVerificationError,
  verifyLubeckDatabaseSnapshot,
  type DatabaseCitySnapshot,
  type DatabasePlaceSnapshot,
} from "@/db/verification";

function createSnapshot() {
  const city = {
    id: 1,
    slug: lubeckCitySeed.slug,
    name: lubeckCitySeed.name,
  } satisfies DatabaseCitySnapshot;
  const places = lubeckPlaceSeeds.map(
    (place): DatabasePlaceSnapshot => ({
      cityId: city.id,
      slug: place.slug,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      durationMinutes: place.durationMinutes,
      environment: place.environment,
      pricing: place.pricing,
      status: place.status ?? null,
      statusVerifiedAt: place.statusVerifiedAt ?? null,
      image: place.image ?? null,
      tags: [...place.tags],
    }),
  );

  return { city, places };
}

describe("database runtime verification", () => {
  it("accepts one city and all 25 canonical places exactly once", () => {
    const { city, places } = createSnapshot();

    expect(verifyLubeckDatabaseSnapshot([city], places)).toEqual({
      cityCount: 1,
      placeCount: 25,
      curatedHiddenGemCount: 5,
      categoryCounts: { see: 17, eat: 5, fun: 3 },
    });
  });

  it("rejects missing, duplicate, and unexpected place slugs", () => {
    const { city, places } = createSnapshot();
    const invalidPlaces = [
      ...places.slice(1),
      places[1],
      { ...places[2], slug: "unexpected" },
    ];

    expect(() =>
      verifyLubeckDatabaseSnapshot([city], invalidPlaces),
    ).toThrow(DatabaseVerificationError);
  });

  it("rejects category, coordinate, and tag drift", () => {
    const { city, places } = createSnapshot();
    const invalidPlaces = places.map((place, index) =>
      index === 0
        ? {
            ...place,
            category: "fun" as const,
            latitude: place.latitude + 0.1,
            tags: ["changed"],
          }
        : place,
    );

    expect(() =>
      verifyLubeckDatabaseSnapshot([city], invalidPlaces),
    ).toThrow(/mismatched category.*mismatched latitude.*mismatched tags/);
  });

  it("rejects missing or duplicate Lübeck city rows", () => {
    const { city, places } = createSnapshot();

    expect(() => verifyLubeckDatabaseSnapshot([], [])).toThrow(
      /expected 1 Lübeck city, found 0/,
    );
    expect(() =>
      verifyLubeckDatabaseSnapshot([city, { ...city, id: 2 }], places),
    ).toThrow(/expected 1 Lübeck city, found 2/);
  });
});
