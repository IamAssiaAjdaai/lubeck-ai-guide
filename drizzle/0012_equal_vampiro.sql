CREATE TABLE "city_sources" (
	"city_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "city_sources_city_id_source_id_pk" PRIMARY KEY("city_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "city_localizations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "city_sources" ADD CONSTRAINT "city_sources_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_sources" ADD CONSTRAINT "city_sources_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_sources_source_id_idx" ON "city_sources" USING btree ("source_id");