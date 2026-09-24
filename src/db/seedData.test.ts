import { describe, expect, it } from "vitest";

import { lubeckPlaces } from "@/data/places";
import {
  lubeckCitySeed,
  lubeckPlaceSeeds,
  mapPlaceToSeedRow,
} from "@/db/seedData";

describe("database seed data", () => {
  it("creates the Lübeck city seed", () => {
    expect(lubeckCitySeed).toEqual({
      slug: "lubeck",
      name: "Lübeck",
    });
  });

  it("maps exactly 25 Lübeck places", () => {
    expect(lubeckPlaceSeeds).toHaveLength(lubeckPlaces.length);
    expect(lubeckPlaceSeeds).toHaveLength(25);
  });

  it("preserves every canonical slug exactly once", () => {
    const canonicalSlugs = lubeckPlaces.map((place) => place.slug);
    const seedSlugs = lubeckPlaceSeeds.map((place) => place.slug);

    expect(seedSlugs).toEqual(canonicalSlugs);
    expect(new Set(seedSlugs).size).toBe(seedSlugs.length);
  });

  it("includes all five curated See-category Hidden Gems", () => {
    const hiddenGemSlugs = lubeckPlaceSeeds
      .filter(
        (place) =>
          place.category === "see" && place.tags.includes("hidden-gem"),
      )
      .map((place) => place.slug);

    expect(hiddenGemSlugs).toEqual([
      "fuechtingshof",
      "dunkelgruener-gang",
      "kalandsgang",
      "malerwinkel",
      "buergergaerten",
    ]);
  });

  it("preserves category and coordinates for every canonical place", () => {
    for (const [index, place] of lubeckPlaces.entries()) {
      expect(lubeckPlaceSeeds[index]).toMatchObject({
        slug: place.slug,
        category: place.category,
        latitude: place.coordinates.lat,
        longitude: place.coordinates.lng,
      });
    }
  });

  it("preserves the expected place categories", () => {
    const categoryCounts = lubeckPlaceSeeds.reduce(
      (counts, place) => {
        counts[place.category] += 1;
        return counts;
      },
      {
        see: 0,
        eat: 0,
        fun: 0,
      },
    );

    expect(categoryCounts).toEqual({
      see: 17,
      eat: 5,
      fun: 3,
    });
  });

  it("maps coordinates and metadata to database columns", () => {
    const holstentor = lubeckPlaces.find(
      (place) => place.slug === "holstentor",
    );

    expect(holstentor).toBeDefined();

    const row = mapPlaceToSeedRow(holstentor!);

    expect(row).toMatchObject({
      slug: "holstentor",
      category: "see",
      latitude: holstentor!.coordinates.lat,
      longitude: holstentor!.coordinates.lng,
      durationMinutes: holstentor!.durationMinutes,
      environment: holstentor!.environment,
      pricing: holstentor!.pricing,
    });
  });

  it("does not share the tags array with the domain object", () => {
    const source = lubeckPlaces[0];
    const row = mapPlaceToSeedRow(source);

    expect(row.tags).toEqual(source.tags);
    expect(row.tags).not.toBe(source.tags);
  });
});
