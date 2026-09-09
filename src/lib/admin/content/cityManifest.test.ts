import { describe, expect, it } from "vitest";

import { hamburgCityManifest, HAMBURG_PLACE_COUNT } from "@/data/cities/hamburg";
import {
  CityManifestValidationError,
  validateCityManifest,
  type CityManifest,
} from "@/lib/admin/content/cityManifest";

describe("city onboarding manifest", () => {
  it("validates Hamburg as a generic, source-backed bilingual city manifest", () => {
    const result = validateCityManifest(hamburgCityManifest);

    expect(result.city).toMatchObject({
      slug: "hamburg",
      countryCode: "DE",
      timezone: "Europe/Berlin",
    });
    expect(HAMBURG_PLACE_COUNT).toBeGreaterThanOrEqual(15);
    expect(HAMBURG_PLACE_COUNT).toBeLessThanOrEqual(20);
    expect(result.places.every((place) => place.content.de && place.content.en)).toBe(true);
    expect(result.places.every((place) => place.sources.length > 0)).toBe(true);
    expect(result.city.sources).toHaveLength(1);
    expect(result.city.content.de?.description).toBeTruthy();
    expect(result.city.content.en?.description).toBeTruthy();
    expect(result.places.filter(({ tags }) => tags.includes("hidden-gem"))).toHaveLength(4);
    expect(result.tours[0]?.stops.map(({ placeSlug }) => placeSlug)).toEqual([
      "hamburg-rathaus",
      "chilehaus-kontorhausviertel",
      "speicherstadt",
      "internationales-maritimes-museum",
      "hafencity",
      "elbphilharmonie-plaza",
      "landungsbruecken",
    ]);
  });

  it("rejects missing city-level traveler content and provenance", () => {
    const invalid = {
      ...hamburgCityManifest,
      city: {
        ...hamburgCityManifest.city,
        content: {
          de: hamburgCityManifest.city.content.de,
          en: { name: "Hamburg", shortDescription: "Harbour city" },
        },
        sources: [],
      },
    } as CityManifest;

    expect(() => validateCityManifest(invalid)).toThrow(
      /city is missing complete en traveler content/,
    );
    try {
      validateCityManifest(invalid);
    } catch (error) {
      expect((error as CityManifestValidationError).issues).toContain(
        "city has no canonical source",
      );
    }
  });

  it("detects invalid, duplicate and out-of-city coordinates", () => {
    const first = hamburgCityManifest.places[0]!;
    const second = hamburgCityManifest.places[1]!;
    const invalid = {
      ...hamburgCityManifest,
      places: [
        { ...first, coordinates: { lat: 100, lng: first.coordinates.lng } },
        { ...second, coordinates: { lat: 100, lng: first.coordinates.lng } },
      ],
    } as CityManifest;

    expect(() => validateCityManifest(invalid)).toThrow(CityManifestValidationError);
    try {
      validateCityManifest(invalid);
    } catch (error) {
      expect((error as CityManifestValidationError).issues.join(" ")).toMatch(
        /invalid latitude|outside the city coordinate QA envelope/,
      );
      expect((error as CityManifestValidationError).issues.join(" ")).toMatch(
        /duplicates coordinates/,
      );
    }
  });

  it("rejects missing required localization, source and unknown tour stops", () => {
    const place = hamburgCityManifest.places[0]!;
    const invalid = {
      ...hamburgCityManifest,
      places: [{ ...place, content: { de: place.content.de }, sources: [] }],
      tours: [{
        ...hamburgCityManifest.tours[0]!,
        stops: [{ placeSlug: "not-a-place" }],
      }],
      knowledge: [],
    } as CityManifest;

    expect(() => validateCityManifest(invalid)).toThrow(/missing en content/);
    try {
      validateCityManifest(invalid);
    } catch (error) {
      const issues = (error as CityManifestValidationError).issues;
      expect(issues).toContain(`${place.slug} has no canonical source`);
      expect(issues).toContain("harbour-heritage-walk references unknown place not-a-place");
    }
  });

  it("requires verified knowledge to reference a source attached to the same place", () => {
    const invalid = {
      ...hamburgCityManifest,
      knowledge: [{
        ...hamburgCityManifest.knowledge[0]!,
        sourceUrl: "https://example.com/not-attached",
      }],
    } as CityManifest;

    expect(() => validateCityManifest(invalid)).toThrow(/not linked to its source/);
  });

  it("flags a likely copy-paste place identity mismatch", () => {
    const first = hamburgCityManifest.places[0]!;
    const second = hamburgCityManifest.places[1]!;
    const invalid = {
      ...hamburgCityManifest,
      places: hamburgCityManifest.places.map((place) =>
        place.slug === second.slug ? { ...place, content: first.content } : place,
      ),
    } as CityManifest;

    expect(() => validateCityManifest(invalid)).toThrow(
      /suspicious localized place identity/,
    );
  });
});
