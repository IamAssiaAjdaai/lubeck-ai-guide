import { describe, expect, it } from "vitest";

import {
  PLACE_CATEGORY_ICON_IDS,
  filterPlacesByCategory,
  localizePlaceCategories,
  placeCategoryConfig,
} from "@/data/placeCategories";
import {
  HIDDEN_GEM_TAG,
  PLACE_CATEGORIES,
  lubeckLandmarks,
  lubeckPlaces,
} from "@/data/places";
import { getTranslations, locales } from "@/lib/i18n";

describe("place category metadata", () => {
  it("defines reusable All, See, Eat and Fun filters with Lucide icon IDs", () => {
    expect(placeCategoryConfig.map((category) => category.id)).toEqual([
      "all",
      "see",
      "eat",
      "fun",
    ]);

    for (const category of placeCategoryConfig) {
      expect(PLACE_CATEGORY_ICON_IDS).toContain(category.icon);
    }
  });

  it("does not expose hidden-gem as a category", () => {
    expect(PLACE_CATEGORIES).toEqual(["see", "eat", "fun"]);
    expect(PLACE_CATEGORIES).not.toContain("all");
    expect(placeCategoryConfig.map((category) => category.id)).not.toContain(
      HIDDEN_GEM_TAG,
    );
    expect(placeCategoryConfig.find((category) => category.id === "all")).toMatchObject({
      category: null,
    });
  });

  it("resolves category labels from every locale dictionary", () => {
    for (const locale of locales) {
      const categories = localizePlaceCategories(getTranslations(locale));

      expect(categories).toHaveLength(4);
      for (const category of categories) {
        expect(category.label.trim()).not.toBe("");
      }
    }
  });
});

describe("reusable place category filtering", () => {
  it("filters any compatible place collection without city-specific logic", () => {
    const fixtures = [
      { slug: "museum", category: "see" },
      { slug: "cafe", category: "eat" },
      { slug: "theatre", category: "fun" },
      { slug: "park", category: "see" },
    ] as const;

    expect(filterPlacesByCategory(fixtures, "all")).toEqual(fixtures);
    expect(
      filterPlacesByCategory(fixtures, "see").map((place) => place.slug),
    ).toEqual(["museum", "park"]);
    expect(
      filterPlacesByCategory(fixtures, "eat").map((place) => place.slug),
    ).toEqual(["cafe"]);
    expect(
      filterPlacesByCategory(fixtures, "fun").map((place) => place.slug),
    ).toEqual(["theatre"]);
  });

  it("returns the required 12/5/3 Lübeck catalog split", () => {
    expect(filterPlacesByCategory(lubeckPlaces, "see")).toHaveLength(12);
    expect(filterPlacesByCategory(lubeckPlaces, "eat")).toHaveLength(5);
    expect(filterPlacesByCategory(lubeckPlaces, "fun")).toHaveLength(3);
  });

  it("keeps the walking tour collection at exactly five stops", () => {
    expect(lubeckLandmarks).toHaveLength(5);
  });
});
