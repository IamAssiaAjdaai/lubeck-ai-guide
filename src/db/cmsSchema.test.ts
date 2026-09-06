import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  citiesTable,
  cityLocalizationsTable,
  contentTagsTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placesTable,
  publicationStatusEnum,
  tourLocalizationsTable,
  toursTable,
  tourStopsTable,
} from "@/db/schema";

describe("CMS content schema", () => {
  it("defines only the CMS-02 publication states", () => {
    expect(publicationStatusEnum.enumValues).toEqual([
      "draft",
      "published",
      "archived",
    ]);
  });

  it("keeps operational and publication status separate", () => {
    const columns = getTableConfig(placesTable).columns.map(({ name }) => name);
    expect(columns).toContain("status");
    expect(columns).toContain("publication_status");
  });

  it.each([
    [cityLocalizationsTable, "city_localizations_city_locale_unique"],
    [placeLocalizationsTable, "place_localizations_place_locale_unique"],
    [tourLocalizationsTable, "tour_localizations_tour_locale_unique"],
    [toursTable, "tours_city_slug_unique"],
  ] as const)("defines a required uniqueness constraint", (table, indexName) => {
    expect(
      getTableConfig(table).indexes.some(
        (index) => index.config.name === indexName && index.config.unique,
      ),
    ).toBe(true);
  });

  it("normalizes reusable tags and deterministic tour stops", () => {
    expect(getTableConfig(contentTagsTable).name).toBe("content_tags");
    expect(getTableConfig(placeContentTagsTable).primaryKeys).toHaveLength(1);
    expect(getTableConfig(tourStopsTable).primaryKeys).toHaveLength(1);
    expect(
      getTableConfig(tourStopsTable).indexes.some(
        (index) => index.config.name === "tour_stops_tour_place_unique",
      ),
    ).toBe(true);
  });

  it("adds additive CMS metadata to existing city and place tables", () => {
    for (const table of [citiesTable, placesTable]) {
      const columns = getTableConfig(table).columns.map(({ name }) => name);
      expect(columns).toEqual(
        expect.arrayContaining([
          "publication_status",
          "created_at",
          "updated_at",
          "created_by_user_id",
          "updated_by_user_id",
        ]),
      );
    }
  });
});
