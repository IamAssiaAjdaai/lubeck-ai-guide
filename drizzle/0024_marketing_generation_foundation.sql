-- Phase 1 only. Prior handwritten migrations 0020–0023 are reflected in
-- 0024_snapshot.json; their existing DDL is deliberately not repeated.
CREATE TYPE "public"."marketing_generation_job_status" AS ENUM('queued', 'claimed', 'processing', 'completed', 'failed', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."marketing_generation_kind" AS ENUM('campaign_pack', 'blog', 'social', 'carousel', 'reel', 'voiceover', 'video', 'thumbnail');
--> statement-breakpoint
CREATE TYPE "public"."marketing_generation_output_status" AS ENUM('draft', 'approved', 'rejected');
--> statement-breakpoint
CREATE TABLE "marketing_generation_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	"source_snapshot_id" integer NOT NULL,
	"type" "marketing_generation_kind" NOT NULL,
	"requested_outputs" "marketing_generation_kind"[] NOT NULL,
	"language" text NOT NULL,
	"status" "marketing_generation_job_status" DEFAULT 'queued' NOT NULL,
	"worker_id" text,
	"lease_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_jobs_request_check" CHECK (cardinality("marketing_generation_jobs"."requested_outputs") BETWEEN 1 AND 8 AND array_position("marketing_generation_jobs"."requested_outputs", NULL) IS NULL),
	CONSTRAINT "marketing_jobs_attempts_check" CHECK ("marketing_generation_jobs"."attempts" >= 0),
	CONSTRAINT "marketing_jobs_error_check" CHECK ("marketing_generation_jobs"."error_code" IS NULL OR "marketing_generation_jobs"."error_code" IN ('invalid_source', 'generation_failed', 'lease_expired', 'upload_failed', 'internal_error')),
	CONSTRAINT "marketing_jobs_lease_check" CHECK (("marketing_generation_jobs"."status" IN ('claimed', 'processing') AND "marketing_generation_jobs"."worker_id" IS NOT NULL AND length(trim("marketing_generation_jobs"."worker_id")) BETWEEN 1 AND 128 AND "marketing_generation_jobs"."lease_expires_at" IS NOT NULL AND "marketing_generation_jobs"."attempts" > 0) OR ("marketing_generation_jobs"."status" NOT IN ('claimed', 'processing') AND "marketing_generation_jobs"."lease_expires_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "marketing_generation_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	"kind" "marketing_generation_kind" NOT NULL,
	"language" text NOT NULL,
	"status" "marketing_generation_output_status" DEFAULT 'draft' NOT NULL,
	"text_content" text,
	"structured_content_json" jsonb,
	"media_asset_id" integer,
	"marketing_content_id" integer,
	"marketing_page_id" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_outputs_version_check" CHECK ("marketing_generation_outputs"."version" > 0),
	CONSTRAINT "marketing_outputs_payload_check" CHECK (("marketing_generation_outputs"."text_content" IS NOT NULL OR "marketing_generation_outputs"."structured_content_json" IS NOT NULL OR "marketing_generation_outputs"."media_asset_id" IS NOT NULL) AND ("marketing_generation_outputs"."text_content" IS NULL OR octet_length("marketing_generation_outputs"."text_content") <= 262144) AND ("marketing_generation_outputs"."structured_content_json" IS NULL OR (jsonb_typeof("marketing_generation_outputs"."structured_content_json") = 'object' AND octet_length("marketing_generation_outputs"."structured_content_json"::text) <= 524288)))
);
--> statement-breakpoint
CREATE TABLE "marketing_source_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	"locale" text NOT NULL,
	"facts_json" jsonb NOT NULL,
	"places_json" jsonb NOT NULL,
	"references_json" jsonb NOT NULL,
	"media_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brand_rules_json" jsonb NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_snapshots_locale_check" CHECK ("marketing_source_snapshots"."locale" IN ('en', 'de', 'fr')),
	CONSTRAINT "marketing_snapshots_bounds_check" CHECK (
    jsonb_typeof("marketing_source_snapshots"."facts_json") = 'array' AND jsonb_array_length("marketing_source_snapshots"."facts_json") BETWEEN 1 AND 100
    AND jsonb_typeof("marketing_source_snapshots"."places_json") = 'array' AND jsonb_array_length("marketing_source_snapshots"."places_json") BETWEEN 1 AND 50
    AND jsonb_typeof("marketing_source_snapshots"."references_json") = 'array' AND jsonb_array_length("marketing_source_snapshots"."references_json") BETWEEN 1 AND 100
    AND jsonb_typeof("marketing_source_snapshots"."media_json") = 'array' AND jsonb_array_length("marketing_source_snapshots"."media_json") <= 50
    AND jsonb_typeof("marketing_source_snapshots"."brand_rules_json") = 'object'
    AND octet_length("marketing_source_snapshots"."facts_json"::text) <= 262144
    AND octet_length("marketing_source_snapshots"."places_json"::text) <= 4096
    AND octet_length("marketing_source_snapshots"."references_json"::text) <= 131072
    AND octet_length("marketing_source_snapshots"."media_json"::text) <= 16384
    AND octet_length("marketing_source_snapshots"."brand_rules_json"::text) <= 16384)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_campaigns_id_city_unique" ON "marketing_campaigns" USING btree ("id","city_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_content_generation_owner_unique" ON "marketing_content" USING btree ("id","campaign_id","city_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_pages_generation_owner_unique" ON "marketing_pages" USING btree ("id","campaign_id","city_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_jobs_context_unique" ON "marketing_generation_jobs" USING btree ("id","campaign_id","city_id","language");
--> statement-breakpoint
CREATE INDEX "marketing_jobs_snapshot_idx" ON "marketing_generation_jobs" USING btree ("source_snapshot_id");
--> statement-breakpoint
CREATE INDEX "marketing_jobs_campaign_created_idx" ON "marketing_generation_jobs" USING btree ("campaign_id","created_at");
--> statement-breakpoint
CREATE INDEX "marketing_jobs_city_status_idx" ON "marketing_generation_jobs" USING btree ("city_id","status");
--> statement-breakpoint
CREATE INDEX "marketing_jobs_claim_idx" ON "marketing_generation_jobs" USING btree ("status","lease_expires_at","created_at");
--> statement-breakpoint
CREATE INDEX "marketing_jobs_requester_idx" ON "marketing_generation_jobs" USING btree ("created_by_user_id");
--> statement-breakpoint
CREATE INDEX "marketing_outputs_job_kind_idx" ON "marketing_generation_outputs" USING btree ("job_id","kind","version");
--> statement-breakpoint
CREATE INDEX "marketing_outputs_campaign_status_idx" ON "marketing_generation_outputs" USING btree ("campaign_id","status");
--> statement-breakpoint
CREATE INDEX "marketing_outputs_city_status_idx" ON "marketing_generation_outputs" USING btree ("city_id","status");
--> statement-breakpoint
CREATE INDEX "marketing_outputs_content_idx" ON "marketing_generation_outputs" USING btree ("marketing_content_id");
--> statement-breakpoint
CREATE INDEX "marketing_outputs_page_idx" ON "marketing_generation_outputs" USING btree ("marketing_page_id");
--> statement-breakpoint
CREATE INDEX "marketing_outputs_media_idx" ON "marketing_generation_outputs" USING btree ("media_asset_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_snapshots_context_unique" ON "marketing_source_snapshots" USING btree ("id","campaign_id","city_id","locale");
--> statement-breakpoint
CREATE INDEX "marketing_snapshots_campaign_created_idx" ON "marketing_source_snapshots" USING btree ("campaign_id","created_at");
--> statement-breakpoint
CREATE INDEX "marketing_snapshots_city_created_idx" ON "marketing_source_snapshots" USING btree ("city_id","created_at");
--> statement-breakpoint
CREATE INDEX "marketing_snapshots_creator_idx" ON "marketing_source_snapshots" USING btree ("created_by_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_id_city_unique" ON "media_assets" USING btree ("id","city_id");
--> statement-breakpoint
ALTER TABLE "marketing_generation_jobs" ADD CONSTRAINT "marketing_generation_jobs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_generation_jobs" ADD CONSTRAINT "marketing_jobs_snapshot_context_fk" FOREIGN KEY ("source_snapshot_id","campaign_id","city_id","language") REFERENCES "public"."marketing_source_snapshots"("id","campaign_id","city_id","locale") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_generation_outputs" ADD CONSTRAINT "marketing_outputs_job_context_fk" FOREIGN KEY ("job_id","campaign_id","city_id","language") REFERENCES "public"."marketing_generation_jobs"("id","campaign_id","city_id","language") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_generation_outputs" ADD CONSTRAINT "marketing_outputs_content_owner_fk" FOREIGN KEY ("marketing_content_id","campaign_id","city_id") REFERENCES "public"."marketing_content"("id","campaign_id","city_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_generation_outputs" ADD CONSTRAINT "marketing_outputs_page_owner_fk" FOREIGN KEY ("marketing_page_id","campaign_id","city_id") REFERENCES "public"."marketing_pages"("id","campaign_id","city_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_generation_outputs" ADD CONSTRAINT "marketing_outputs_media_owner_fk" FOREIGN KEY ("media_asset_id","city_id") REFERENCES "public"."media_assets"("id","city_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_source_snapshots" ADD CONSTRAINT "marketing_source_snapshots_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketing_source_snapshots" ADD CONSTRAINT "marketing_snapshots_campaign_owner_fk" FOREIGN KEY ("campaign_id","city_id") REFERENCES "public"."marketing_campaigns"("id","city_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION marketing_snapshot_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Marketing source snapshots are immutable' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketing_snapshot_no_mutation
BEFORE UPDATE OR DELETE ON marketing_source_snapshots
FOR EACH ROW EXECUTE FUNCTION marketing_snapshot_immutable();
--> statement-breakpoint
CREATE TRIGGER marketing_snapshot_no_truncate
BEFORE TRUNCATE ON marketing_source_snapshots
FOR EACH STATEMENT EXECUTE FUNCTION marketing_snapshot_immutable();
--> statement-breakpoint
CREATE FUNCTION marketing_snapshot_validate() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  item jsonb;
BEGIN
  IF octet_length(NEW.facts_json::text) > 262144
    OR octet_length(NEW.places_json::text) > 4096
    OR octet_length(NEW.references_json::text) > 131072
    OR octet_length(NEW.media_json::text) > 16384
    OR octet_length(NEW.brand_rules_json::text) > 16384 THEN
    RAISE EXCEPTION 'Snapshot input exceeds bounds' USING ERRCODE = '23514';
  END IF;
  IF jsonb_typeof(NEW.facts_json) <> 'array'
    OR jsonb_typeof(NEW.places_json) <> 'array'
    OR jsonb_typeof(NEW.references_json) <> 'array'
    OR jsonb_typeof(NEW.media_json) <> 'array'
    OR jsonb_typeof(NEW.brand_rules_json) <> 'object' THEN
    RAISE EXCEPTION 'Invalid snapshot shape' USING ERRCODE = '23514';
  END IF;
  IF jsonb_array_length(NEW.facts_json) NOT BETWEEN 1 AND 100
    OR jsonb_array_length(NEW.places_json) NOT BETWEEN 1 AND 50
    OR jsonb_array_length(NEW.references_json) NOT BETWEEN 1 AND 100
    OR jsonb_array_length(NEW.media_json) > 50 THEN
    RAISE EXCEPTION 'Snapshot input exceeds bounds' USING ERRCODE = '23514';
  END IF;
  -- Exact copied evidence only. Publication alone never proves source trust.
  -- Locks serialize insertion against approval/verification changes. The
  -- snapshot remains a historical record, not a live authorization grant.
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.places_json) LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.facts_json) f
      WHERE f->'placeId' = item) THEN
      RAISE EXCEPTION 'Snapshot place has no selected facts' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM places p WHERE p.id = (item #>> '{}')::integer
      AND p.city_id = NEW.city_id AND p.publication_status = 'published'
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid snapshot place' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.references_json) LOOP
    IF jsonb_typeof(item) <> 'object'
      OR item - ARRAY['sourceId', 'title', 'canonicalUrl'] <> '{}'::jsonb
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.facts_json) f
        WHERE f->'sourceId' = item->'sourceId') THEN
      RAISE EXCEPTION 'Invalid snapshot reference shape' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM content_sources s
      WHERE s.id = (item->>'sourceId')::integer
        AND s.title = item->>'title' AND s.canonical_url = item->>'canonicalUrl'
        AND s.verified_at <= CURRENT_DATE
        AND (s.valid_until IS NULL OR s.valid_until >= CURRENT_DATE)
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid snapshot reference' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.facts_json) LOOP
    IF jsonb_typeof(item) <> 'object'
      OR item - ARRAY['id', 'placeId', 'sourceId', 'statement'] <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid snapshot fact shape' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM verified_knowledge_chunks k
      JOIN places p ON p.id = k.place_id
      JOIN content_sources s ON s.id = k.source_id
      JOIN place_sources ps ON ps.place_id = k.place_id AND ps.source_id = k.source_id
      WHERE k.id = (item->>'id')::uuid AND k.is_active
        AND k.locale = NEW.locale AND k.text = item->>'statement'
        AND k.place_id = (item->>'placeId')::integer
        AND k.source_id = (item->>'sourceId')::integer
        AND p.city_id = NEW.city_id AND p.publication_status = 'published'
        AND s.verified_at <= CURRENT_DATE
        AND (s.valid_until IS NULL OR s.valid_until >= CURRENT_DATE)
        AND NEW.places_json @> jsonb_build_array(k.place_id)
        AND NEW.references_json @> jsonb_build_array(jsonb_build_object('sourceId', k.source_id))
      FOR SHARE OF k, p, s, ps;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid snapshot fact' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.media_json) LOOP
    IF jsonb_typeof(item) <> 'object'
      OR item - ARRAY['assetId', 'assetKey'] <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid snapshot media shape' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM media_assets m
      WHERE m.id = (item->>'assetId')::integer
        AND m.asset_key = (item->>'assetKey')::uuid
        AND m.city_id = NEW.city_id AND m.approval_status = 'approved'
        AND m.archived_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid snapshot media' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketing_snapshot_approved_input
BEFORE INSERT ON marketing_source_snapshots
FOR EACH ROW EXECUTE FUNCTION marketing_snapshot_validate();
--> statement-breakpoint
CREATE FUNCTION marketing_output_validate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'draft' THEN
    RAISE EXCEPTION 'Generated outputs must start as draft' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM marketing_generation_jobs j WHERE j.id = NEW.job_id
    AND NEW.kind = ANY(j.requested_outputs) FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Output kind was not requested' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketing_output_draft_input
BEFORE INSERT OR UPDATE ON marketing_generation_outputs
FOR EACH ROW EXECUTE FUNCTION marketing_output_validate();
