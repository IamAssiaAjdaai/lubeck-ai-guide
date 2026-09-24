CREATE TYPE "public"."media_rights_basis" AS ENUM('owned', 'commissioned', 'licensed', 'creative_commons', 'public_domain', 'partner_supplied', 'other');--> statement-breakpoint
CREATE TABLE "media_asset_rights" (
	"media_asset_id" integer PRIMARY KEY NOT NULL,
	"rights_basis" "media_rights_basis" NOT NULL,
	"creator" text,
	"rights_holder" text,
	"attribution_required" boolean DEFAULT false NOT NULL,
	"attribution_text" text,
	"evidence_reference" text,
	"rights_notes" text,
	"verified_at" timestamp with time zone,
	"verified_by_user_id" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_asset_rights" ADD CONSTRAINT "media_asset_rights_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;