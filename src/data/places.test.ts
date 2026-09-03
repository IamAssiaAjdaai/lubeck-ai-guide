import { describe, expect, it } from "vitest";

import { landmarks as legacyLandmarks } from "@/data/landmarks";
import {
  HIDDEN_GEM_TAG,
  PLACE_CATEGORIES,
  PLACE_ENVIRONMENTS,
  PLACE_PRICING,
  PLACE_STATUSES,
  getPlace,
  getPlaceDurationLabel,
  getPlacesByCategory,
  lubeckLandmarks,
  places,
  type Place,
  type PlaceContent,
} from "@/data/places";
import { locales } from "@/lib/i18n";

describe("Place model", () => {
  it("supports the planned categories and independent hidden-gem tag", () => {
    expect(PLACE_CATEGORIES).toEqual(["see", "eat", "fun"]);
    expect(PLACE_CATEGORIES).not.toContain(HIDDEN_GEM_TAG);

    const hiddenGem = {
      ...lubeckLandmarks[0],
      tags: [...lubeckLandmarks[0].tags, HIDDEN_GEM_TAG],
    } satisfies Place;

    expect(hiddenGem.category).toBe("see");
    expect(hiddenGem.tags).toContain("hidden-gem");
  });

  it("supports environment, pricing, status, and minimal localized content", () => {
    expect(PLACE_ENVIRONMENTS).toEqual(["indoor", "outdoor", "mixed"]);
    expect(PLACE_PRICING).toEqual(["free", "paid", "mixed", "unknown"]);
    expect(PLACE_STATUSES).toEqual([
      "open",
      "closed",
      "renovation",
      "seasonal",
      "unknown",
    ]);

    const content = Object.fromEntries(
      locales.map((locale) => [
        locale,
        {
          name: "Example place",
          shortDescription: "Example description",
          ...(locale === "en" ? { visitNote: "Check current hours." } : {}),
        },
      ]),
    ) as Record<(typeof locales)[number], PlaceContent>;

    const minimalPlace = {
      slug: "example-place",
      city: "future-city",
      category: "eat",
      coordinates: { lat: 0, lng: 0 },
      durationMinutes: 30,
      environment: "mixed",
      pricing: "mixed",
      status: "seasonal",
      tags: [HIDDEN_GEM_TAG],
      content,
    } satisfies Place;

    expect(minimalPlace).not.toHaveProperty("image");
    expect(minimalPlace.content.en).not.toHaveProperty("story");
    expect(minimalPlace.content.en).not.toHaveProperty("facts");
    expect(minimalPlace.content.en.visitNote).toBe("Check current hours.");
  });

  it("provides valid reusable metadata for every current place", () => {
    expect(places).toHaveLength(5);

    for (const place of places) {
      expect(place.city).toBe("lubeck");
      expect(PLACE_CATEGORIES).toContain(place.category);
      expect(PLACE_ENVIRONMENTS).toContain(place.environment);
      expect(PLACE_PRICING).toContain(place.pricing);
      expect(place.image === undefined || place.image.startsWith("/")).toBe(
        true,
      );
      expect(place.durationMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(place.durationMinutes)).toBe(true);
      expect(place.coordinates.lat).toBeGreaterThanOrEqual(-90);
      expect(place.coordinates.lat).toBeLessThanOrEqual(90);
      expect(place.coordinates.lng).toBeGreaterThanOrEqual(-180);
      expect(place.coordinates.lng).toBeLessThanOrEqual(180);
      expect(place.tags.length).toBeGreaterThan(0);

      for (const source of Object.values(place.audio ?? {})) {
        expect(source).toMatch(/^\/audio\//);
      }
    }
  });

  it("preserves every legacy landmark field in all 27 locales", () => {
    expect(locales).toHaveLength(27);
    expect(lubeckLandmarks).toHaveLength(legacyLandmarks.length);
    expect(lubeckLandmarks.map((place) => place.slug)).toEqual(
      legacyLandmarks.map((landmark) => landmark.slug),
    );

    for (const [index, place] of lubeckLandmarks.entries()) {
      const legacyLandmark = legacyLandmarks[index];

      expect(place.image).toBe(legacyLandmark.image);

      for (const locale of locales) {
        const content = place.content[locale];
        const legacyContent = legacyLandmark.content[locale];

        expect(content.name).toBe(legacyContent.name);
        expect(content.shortDescription).toBe(legacyContent.description);
        expect(content.description).toBe(legacyContent.description);
        expect(content.story).toBe(legacyContent.story);
        expect(content.facts).toEqual(legacyContent.facts);
        expect(getPlaceDurationLabel(place, locale)).toBe(
          legacyContent.duration,
        );
        expect(place.audio?.[locale] ?? "").toBe(legacyContent.audio);
      }
    }
  });

  it("supports city lookup and category filtering", () => {
    expect(getPlace("lubeck", "holstentor")?.slug).toBe("holstentor");
    expect(getPlace("unknown", "holstentor")).toBeUndefined();
    expect(getPlacesByCategory("see", "lubeck")).toEqual(lubeckLandmarks);
    expect(getPlacesByCategory("eat", "lubeck")).toEqual([]);
  });
});
