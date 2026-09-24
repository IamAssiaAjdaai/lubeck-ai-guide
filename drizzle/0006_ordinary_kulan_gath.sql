CREATE TABLE "audio_generation_metadata" (
	"media_asset_id" integer PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"voice_id" text,
	"source_locale" text NOT NULL,
	"source_field" text NOT NULL,
	"source_text_hash" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audio_generation_metadata" ADD CONSTRAINT "audio_generation_metadata_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audio_generation_metadata_source_idx" ON "audio_generation_metadata" USING btree ("source_locale","source_text_hash");