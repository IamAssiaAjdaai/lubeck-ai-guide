import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/db/authSchema";
import { mediaAssetsTable } from "@/db/schema";
import {
  marketingCampaignsTable,
  marketingContentTable,
  marketingPagesTable,
} from "@/db/marketingSchema";

export const marketingGenerationKindEnum = pgEnum("marketing_generation_kind", [
  "campaign_pack", "blog", "social", "carousel", "reel", "voiceover", "video", "thumbnail",
]);
export const marketingGenerationJobStatusEnum = pgEnum("marketing_generation_job_status", [
  "queued", "claimed", "processing", "completed", "failed", "cancelled",
]);
export const marketingGenerationOutputStatusEnum = pgEnum("marketing_generation_output_status", [
  "draft", "approved", "rejected",
]);

export type MarketingSnapshotFact = {
  id: string;
  placeId: number;
  sourceId: number;
  statement: string;
};
export type MarketingSnapshotReference = {
  sourceId: number;
  title: string;
  canonicalUrl: string;
};
export type MarketingSnapshotMedia = { assetId: number; assetKey: string };

function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

// SQL triggers validate evidence at insertion and reject UPDATE, DELETE and
// TRUNCATE. JSON retains the approved input even if live sources later change.
export const marketingSourceSnapshotsTable = pgTable("marketing_source_snapshots", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  cityId: integer("city_id").notNull(),
  locale: text("locale").notNull(),
  factsJson: jsonb("facts_json").$type<MarketingSnapshotFact[]>().notNull(),
  placesJson: jsonb("places_json").$type<number[]>().notNull(),
  referencesJson: jsonb("references_json").$type<MarketingSnapshotReference[]>().notNull(),
  mediaJson: jsonb("media_json").$type<MarketingSnapshotMedia[]>().default([]).notNull(),
  brandRulesJson: jsonb("brand_rules_json").$type<Record<string, unknown>>().notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  foreignKey({
    name: "marketing_snapshots_campaign_owner_fk",
    columns: [t.campaignId, t.cityId],
    foreignColumns: [marketingCampaignsTable.id, marketingCampaignsTable.cityId],
  }).onDelete("restrict"),
  uniqueIndex("marketing_snapshots_context_unique").on(t.id, t.campaignId, t.cityId, t.locale),
  index("marketing_snapshots_campaign_created_idx").on(t.campaignId, t.createdAt),
  index("marketing_snapshots_city_created_idx").on(t.cityId, t.createdAt),
  index("marketing_snapshots_creator_idx").on(t.createdByUserId),
  check("marketing_snapshots_locale_check", sql`${t.locale} IN ('en', 'de', 'fr')`),
  check("marketing_snapshots_bounds_check", sql`
    jsonb_typeof(${t.factsJson}) = 'array' AND jsonb_array_length(${t.factsJson}) BETWEEN 1 AND 100
    AND jsonb_typeof(${t.placesJson}) = 'array' AND jsonb_array_length(${t.placesJson}) BETWEEN 1 AND 50
    AND jsonb_typeof(${t.referencesJson}) = 'array' AND jsonb_array_length(${t.referencesJson}) BETWEEN 1 AND 100
    AND jsonb_typeof(${t.mediaJson}) = 'array' AND jsonb_array_length(${t.mediaJson}) <= 50
    AND jsonb_typeof(${t.brandRulesJson}) = 'object'
    AND octet_length(${t.factsJson}::text) <= 262144
    AND octet_length(${t.placesJson}::text) <= 4096
    AND octet_length(${t.referencesJson}::text) <= 131072
    AND octet_length(${t.mediaJson}::text) <= 16384
    AND octet_length(${t.brandRulesJson}::text) <= 16384`),
]);

export const marketingGenerationJobsTable = pgTable("marketing_generation_jobs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  cityId: integer("city_id").notNull(),
  sourceSnapshotId: integer("source_snapshot_id").notNull(),
  type: marketingGenerationKindEnum("type").notNull(),
  requestedOutputs: marketingGenerationKindEnum("requested_outputs").array().notNull(),
  language: text("language").notNull(),
  status: marketingGenerationJobStatusEnum("status").default("queued").notNull(),
  workerId: text("worker_id"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  attempts: integer("attempts").default(0).notNull(),
  // A bounded allowlist code, never provider messages, prompts or stack traces.
  errorCode: text("error_code"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdByUserId: text("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  ...timestamps(),
}, (t) => [
  foreignKey({
    name: "marketing_jobs_snapshot_context_fk",
    columns: [t.sourceSnapshotId, t.campaignId, t.cityId, t.language],
    foreignColumns: [marketingSourceSnapshotsTable.id, marketingSourceSnapshotsTable.campaignId, marketingSourceSnapshotsTable.cityId, marketingSourceSnapshotsTable.locale],
  }).onDelete("restrict"),
  uniqueIndex("marketing_jobs_context_unique").on(t.id, t.campaignId, t.cityId, t.language),
  index("marketing_jobs_snapshot_idx").on(t.sourceSnapshotId),
  index("marketing_jobs_campaign_created_idx").on(t.campaignId, t.createdAt),
  index("marketing_jobs_city_status_idx").on(t.cityId, t.status),
  index("marketing_jobs_claim_idx").on(t.status, t.leaseExpiresAt, t.createdAt),
  index("marketing_jobs_requester_idx").on(t.createdByUserId),
  check("marketing_jobs_request_check", sql`cardinality(${t.requestedOutputs}) BETWEEN 1 AND 8 AND array_position(${t.requestedOutputs}, NULL) IS NULL`),
  check("marketing_jobs_attempts_check", sql`${t.attempts} >= 0`),
  check("marketing_jobs_error_check", sql`${t.errorCode} IS NULL OR ${t.errorCode} IN ('invalid_source', 'generation_failed', 'lease_expired', 'upload_failed', 'internal_error')`),
  check("marketing_jobs_lease_check", sql`(${t.status} IN ('claimed', 'processing') AND ${t.workerId} IS NOT NULL AND length(trim(${t.workerId})) BETWEEN 1 AND 128 AND ${t.leaseExpiresAt} IS NOT NULL AND ${t.attempts} > 0) OR (${t.status} NOT IN ('claimed', 'processing') AND ${t.leaseExpiresAt} IS NULL)`),
]);

export const marketingGenerationOutputsTable = pgTable("marketing_generation_outputs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  cityId: integer("city_id").notNull(),
  kind: marketingGenerationKindEnum("kind").notNull(),
  language: text("language").notNull(),
  status: marketingGenerationOutputStatusEnum("status").default("draft").notNull(),
  textContent: text("text_content"),
  structuredContentJson: jsonb("structured_content_json").$type<Record<string, unknown>>(),
  mediaAssetId: integer("media_asset_id"),
  marketingContentId: integer("marketing_content_id"),
  marketingPageId: integer("marketing_page_id"),
  version: integer("version").default(1).notNull(),
  ...timestamps(),
}, (t) => [
  foreignKey({
    name: "marketing_outputs_job_context_fk",
    columns: [t.jobId, t.campaignId, t.cityId, t.language],
    foreignColumns: [marketingGenerationJobsTable.id, marketingGenerationJobsTable.campaignId, marketingGenerationJobsTable.cityId, marketingGenerationJobsTable.language],
  }).onDelete("restrict"),
  foreignKey({
    name: "marketing_outputs_content_owner_fk",
    columns: [t.marketingContentId, t.campaignId, t.cityId],
    foreignColumns: [marketingContentTable.id, marketingContentTable.campaignId, marketingContentTable.cityId],
  }).onDelete("restrict"),
  foreignKey({
    name: "marketing_outputs_page_owner_fk",
    columns: [t.marketingPageId, t.campaignId, t.cityId],
    foreignColumns: [marketingPagesTable.id, marketingPagesTable.campaignId, marketingPagesTable.cityId],
  }).onDelete("restrict"),
  foreignKey({
    name: "marketing_outputs_media_owner_fk",
    columns: [t.mediaAssetId, t.cityId],
    foreignColumns: [mediaAssetsTable.id, mediaAssetsTable.cityId],
  }).onDelete("restrict"),
  index("marketing_outputs_job_kind_idx").on(t.jobId, t.kind, t.version),
  index("marketing_outputs_campaign_status_idx").on(t.campaignId, t.status),
  index("marketing_outputs_city_status_idx").on(t.cityId, t.status),
  index("marketing_outputs_content_idx").on(t.marketingContentId),
  index("marketing_outputs_page_idx").on(t.marketingPageId),
  index("marketing_outputs_media_idx").on(t.mediaAssetId),
  check("marketing_outputs_version_check", sql`${t.version} > 0`),
  check("marketing_outputs_payload_check", sql`(${t.textContent} IS NOT NULL OR ${t.structuredContentJson} IS NOT NULL OR ${t.mediaAssetId} IS NOT NULL) AND (${t.textContent} IS NULL OR octet_length(${t.textContent}) <= 262144) AND (${t.structuredContentJson} IS NULL OR (jsonb_typeof(${t.structuredContentJson}) = 'object' AND octet_length(${t.structuredContentJson}::text) <= 524288))`),
]);

export type MarketingSourceSnapshotRow = typeof marketingSourceSnapshotsTable.$inferSelect;
export type MarketingGenerationJobRow = typeof marketingGenerationJobsTable.$inferSelect;
export type MarketingGenerationOutputRow = typeof marketingGenerationOutputsTable.$inferSelect;
