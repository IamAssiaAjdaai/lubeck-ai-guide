import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { citiesTable, publicationStatusEnum } from "@/db/schema";

function marketingTimestamps() {
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

function marketingActors() {
  return {
    createdByUserId: text("created_by_user_id"),
    updatedByUserId: text("updated_by_user_id"),
  };
}

export const marketingCampaignStatusEnum = pgEnum(
  "marketing_campaign_status",
  ["draft", "active", "paused", "completed", "archived"],
);

export const marketingPageKindEnum = pgEnum("marketing_page_kind", [
  "landing",
  "blog",
]);

export const marketingContentStatusEnum = pgEnum(
  "marketing_content_status",
  ["idea", "draft", "in_review", "approved", "ready", "published", "archived"],
);

export const marketingCampaignsTable = pgTable(
  "marketing_campaigns",
  {
    id: serial("id").primaryKey(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    audience: text("audience").notNull(),
    message: text("message").notNull(),
    cta: text("cta").notNull(),
    status: marketingCampaignStatusEnum("status").default("draft").notNull(),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    ...marketingActors(),
    ...marketingTimestamps(),
  },
  (table) => [
    uniqueIndex("marketing_campaigns_city_slug_unique").on(
      table.cityId,
      table.slug,
    ),
    index("marketing_campaigns_city_status_idx").on(
      table.cityId,
      table.status,
    ),
  ],
);

export const marketingPagesTable = pgTable(
  "marketing_pages",
  {
    id: serial("id").primaryKey(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(
      () => marketingCampaignsTable.id,
      { onDelete: "set null" },
    ),
    kind: marketingPageKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    cta: text("cta"),
    publicationStatus: publicationStatusEnum("publication_status")
      .default("draft")
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...marketingActors(),
    ...marketingTimestamps(),
  },
  (table) => [
    uniqueIndex("marketing_pages_path_unique").on(table.path),
    uniqueIndex("marketing_pages_city_kind_slug_unique").on(
      table.cityId,
      table.kind,
      table.slug,
    ),
    index("marketing_pages_city_publication_idx").on(
      table.cityId,
      table.publicationStatus,
    ),
    index("marketing_pages_campaign_idx").on(table.campaignId),
  ],
);

export const marketingContentTable = pgTable(
  "marketing_content",
  {
    id: serial("id").primaryKey(),
    cityId: integer("city_id")
      .notNull()
      .references(() => citiesTable.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(
      () => marketingCampaignsTable.id,
      { onDelete: "set null" },
    ),
    pageId: integer("page_id").references(() => marketingPagesTable.id, {
      onDelete: "set null",
    }),
    contentCode: text("content_code").notNull(),
    platform: text("platform").notNull(),
    format: text("format").notNull(),
    hook: text("hook").notNull(),
    script: text("script"),
    caption: text("caption"),
    cta: text("cta"),
    status: marketingContentStatusEnum("status").default("idea").notNull(),
    publishedUrl: text("published_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...marketingActors(),
    ...marketingTimestamps(),
  },
  (table) => [
    uniqueIndex("marketing_content_code_unique").on(table.contentCode),
    index("marketing_content_city_status_idx").on(table.cityId, table.status),
    index("marketing_content_campaign_idx").on(table.campaignId),
    index("marketing_content_page_idx").on(table.pageId),
  ],
);

export type MarketingCampaignRow =
  typeof marketingCampaignsTable.$inferSelect;
export type MarketingPageRow = typeof marketingPagesTable.$inferSelect;
export type MarketingContentRow = typeof marketingContentTable.$inferSelect;
