CREATE TYPE "public"."city_premium_readiness_status" AS ENUM('not_required', 'pending', 'ready');--> statement-breakpoint
CREATE TYPE "public"."city_quality_gate_status" AS ENUM('pending', 'passed', 'failed');--> statement-breakpoint
CREATE TABLE "city_launch_readiness" (
	"city_id" integer PRIMARY KEY NOT NULL,
	"target_place_count" integer NOT NULL,
	"required_content_locales" text[] NOT NULL,
	"reviewed_content_locales" text[] NOT NULL,
	"required_audio_locales" text[] NOT NULL,
	"audio_target_place_count" integer NOT NULL,
	"minimum_verified_ai_place_count" integer NOT NULL,
	"web_qa_status" "city_quality_gate_status" DEFAULT 'pending' NOT NULL,
	"native_qa_status" "city_quality_gate_status" DEFAULT 'pending' NOT NULL,
	"traveler_qa_status" "city_quality_gate_status" DEFAULT 'pending' NOT NULL,
	"premium_content_status" "city_premium_readiness_status" DEFAULT 'not_required' NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "city_launch_readiness" ADD CONSTRAINT "city_launch_readiness_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;