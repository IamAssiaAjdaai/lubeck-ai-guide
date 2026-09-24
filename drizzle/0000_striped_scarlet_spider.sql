CREATE TYPE "public"."place_category" AS ENUM('see', 'eat', 'fun');--> statement-breakpoint
CREATE TYPE "public"."place_environment" AS ENUM('indoor', 'outdoor', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."place_pricing" AS ENUM('free', 'paid', 'mixed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."place_status" AS ENUM('open', 'closed', 'renovation', 'seasonal', 'unknown');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"slug" text NOT NULL,
	"category" "place_category" NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"duration_minutes" integer NOT NULL,
	"environment" "place_environment" NOT NULL,
	"pricing" "place_pricing" NOT NULL,
	"status" "place_status",
	"status_verified_at" date,
	"image" text,
	"tags" text[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "places_city_slug_unique" ON "places" USING btree ("city_id","slug");