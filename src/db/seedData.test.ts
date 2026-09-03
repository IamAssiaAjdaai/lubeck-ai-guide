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

  it("maps exactly 20 Lübeck places", () => {
    expect(lubeckPlaceSeeds).toHaveLength(20);
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
      see: 12,
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