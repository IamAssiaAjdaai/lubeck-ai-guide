import { describe, expect, it } from "vitest";

import {
  getPlaceSources,
} from "@/data/placeSources";
import {
  HIDDEN_GEM_TAG,
  PLACE_CATEGORIES,
  PLACE_ENVIRONMENTS,
  PLACE_PRICING,
  getPlace,
  lubeckPlaces,
  type Place,
} from "@/data/places";
import { getDirection } from "@/lib/i18n";
import { prepareMapPlaces } from "@/lib/mapPlaces";
import { buildPersonalizedTour } from "@/lib/tourBuilder";
import { rankPlacesForTourPreferences } from "@/lib/tourPreferences";

const CURATED_HIDDEN_GEM_SLUGS = [
  "fuechtingshof",
  "dunkelgruener-gang",
  "kalandsgang",
  "malerwinkel",
  "buergergaerten",
] as const;

const RESIDENTIAL_HIDDEN_GEM_SLUGS = [
  "fuechtingshof",
  "dunkelgruener-gang",
  "kalandsgang",
] as const;

function getCuratedHiddenGems(): readonly Place[] {
  return CURATED_HIDDEN_GEM_SLUGS.map((slug) => {
    const place = getPlace("lubeck", slug);

    if (!place) throw new Error(`Missing curated hidden gem: ${slug}`);
    return place;
  });
}

describe("CW-11 curated hidden-gem data", () => {
  it("provides five unique, valid Lübeck places using the existing Place domain", () => {
    const hiddenGems = getCuratedHiddenGems();

    expect(hiddenGems).toHaveLength(5);
    expect(new Set(hiddenGems.map((place) => place.slug)).size).toBe(5);

    for (const place of hiddenGems) {
      expect(place.city).toBe("lubeck");
      expect(place.tags).toContain(HIDDEN_GEM_TAG);
      expect(PLACE_CATEGORIES).toContain(place.category);
      expect(PLACE_ENVIRONMENTS).toContain(place.environment);
      expect(PLACE_PRICING).toContain(place.pricing);
      expect(place.durationMinutes).toBeGreaterThan(0);
      expect(Number.isFinite(place.coordinates.lat)).toBe(true);
      expect(Number.isFinite(place.coordinates.lng)).toBe(true);
      expect(place.coordinates.lat).toBeGreaterThanOrEqual(53.85);
      expect(place.coordinates.lat).toBeLessThanOrEqual(53.89);
      expect(place.coordinates.lng).toBeGreaterThanOrEqual(10.65);
      expect(place.coordinates.lng).toBeLessThanOrEqual(10.72);
      expect(place.content.de?.name).toBeTruthy();
      expect(place.content.de?.shortDescription).toBeTruthy();
      expect(place.content.en?.name).toBeTruthy();
      expect(place.content.en?.shortDescription).toBeTruthy();
    }
  });

  it("keeps every coordinate pair unique in the complete discovery catalog", () => {
    const coordinates = lubeckPlaces.map(
      (place) => `${place.coordinates.lat},${place.coordinates.lng}`,
    );

    expect(new Set(coordinates).size).toBe(coordinates.length);
  });

  it("records an authoritative HTTPS source and dated coordinate source for each place", () => {
    for (const slug of CURATED_HIDDEN_GEM_SLUGS) {
      const sources = getPlaceSources(slug);

      expect(sources.some((source) => source.type === "official")).toBe(true);
      expect(sources.some((source) => source.type === "map")).toBe(true);

      for (const source of sources) {
        expect(new URL(source.url).protocol).toBe("https:");
        expect(source.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("adds dated, low-key privacy guidance only to the residential set", () => {
    for (const slug of RESIDENTIAL_HIDDEN_GEM_SLUGS) {
      const place = getPlace("lubeck", slug);

      expect(place?.visitNoteVerifiedAt).toBe("2026-09-05");
      expect(place?.content.de?.visitNote).toMatch(/Privatsphäre/);
      expect(place?.content.en?.visitNote).toMatch(/privacy/);
    }

    for (const slug of ["malerwinkel", "buergergaerten"] as const) {
      const place = getPlace("lubeck", slug);
      expect(place?.visitNoteVerifiedAt).toBeUndefined();
      expect(place?.content.de?.visitNote).toBeUndefined();
      expect(place?.content.en?.visitNote).toBeUndefined();
    }
  });

  it("keeps Malerwinkel distinct from the Obertrave promenade", () => {
    const malerwinkel = getPlace("lubeck", "malerwinkel");
    const obertrave = getPlace("lubeck", "an-der-obertrave");

    expect(malerwinkel?.slug).not.toBe(obertrave?.slug);
    expect(malerwinkel?.coordinates).not.toEqual(obertrave?.coordinates);
    expect(malerwinkel?.content.en?.shortDescription).toContain(
      "green space",
    );
  });
});

describe("CW-11 discovery and personalization integration", () => {
  it("projects every curated place to discovery/map data with its trusted tag", () => {
    const projected = prepareMapPlaces(lubeckPlaces, "en");

    for (const slug of CURATED_HIDDEN_GEM_SLUGS) {
      const place = projected.find((candidate) => candidate.slug === slug);

      expect(place?.tags).toContain(
        HIDDEN_GEM_TAG,
      );

      if (RESIDENTIAL_HIDDEN_GEM_SLUGS.includes(
        slug as (typeof RESIDENTIAL_HIDDEN_GEM_SLUGS)[number],
      )) {
        expect(place?.visitNote).toMatch(/privacy/);
      }
    }
  });

  it("exposes honest English language and direction metadata for Arabic fallback", () => {
    const projected = prepareMapPlaces(getCuratedHiddenGems(), "ar");

    expect(getDirection("ar")).toBe("rtl");
    for (const place of projected) {
      expect(place.requestedLocale).toBe("ar");
      expect(place.actualLocale).toBe("en");
      expect(place.contentDirection).toBe("ltr");
      expect(place.didFallback).toBe(true);
    }
  });

  it("prioritizes all five new places for the existing hidden-gems interest", () => {
    const ranked = rankPlacesForTourPreferences(
      lubeckPlaces,
      { interests: ["hidden-gems"], walkingPreference: "standard" },
    );

    expect(ranked.slice(0, 5).map((place) => place.slug)).toEqual(
      CURATED_HIDDEN_GEM_SLUGS,
    );
  });

  it("allows the existing route builder to select curated hidden gems", () => {
    const route = buildPersonalizedTour({
      places: lubeckPlaces,
      preferences: {
        interests: ["hidden-gems"],
        walkingPreference: "standard",
      },
      timeBudgetMinutes: 90,
      origin: { lat: 53.8662, lng: 10.6797 },
    });

    expect(
      route.stops.some(({ place }) =>
        CURATED_HIDDEN_GEM_SLUGS.includes(
          place.slug as (typeof CURATED_HIDDEN_GEM_SLUGS)[number],
        ),
      ),
    ).toBe(true);
  });

  it("does not let hidden-gem relevance bypass unavailable status rules", () => {
    const [hiddenGem] = getCuratedHiddenGems();
    const unavailable = { ...hiddenGem, status: "renovation" } as const;
    const route = buildPersonalizedTour({
      places: [unavailable],
      preferences: {
        interests: ["hidden-gems"],
        walkingPreference: "standard",
      },
      timeBudgetMinutes: 90,
      origin: { lat: 53.8662, lng: 10.6797 },
    });

    expect(route.stops).toEqual([]);
  });
});
