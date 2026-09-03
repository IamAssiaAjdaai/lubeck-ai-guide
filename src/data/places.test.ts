import { describe, expect, it } from "vitest";

import { landmarks as legacyLandmarks } from "@/data/landmarks";
import {
  PLACE_SOURCE_TYPES,
  getPlaceSources,
  lubeckPlaceSources,
} from "@/data/placeSources";
import {
  HIDDEN_GEM_TAG,
  LUBECK_PLACE_SLUGS,
  PLACE_CATEGORIES,
  PLACE_ENVIRONMENTS,
  PLACE_PRICING,
  PLACE_STATUSES,
  getPlace,
  getPlaceDurationLabel,
  getPlacesByCategory,
  lubeckLandmarks,
  lubeckPlaces,
  places,
  resolvePlaceContent,
  type Place,
  type PlaceContent,
} from "@/data/places";
import { locales } from "@/lib/i18n";

const legacySlugs: readonly string[] = legacyLandmarks.map(
  (landmark) => landmark.slug,
);

describe("Place model", () => {
  it("uses See, Eat and Fun as categories while hidden gem remains a tag", () => {
    expect(PLACE_CATEGORIES).toEqual(["see", "eat", "fun"]);
    expect(PLACE_CATEGORIES).not.toContain(HIDDEN_GEM_TAG);
    expect(getPlace("lubeck", "zaubertheater-luebeck")?.tags).toContain(
      HIDDEN_GEM_TAG,
    );
  });

  it("supports lightweight future places without fake images or narratives", () => {
    const minimalPlace = {
      slug: "future-cafe",
      city: "future-city",
      category: "eat",
      coordinates: { lat: 1, lng: 2 },
      durationMinutes: 45,
      environment: "mixed",
      pricing: "unknown",
      status: "seasonal",
      statusVerifiedAt: "2026-09-03",
      tags: ["food"],
      content: {
        en: {
          name: "Future Cafe",
          shortDescription: "A future place awaiting full editorial coverage.",
        },
      },
    } as const satisfies Place;

    expect(minimalPlace).not.toHaveProperty("image");
    expect(minimalPlace.content.en).not.toHaveProperty("description");
    expect(minimalPlace.content.en).not.toHaveProperty("story");
    expect(minimalPlace.content.en).not.toHaveProperty("facts");
    expect(PLACE_ENVIRONMENTS).toEqual(["indoor", "outdoor", "mixed"]);
    expect(PLACE_PRICING).toEqual(["free", "paid", "mixed", "unknown"]);
    expect(PLACE_STATUSES).toEqual([
      "open",
      "closed",
      "renovation",
      "seasonal",
      "unknown",
    ]);
  });
});

describe("Lubeck places dataset", () => {
  it("contains the exact 20 ticket places in the required order", () => {
    expect(lubeckPlaces).toHaveLength(20);
    expect(lubeckPlaces.map((place) => place.slug)).toEqual(
      LUBECK_PLACE_SLUGS,
    );
    expect(places).toEqual(lubeckPlaces);
  });

  it("provides valid required fields and coordinates for every place", () => {
    for (const place of lubeckPlaces) {
      const localizedContent = Object.values(place.content).filter(
        (content): content is PlaceContent => content !== undefined,
      );

      expect(place.city).toBe("lubeck");
      expect(PLACE_CATEGORIES).toContain(place.category);
      expect(PLACE_ENVIRONMENTS).toContain(place.environment);
      expect(PLACE_PRICING).toContain(place.pricing);
      if (place.status) expect(PLACE_STATUSES).toContain(place.status);
      expect(place.durationMinutes).toBeGreaterThan(0);
      expect(place.coordinates.lat).toBeGreaterThanOrEqual(-90);
      expect(place.coordinates.lat).toBeLessThanOrEqual(90);
      expect(place.coordinates.lng).toBeGreaterThanOrEqual(-180);
      expect(place.coordinates.lng).toBeLessThanOrEqual(180);
      expect(place.tags.length).toBeGreaterThan(0);
      expect(localizedContent.length).toBeGreaterThan(0);

      for (const content of localizedContent) {
        expect(content.name.trim()).not.toBe("");
        expect(content.shortDescription.trim()).not.toBe("");
      }

      for (const source of Object.values(place.audio ?? {})) {
        expect(source).toMatch(/^\/audio\/.+\.mp3$/);
      }
    }
  });

  it("uses unique slugs and coordinate pairs", () => {
    const slugs = lubeckPlaces.map((place) => place.slug);
    const coordinates = lubeckPlaces.map(
      (place) => `${place.coordinates.lat},${place.coordinates.lng}`,
    );

    expect(new Set(slugs).size).toBe(lubeckPlaces.length);
    expect(new Set(coordinates).size).toBe(lubeckPlaces.length);
  });

  it("has the required category breakdown", () => {
    expect(getPlacesByCategory("see", "lubeck")).toHaveLength(12);
    expect(getPlacesByCategory("eat", "lubeck")).toHaveLength(5);
    expect(getPlacesByCategory("fun", "lubeck")).toHaveLength(3);
  });

  it("only references approved imagery for the original five landmarks", () => {
    const imageSlugs = lubeckPlaces
      .filter((place) => place.image)
      .map((place) => place.slug)
      .sort();

    expect(imageSlugs).toEqual([...legacySlugs].sort());
  });

  it("provides German and English card content for every new place", () => {
    const newPlaces = lubeckPlaces.filter(
      (place) => !legacySlugs.includes(place.slug),
    );

    expect(newPlaces).toHaveLength(15);
    for (const place of newPlaces) {
      expect(Object.keys(place.content).sort()).toEqual(["de", "en"]);
      expect(place.content.de?.name).toBeTruthy();
      expect(place.content.de?.shortDescription).toBeTruthy();
      expect(place.content.en?.name).toBeTruthy();
      expect(place.content.en?.shortDescription).toBeTruthy();
    }
  });

  it("reports the requested locale, actual locale, and fallback decision", () => {
    const newPlace = getPlace("lubeck", "cafe-niederegger");
    const legacyPlace = getPlace("lubeck", "holstentor");

    expect(newPlace).toBeDefined();
    expect(legacyPlace).toBeDefined();

    if (!newPlace || !legacyPlace) return;

    expect(resolvePlaceContent(newPlace, "de")).toMatchObject({
      requestedLocale: "de",
      actualLocale: "de",
      didFallback: false,
    });
    expect(resolvePlaceContent(newPlace, "ar")).toMatchObject({
      requestedLocale: "ar",
      actualLocale: "en",
      didFallback: true,
      content: newPlace.content.en,
    });
    expect(resolvePlaceContent(legacyPlace, "ar")).toMatchObject({
      requestedLocale: "ar",
      actualLocale: "ar",
      didFallback: false,
    });
  });

  it("preserves all original landmark content, audio and duration labels", () => {
    expect(lubeckLandmarks).toHaveLength(5);
    expect(lubeckLandmarks.map((place) => place.slug)).toEqual(legacySlugs);

    for (const legacyLandmark of legacyLandmarks) {
      const place = lubeckLandmarks.find(
        (candidate) => candidate.slug === legacyLandmark.slug,
      );

      expect(place).toBeDefined();
      expect(place?.image).toBe(legacyLandmark.image);

      for (const locale of locales) {
        const legacyContent = legacyLandmark.content[locale];
        const content = place?.content[locale];

        expect(content?.name).toBe(legacyContent.name);
        expect(content?.shortDescription).toBe(legacyContent.description);
        expect(content?.description).toBe(legacyContent.description);
        expect(content?.story).toBe(legacyContent.story);
        expect(content?.facts).toBe(legacyContent.facts);
        expect(place?.audio?.[locale] ?? "").toBe(legacyContent.audio);
        if (place) {
          expect(getPlaceDurationLabel(place, locale)).toBe(
            legacyContent.duration,
          );
        }
      }
    }
  });

  it("stores temporary visitor information separately from core descriptions", () => {
    expect(getPlace("lubeck", "buddenbrookhaus")?.status).toBe("renovation");
    expect(
      getPlace("lubeck", "buddenbrookhaus")?.content.en?.visitNote,
    ).toContain("closed for renovation");
    expect(
      getPlace("lubeck", "st-petri-zu-luebeck")?.content.en?.visitNote,
    ).toContain("tower is currently unavailable");
    expect(
      getPlace("lubeck", "willy-brandt-haus")?.content.en?.visitNote,
    ).toContain("18 December 2026");
    expect(
      getPlace("lubeck", "willy-brandt-haus")?.visitNoteValidUntil,
    ).toBe("2026-12-18");
  });

  it("dates every mutable status and visit note", () => {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;

    for (const place of lubeckPlaces) {
      if (place.status) {
        expect(place.statusVerifiedAt).toMatch(isoDate);
      } else {
        expect(place.statusVerifiedAt).toBeUndefined();
      }

      const hasVisitNote = Object.values(place.content).some(
        (content) => Boolean(content?.visitNote),
      );

      if (hasVisitNote) {
        expect(place.visitNoteVerifiedAt).toMatch(isoDate);
      } else {
        expect(place.visitNoteVerifiedAt).toBeUndefined();
        expect(place.visitNoteValidUntil).toBeUndefined();
      }

      if (place.visitNoteValidUntil) {
        expect(place.visitNoteValidUntil).toMatch(isoDate);
        expect(place.visitNoteVerifiedAt).toBeDefined();
        expect(place.visitNoteValidUntil >= place.visitNoteVerifiedAt!).toBe(
          true,
        );
      }
    }
  });

  it("looks places up by city and slug", () => {
    expect(getPlace("lubeck", "holstentor")?.slug).toBe("holstentor");
    expect(getPlace("lubeck", "missing-place")).toBeUndefined();
  });
});

describe("Lubeck place provenance", () => {
  it("provides source metadata for all 20 places", () => {
    expect(Object.keys(lubeckPlaceSources).sort()).toEqual(
      [...LUBECK_PLACE_SLUGS].sort(),
    );

    for (const slug of LUBECK_PLACE_SLUGS) {
      expect(getPlaceSources(slug).length).toBeGreaterThan(0);
    }
  });

  it("uses valid source fields, URLs and verification dates", () => {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;

    for (const sources of Object.values(lubeckPlaceSources)) {
      for (const source of sources) {
        expect(source.label.trim()).not.toBe("");
        expect(source.url.trim()).not.toBe("");
        expect(() => new URL(source.url)).not.toThrow();
        expect(PLACE_SOURCE_TYPES).toContain(source.type);
        expect(source.verifiedAt).toMatch(isoDate);
      }
    }
  });
});
