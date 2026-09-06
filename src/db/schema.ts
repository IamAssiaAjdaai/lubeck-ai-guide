import {
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { PlaceFact } from "@/data/places";

function contentTimestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

function actorColumns() {
  return {
    createdByUserId: text("created_by_user_id"),
    updatedByUserId: text("updated_by_user_id"),
  };
}

export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "published",
  "archived",
]);

export const placeCategoryEnum = pgEnum("place_category", [
  "see",
  "eat",
  "fun",
]);

export const placeEnvironmentEnum = pgEnum("place_environment", [
  "indoor",
  "outdoor",
  "mixed",
]);

export const placePricingEnum = pgEnum("place_pricing", [
  "free",
  "paid",
  "mixed",
  "unknown",
]);

export const placeStatusEnum = pgEnum("place_status", [
  "open",
  "closed",
  "renovation",
  "seasonal",
  "unknown",
]);

export const mediaKindEnum = pgEnum("media_kind", [
  "image",
  "audio",
  "video",
  "document",
]);

export const mediaLifecycleEnum = pgEnum("media_lifecycle", [
  "uploading",
  "pending_review",
  "approved",
  "rejected",
  "archived",
]);

export const mediaSourceTypeEnum = pgEnum("media_source_type", [
  "upload",
  "external",
]);

export const externalVideoProviderEnum = pgEnum("external_video_provider", [
  "youtube",
  "vimeo",
]);

export const mediaPurposeEnum = pgEnum("media_purpose", [
  "hero",
  "card",
  "gallery",
  "thumbnail",
  "audio",
  "video",
  "document",
]);

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  publicationStatus: publicationStatusEnum("publication_status")
    .default("draft")
    .notNull(),
  ...actorColumns(),
  ...contentTimestamps(),
});

export const cityLocalizationsTable = pgTable(
  "city_localizations",
  {
    id: serial("id").primaryKey(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    ...actorColumns(),
    ...contentTimestamps(),
  },
  (table) => [
    uniqueIndex("city_localizations_city_locale_unique").on(
      table.cityId,
      table.locale,
    ),
  ],
);

export const placesTable = pgTable(
  "places",
  {
    id: serial("id").primaryKey(),

    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, {
        onDelete: "cascade",
      }),

    slug: text("slug").notNull(),

    category: placeCategoryEnum("category").notNull(),

    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    durationMinutes: integer("duration_minutes").notNull(),

    environment: placeEnvironmentEnum("environment").notNull(),

    pricing: placePricingEnum("pricing").notNull(),

    status: placeStatusEnum("status"),

    statusVerifiedAt: date("status_verified_at"),

    visitNoteVerifiedAt: date("visit_note_verified_at"),

    visitNoteValidUntil: date("visit_note_valid_until"),

    image: text("image"),

    tags: text("tags").array().notNull(),

    publicationStatus: publicationStatusEnum("publication_status")
      .default("draft")
      .notNull(),

    ...actorColumns(),
    ...contentTimestamps(),
  },
  (table) => [
    uniqueIndex("places_city_slug_unique").on(
      table.cityId,
      table.slug,
    ),
  ],
);

export const placeLocalizationsTable = pgTable(
  "place_localizations",
  {
    id: serial("id").primaryKey(),
    placeId: integer("place_id")
      .notNull()
      .references(() => placesTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description"),
    story: text("story"),
    visitNotes: text("visit_notes"),
    facts: jsonb("facts").$type<PlaceFact[]>().default([]).notNull(),
    ...actorColumns(),
    ...contentTimestamps(),
  },
  (table) => [
    uniqueIndex("place_localizations_place_locale_unique").on(
      table.placeId,
      table.locale,
    ),
  ],
);

export const contentTagsTable = pgTable("content_tags", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const placeContentTagsTable = pgTable(
  "place_content_tags",
  {
    placeId: integer("place_id")
      .notNull()
      .references(() => placesTable.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => contentTagsTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.placeId, table.tagId] }),
    index("place_content_tags_tag_id_idx").on(table.tagId),
  ],
);

export const toursTable = pgTable(
  "tours",
  {
    id: serial("id").primaryKey(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    publicationStatus: publicationStatusEnum("publication_status")
      .default("draft")
      .notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    ...actorColumns(),
    ...contentTimestamps(),
  },
  (table) => [
    uniqueIndex("tours_city_slug_unique").on(table.cityId, table.slug),
  ],
);

export const tourLocalizationsTable = pgTable(
  "tour_localizations",
  {
    id: serial("id").primaryKey(),
    tourId: integer("tour_id")
      .notNull()
      .references(() => toursTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    ...actorColumns(),
    ...contentTimestamps(),
  },
  (table) => [
    uniqueIndex("tour_localizations_tour_locale_unique").on(
      table.tourId,
      table.locale,
    ),
  ],
);

export const tourStopsTable = pgTable(
  "tour_stops",
  {
    tourId: integer("tour_id")
      .notNull()
      .references(() => toursTable.id, { onDelete: "cascade" }),
    placeId: integer("place_id")
      .notNull()
      .references(() => placesTable.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    visitDurationMinutes: integer("visit_duration_minutes"),
  },
  (table) => [
    primaryKey({ columns: [table.tourId, table.position] }),
    uniqueIndex("tour_stops_tour_place_unique").on(
      table.tourId,
      table.placeId,
    ),
    index("tour_stops_place_id_idx").on(table.placeId),
  ],
);

export const mediaAssetsTable = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    assetKey: uuid("asset_key").notNull().unique(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "restrict" }),
    kind: mediaKindEnum("kind").notNull(),
    sourceType: mediaSourceTypeEnum("source_type").notNull(),
    storageProvider: text("storage_provider"),
    objectKey: text("object_key").unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes"),
    expectedSizeBytes: integer("expected_size_bytes"),
    checksumSha256: text("checksum_sha256"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: doublePrecision("duration_seconds"),
    locale: text("locale"),
    approvalStatus: mediaLifecycleEnum("approval_status")
      .default("uploading")
      .notNull(),
    externalVideoProvider: externalVideoProviderEnum("external_video_provider"),
    externalVideoId: text("external_video_id"),
    canonicalUrl: text("canonical_url"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    uploadExpiresAt: timestamp("upload_expires_at", { withTimezone: true }),
    ...actorColumns(),
    ...contentTimestamps(),
  },
  (table) => [
    index("media_assets_city_id_idx").on(table.cityId),
    index("media_assets_kind_status_idx").on(
      table.kind,
      table.approvalStatus,
    ),
    index("media_assets_created_at_idx").on(table.createdAt),
  ],
);

function mediaAttachmentColumns() {
  return {
    id: serial("id").primaryKey(),
    mediaAssetId: integer("media_asset_id")
      .notNull()
      .references(() => mediaAssetsTable.id, { onDelete: "restrict" }),
    purpose: mediaPurposeEnum("purpose").notNull(),
    position: integer("position").default(0).notNull(),
    locale: text("locale").default("").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  };
}

export const cityMediaTable = pgTable(
  "city_media",
  {
    ...mediaAttachmentColumns(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("city_media_slot_unique").on(
      table.cityId,
      table.purpose,
      table.locale,
      table.position,
    ),
    index("city_media_asset_id_idx").on(table.mediaAssetId),
  ],
);

export const placeMediaTable = pgTable(
  "place_media",
  {
    ...mediaAttachmentColumns(),
    placeId: integer("place_id")
      .notNull()
      .references(() => placesTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("place_media_slot_unique").on(
      table.placeId,
      table.purpose,
      table.locale,
      table.position,
    ),
    index("place_media_asset_id_idx").on(table.mediaAssetId),
  ],
);

export const tourMediaTable = pgTable(
  "tour_media",
  {
    ...mediaAttachmentColumns(),
    tourId: integer("tour_id")
      .notNull()
      .references(() => toursTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("tour_media_slot_unique").on(
      table.tourId,
      table.purpose,
      table.locale,
      table.position,
    ),
    index("tour_media_asset_id_idx").on(table.mediaAssetId),
  ],
);

export type CityRow = typeof citiesTable.$inferSelect;
export type NewCityRow = typeof citiesTable.$inferInsert;

export type PlaceRow = typeof placesTable.$inferSelect;
export type NewPlaceRow = typeof placesTable.$inferInsert;
export type CityLocalizationRow = typeof cityLocalizationsTable.$inferSelect;
export type PlaceLocalizationRow = typeof placeLocalizationsTable.$inferSelect;
export type ContentTagRow = typeof contentTagsTable.$inferSelect;
export type TourRow = typeof toursTable.$inferSelect;
export type TourLocalizationRow = typeof tourLocalizationsTable.$inferSelect;
export type TourStopRow = typeof tourStopsTable.$inferSelect;
export type MediaAssetRow = typeof mediaAssetsTable.$inferSelect;
export type NewMediaAssetRow = typeof mediaAssetsTable.$inferInsert;
export type CityMediaRow = typeof cityMediaTable.$inferSelect;
export type PlaceMediaRow = typeof placeMediaTable.$inferSelect;
export type TourMediaRow = typeof tourMediaTable.$inferSelect;
