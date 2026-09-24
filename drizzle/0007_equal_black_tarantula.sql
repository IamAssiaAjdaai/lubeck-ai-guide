CREATE TABLE "verified_knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verified_knowledge_chunks" ADD CONSTRAINT "verified_knowledge_chunks_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_knowledge_chunks" ADD CONSTRAINT "verified_knowledge_chunks_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verified_knowledge_chunks_place_locale_active_idx" ON "verified_knowledge_chunks" USING btree ("place_id","locale","is_active");--> statement-breakpoint
CREATE INDEX "verified_knowledge_chunks_source_id_idx" ON "verified_knowledge_chunks" USING btree ("source_id");