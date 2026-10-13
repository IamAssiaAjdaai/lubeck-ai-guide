CREATE TYPE "public"."brand_context_event" AS ENUM('created', 'facts_confirmed', 'corrected');--> statement-breakpoint
CREATE TABLE "brand_context_audit" (
	"context_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"event" "brand_context_event" NOT NULL,
	"actor_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"fact_ids" jsonb NOT NULL,
	CONSTRAINT "brand_context_audit_context_id_revision_pk" PRIMARY KEY("context_id","revision"),
	CONSTRAINT "brand_audit_facts_shape" CHECK (jsonb_typeof("brand_context_audit"."fact_ids") = 'array' AND jsonb_array_length("brand_context_audit"."fact_ids") <= 100 AND (("brand_context_audit"."event" = 'facts_confirmed' AND jsonb_array_length("brand_context_audit"."fact_ids") > 0) OR ("brand_context_audit"."event" <> 'facts_confirmed' AND "brand_context_audit"."fact_ids" = '[]'::jsonb)))
);
--> statement-breakpoint
CREATE TABLE "brand_context_revisions" (
	"context_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"schema_version" integer NOT NULL,
	"context_json" jsonb NOT NULL,
	"digest" text NOT NULL,
	CONSTRAINT "brand_context_revisions_context_id_revision_pk" PRIMARY KEY("context_id","revision"),
	CONSTRAINT "brand_revision_shape" CHECK ("brand_context_revisions"."revision" > 0 AND "brand_context_revisions"."schema_version" = 1 AND jsonb_typeof("brand_context_revisions"."context_json") = 'object' AND octet_length("brand_context_revisions"."context_json"::text) <= 1048576 AND "brand_context_revisions"."context_json"->>'contextId' = "brand_context_revisions"."context_id"::text AND "brand_context_revisions"."context_json"->>'projectId' = "brand_context_revisions"."project_id"::text AND "brand_context_revisions"."context_json"->>'revision' = "brand_context_revisions"."revision"::text AND "brand_context_revisions"."context_json"->>'schemaVersion' = '1' AND "brand_context_revisions"."context_json" ?& ARRAY['contextId','projectId','revision','schemaVersion'] AND "brand_context_revisions"."digest" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "brand_contexts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"current_revision" integer NOT NULL,
	CONSTRAINT "brand_context_revision_positive" CHECK ("brand_contexts"."current_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "brand_projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citywalk_brand_project_campaigns" (
	"project_id" uuid NOT NULL,
	"campaign_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	CONSTRAINT "citywalk_brand_project_campaigns_project_id_campaign_id_pk" PRIMARY KEY("project_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE "citywalk_brand_projects" (
	"project_id" uuid NOT NULL,
	"city_id" integer NOT NULL,
	CONSTRAINT "citywalk_brand_projects_project_id_city_id_pk" PRIMARY KEY("project_id","city_id")
);
--> statement-breakpoint
CREATE TABLE "citywalk_brand_reviewers" (
	"actor_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "brand_context_owner_unique" ON "brand_contexts" USING btree ("id","project_id");--> statement-breakpoint
ALTER TABLE "brand_context_audit" ADD CONSTRAINT "brand_audit_revision_fk" FOREIGN KEY ("context_id","revision") REFERENCES "public"."brand_context_revisions"("context_id","revision") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_context_revisions" ADD CONSTRAINT "brand_revision_context_owner_fk" FOREIGN KEY ("context_id","project_id") REFERENCES "public"."brand_contexts"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_contexts" ADD CONSTRAINT "brand_contexts_project_id_brand_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."brand_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citywalk_brand_project_campaigns" ADD CONSTRAINT "citywalk_brand_campaign_scope_fk" FOREIGN KEY ("project_id","city_id") REFERENCES "public"."citywalk_brand_projects"("project_id","city_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citywalk_brand_project_campaigns" ADD CONSTRAINT "citywalk_brand_campaign_owner_fk" FOREIGN KEY ("campaign_id","city_id") REFERENCES "public"."marketing_campaigns"("id","city_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citywalk_brand_projects" ADD CONSTRAINT "citywalk_brand_projects_project_id_brand_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."brand_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citywalk_brand_projects" ADD CONSTRAINT "citywalk_brand_projects_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citywalk_brand_reviewers" ADD CONSTRAINT "citywalk_brand_reviewers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_audit_actor_idx" ON "brand_context_audit" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_context_project_idx" ON "brand_contexts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "citywalk_brand_campaign_idx" ON "citywalk_brand_project_campaigns" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "citywalk_brand_reviewer_user_unique" ON "citywalk_brand_reviewers" USING btree ("user_id");
-- Handwritten integrity/retention policy. No changes to generation migration 0024.
--> statement-breakpoint
ALTER TABLE brand_contexts ADD CONSTRAINT brand_current_revision_fk
FOREIGN KEY (id,current_revision) REFERENCES brand_context_revisions(context_id,revision)
DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE FUNCTION brand_context_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Brand revision history is append-only' USING ERRCODE='23514';
  END IF;
  IF (TG_TABLE_NAME = 'brand_context_revisions' AND EXISTS (SELECT 1 FROM brand_contexts WHERE id=OLD.context_id))
     OR (TG_TABLE_NAME = 'brand_context_audit' AND EXISTS (SELECT 1 FROM brand_context_revisions WHERE context_id=OLD.context_id AND revision=OLD.revision)) THEN
    RAISE EXCEPTION 'Erase through the owning project' USING ERRCODE='23514';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER brand_revision_history_guard BEFORE UPDATE OR DELETE ON brand_context_revisions FOR EACH ROW EXECUTE FUNCTION brand_context_history_guard();
--> statement-breakpoint
CREATE TRIGGER brand_audit_history_guard BEFORE UPDATE OR DELETE ON brand_context_audit FOR EACH ROW EXECUTE FUNCTION brand_context_history_guard();
--> statement-breakpoint
CREATE FUNCTION brand_context_owner_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM brand_projects WHERE id=OLD.project_id) THEN
      RAISE EXCEPTION 'Erase through the owning project' USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.id <> OLD.id OR NEW.project_id <> OLD.project_id OR NEW.current_revision <> OLD.current_revision+1 THEN
    RAISE EXCEPTION 'Invalid context revision transition' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER brand_context_owner_guard BEFORE UPDATE OR DELETE ON brand_contexts FOR EACH ROW EXECUTE FUNCTION brand_context_owner_guard();
--> statement-breakpoint
CREATE FUNCTION brand_revision_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.revision <> (SELECT current_revision FROM brand_contexts WHERE id=NEW.context_id)
    OR (NEW.revision <> 1 AND NOT EXISTS (SELECT 1 FROM brand_context_revisions WHERE context_id=NEW.context_id AND revision=NEW.revision-1)) THEN
    RAISE EXCEPTION 'Invalid history sequence' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER brand_revision_insert_guard BEFORE INSERT ON brand_context_revisions FOR EACH ROW EXECUTE FUNCTION brand_revision_insert_guard();
--> statement-breakpoint
CREATE FUNCTION brand_revision_audit_required() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM brand_context_revisions WHERE context_id=NEW.context_id AND revision=NEW.revision)
    AND NOT EXISTS (SELECT 1 FROM brand_context_audit WHERE context_id=NEW.context_id AND revision=NEW.revision) THEN
    RAISE EXCEPTION 'Revision requires an audit event' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER brand_revision_audit_required AFTER INSERT ON brand_context_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION brand_revision_audit_required();
--> statement-breakpoint
CREATE FUNCTION citywalk_brand_binding_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR EXISTS (SELECT 1 FROM brand_projects WHERE id=OLD.project_id) THEN
    RAISE EXCEPTION 'Durable project scope may only be erased with its project' USING ERRCODE='23514';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER citywalk_brand_scope_guard BEFORE UPDATE OR DELETE ON citywalk_brand_projects FOR EACH ROW EXECUTE FUNCTION citywalk_brand_binding_guard();
--> statement-breakpoint
CREATE FUNCTION brand_history_no_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Erase projects explicitly; history truncation is not allowed' USING ERRCODE='23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER brand_history_no_truncate BEFORE TRUNCATE ON brand_context_revisions FOR EACH STATEMENT EXECUTE FUNCTION brand_history_no_truncate();
--> statement-breakpoint
CREATE TRIGGER brand_audit_no_truncate BEFORE TRUNCATE ON brand_context_audit FOR EACH STATEMENT EXECUTE FUNCTION brand_history_no_truncate();
--> statement-breakpoint
ALTER TABLE brand_context_revisions ADD CONSTRAINT brand_revision_json_types CHECK (
  jsonb_typeof(context_json->'contextId') = 'string'
  AND jsonb_typeof(context_json->'projectId') = 'string'
  AND jsonb_typeof(context_json->'revision') = 'number'
  AND jsonb_typeof(context_json->'schemaVersion') = 'number'
);
--> statement-breakpoint
CREATE FUNCTION citywalk_brand_reviewer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.actor_id <> OLD.actor_id OR (NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Reviewer identity may only be unlinked, never reassigned' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER citywalk_brand_reviewer_guard BEFORE UPDATE ON citywalk_brand_reviewers FOR EACH ROW EXECUTE FUNCTION citywalk_brand_reviewer_guard();
