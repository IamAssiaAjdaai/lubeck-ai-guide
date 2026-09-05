import { describe, expect, it } from "vitest";

import { filterPlacesByCategory } from "@/data/placeCategories";
import { lubeckLandmarks, lubeckPlaces } from "@/data/places";
import {
  calculateMapBounds,
  getMapMarkerAriaLabel,
  isValidMapCoordinate,
  prepareMapPlaces,
} from "@/lib/mapPlaces";

const tourStopSlugs = new Set(lubeckLandmarks.map((place) => place.slug));

function prepareLubeckMapPlaces(locale: "en" | "ar" = "en") {
  return prepareMapPlaces(lubeckPlaces, locale, {
    getDetailHref: (place) =>
      tourStopSlugs.has(place.slug)
        ? `/${locale}/lubeck/${place.slug}`
        : undefined,
  });
}

describe("map place preparation", () => {
  it("produces valid marker data for all 20 Lübeck places", () => {
    const markers = prepareLubeckMapPlaces();

    expect(markers).toHaveLength(20);
    for (const marker of markers) {
      expect(isValidMapCoordinate(marker.coordinates)).toBe(true);
      expect(marker.name.trim()).not.toBe("");
      expect(marker.shortDescription.trim()).not.toBe("");
    }
    expect(calculateMapBounds(markers)).toEqual([
      [10.6797, 53.8609],
      [10.6899, 53.874],
    ]);
  });

  it("preserves category-filtered marker counts", () => {
    expect(
      prepareMapPlaces(filterPlacesByCategory(lubeckPlaces, "see"), "en"),
    ).toHaveLength(12);
    expect(
      prepareMapPlaces(filterPlacesByCategory(lubeckPlaces, "eat"), "en"),
    ).toHaveLength(5);
    expect(
      prepareMapPlaces(filterPlacesByCategory(lubeckPlaces, "fun"), "en"),
    ).toHaveLength(3);
  });

  it("adds existing landmark links without inventing new-place routes", () => {
    const markers = prepareLubeckMapPlaces();
    const linkedMarkers = markers.filter((marker) => marker.detailHref);
    const informationalMarkers = markers.filter((marker) => !marker.detailHref);

    expect(linkedMarkers).toHaveLength(5);
    expect(linkedMarkers.map((marker) => marker.slug).sort()).toEqual(
      [...tourStopSlugs].sort(),
    );
    expect(informationalMarkers).toHaveLength(15);
  });

  it("preserves fallback locale and direction semantics", () => {
    const markers = prepareLubeckMapPlaces("ar");
    const fallback = markers.find((marker) => marker.slug === "cafe-niederegger");
    const translated = markers.find((marker) => marker.slug === "holstentor");

    expect(fallback).toMatchObject({
      requestedLocale: "ar",
      actualLocale: "en",
      contentDirection: "ltr",
      didFallback: true,
    });
    expect(translated).toMatchObject({
      requestedLocale: "ar",
      actualLocale: "ar",
      contentDirection: "rtl",
      didFallback: false,
    });
  });

  it("carries trusted availability metadata into client planning data", () => {
    const buddenbrookhaus =
      prepareLubeckMapPlaces().find(
        (marker) =>
          marker.slug === "buddenbrookhaus",
      );

    expect(buddenbrookhaus).toMatchObject({
      status: "renovation",
      statusVerifiedAt: "2026-09-03",
      visitNoteVerifiedAt: "2026-09-03",
    });
  });

  it("builds accessible marker labels from name and category", () => {
    expect(getMapMarkerAriaLabel("Café Niederegger", "Eat")).toBe(
      "Café Niederegger — Eat",
    );
  });
});
