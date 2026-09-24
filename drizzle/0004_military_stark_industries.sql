ALTER TYPE "public"."publication_status" ADD VALUE 'in_review' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "public"."publication_status" ADD VALUE 'approved' BEFORE 'published';--> statement-breakpoint
CREATE TABLE "content_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"publisher" text NOT NULL,
	"title" text NOT NULL,
	"canonical_url" text NOT NULL,
	"verified_at" date NOT NULL,
	"valid_until" date,
	"notes" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_workflow_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"from_status" "publication_status" NOT NULL,
	"to_status" "publication_status" NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_sources" (
	"place_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_sources_place_id_source_id_pk" PRIMARY KEY("place_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_sources_canonical_url_unique" ON "content_sources" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "content_workflow_events_entity_idx" ON "content_workflow_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "place_sources_source_id_idx" ON "place_sources" USING btree ("source_id");