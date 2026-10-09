CREATE TABLE "marketing_content_media" (
  "id" serial PRIMARY KEY NOT NULL,
  "content_id" integer NOT NULL,
  "media_asset_id" integer NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "marketing_content_media"
ADD CONSTRAINT "marketing_content_media_content_id_marketing_content_id_fk"
FOREIGN KEY ("content_id")
REFERENCES "public"."marketing_content"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "marketing_content_media"
ADD CONSTRAINT "marketing_content_media_media_asset_id_media_assets_id_fk"
FOREIGN KEY ("media_asset_id")
REFERENCES "public"."media_assets"("id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "marketing_content_media_position_unique"
ON "marketing_content_media" USING btree ("content_id","position");
--> statement-breakpoint

CREATE UNIQUE INDEX "marketing_content_media_asset_unique"
ON "marketing_content_media" USING btree ("content_id","media_asset_id");
--> statement-breakpoint

CREATE INDEX "marketing_content_media_asset_idx"
ON "marketing_content_media" USING btree ("media_asset_id");