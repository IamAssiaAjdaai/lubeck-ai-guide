CREATE TYPE "public"."external_video_provider" AS ENUM('youtube', 'vimeo');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'audio', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."media_lifecycle" AS ENUM('uploading', 'pending_review', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."media_purpose" AS ENUM('hero', 'card', 'gallery', 'thumbnail', 'audio', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."media_source_type" AS ENUM('upload', 'external');--> statement-breakpoint
CREATE TABLE "city_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_asset_id" integer NOT NULL,
	"purpose" "media_purpose" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"locale" text DEFAULT '' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"city_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_key" uuid NOT NULL,
	"city_id" integer NOT NULL,
	"kind" "media_kind" NOT NULL,
	"source_type" "media_source_type" NOT NULL,
	"storage_provider" text,
	"object_key" text,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"expected_size_bytes" integer,
	"checksum_sha256" text,
	"width" integer,
	"height" integer,
	"duration_seconds" double precision,
	"locale" text,
	"approval_status" "media_lifecycle" DEFAULT 'uploading' NOT NULL,
	"external_video_provider" "external_video_provider",
	"external_video_id" text,
	"canonical_url" text,
	"archived_at" timestamp with time zone,
	"upload_expires_at" timestamp with time zone,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_asset_key_unique" UNIQUE("asset_key"),
	CONSTRAINT "media_assets_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "place_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_asset_id" integer NOT NULL,
	"purpose" "media_purpose" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"locale" text DEFAULT '' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"place_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_asset_id" integer NOT NULL,
	"purpose" "media_purpose" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"locale" text DEFAULT '' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tour_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "city_media" ADD CONSTRAINT "city_media_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_media" ADD CONSTRAINT "city_media_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_media" ADD CONSTRAINT "place_media_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_media" ADD CONSTRAINT "place_media_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_media" ADD CONSTRAINT "tour_media_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_media" ADD CONSTRAINT "tour_media_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "city_media_slot_unique" ON "city_media" USING btree ("city_id","purpose","locale","position");--> statement-breakpoint
CREATE INDEX "city_media_asset_id_idx" ON "city_media" USING btree ("media_asset_id");--> statement-breakpoint
CREATE INDEX "media_assets_city_id_idx" ON "media_assets" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "media_assets_kind_status_idx" ON "media_assets" USING btree ("kind","approval_status");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "place_media_slot_unique" ON "place_media" USING btree ("place_id","purpose","locale","position");--> statement-breakpoint
CREATE INDEX "place_media_asset_id_idx" ON "place_media" USING btree ("media_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_media_slot_unique" ON "tour_media" USING btree ("tour_id","purpose","locale","position");--> statement-breakpoint
CREATE INDEX "tour_media_asset_id_idx" ON "tour_media" USING btree ("media_asset_id");