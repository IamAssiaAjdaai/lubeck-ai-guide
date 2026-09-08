CREATE TYPE "public"."media_access_level" AS ENUM('public', 'premium');--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "access_level" "media_access_level" DEFAULT 'public' NOT NULL;