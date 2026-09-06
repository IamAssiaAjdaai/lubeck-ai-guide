import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  cityMediaTable,
  mediaAssetsTable,
  mediaKindEnum,
  mediaLifecycleEnum,
  mediaPurposeEnum,
  placeMediaTable,
  tourMediaTable,
} from "@/db/schema";

describe("CMS media schema", () => {
  it("defines explicit kinds and lifecycle independent from content publication", () => {
    expect(mediaKindEnum.enumValues).toEqual(["image", "audio", "video", "document"]);
    expect(mediaLifecycleEnum.enumValues).toEqual(["uploading", "pending_review", "approved", "rejected", "archived"]);
    expect(mediaPurposeEnum.enumValues).toContain("gallery");
  });

  it("stores metadata rather than binary content", () => {
    const columns = getTableConfig(mediaAssetsTable).columns.map(({ name }) => name);
    expect(columns).toEqual(expect.arrayContaining(["asset_key", "object_key", "mime_type", "size_bytes", "checksum_sha256", "created_by_user_id", "updated_by_user_id"]));
    expect(columns).not.toEqual(expect.arrayContaining(["content", "binary", "bytes"]));
  });

  it.each([
    [cityMediaTable, "city_media_slot_unique"],
    [placeMediaTable, "place_media_slot_unique"],
    [tourMediaTable, "tour_media_slot_unique"],
  ] as const)("enforces deterministic attachment slots", (table, indexName) => {
    expect(getTableConfig(table).indexes.some((index) => index.config.name === indexName && index.config.unique)).toBe(true);
    expect(getTableConfig(table).foreignKeys).toHaveLength(2);
  });
});

