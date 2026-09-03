import {
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

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

    image: text("image"),

    tags: text("tags").array().notNull(),
  },
  (table) => [
    uniqueIndex("places_city_slug_unique").on(
      table.cityId,
      table.slug,
    ),
  ],
);

export type CityRow = typeof citiesTable.$inferSelect;
export type NewCityRow = typeof citiesTable.$inferInsert;

export type PlaceRow = typeof placesTable.$inferSelect;
export type NewPlaceRow = typeof placesTable.$inferInsert;