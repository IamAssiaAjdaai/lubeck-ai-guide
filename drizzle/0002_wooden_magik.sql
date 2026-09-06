CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "city_localizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "place_content_tags" (
	"place_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "place_content_tags_place_id_tag_id_pk" PRIMARY KEY("place_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "place_localizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text NOT NULL,
	"description" text,
	"story" text,
	"visit_notes" text,
	"facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_localizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tour_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text,
	"description" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_stops" (
	"tour_id" integer NOT NULL,
	"place_id" integer NOT NULL,
	"position" integer NOT NULL,
	"visit_duration_minutes" integer,
	CONSTRAINT "tour_stops_tour_id_position_pk" PRIMARY KEY("tour_id","position")
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"slug" text NOT NULL,
	"publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
	"estimated_duration_minutes" integer,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "publication_status" "publication_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "updated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "visit_note_verified_at" date;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "visit_note_valid_until" date;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "publication_status" "publication_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "updated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "city_localizations" ADD CONSTRAINT "city_localizations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_content_tags" ADD CONSTRAINT "place_content_tags_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_content_tags" ADD CONSTRAINT "place_content_tags_tag_id_content_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."content_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_localizations" ADD CONSTRAINT "place_localizations_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_localizations" ADD CONSTRAINT "tour_localizations_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_stops" ADD CONSTRAINT "tour_stops_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_stops" ADD CONSTRAINT "tour_stops_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "city_localizations_city_locale_unique" ON "city_localizations" USING btree ("city_id","locale");--> statement-breakpoint
CREATE INDEX "place_content_tags_tag_id_idx" ON "place_content_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "place_localizations_place_locale_unique" ON "place_localizations" USING btree ("place_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_localizations_tour_locale_unique" ON "tour_localizations" USING btree ("tour_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_stops_tour_place_unique" ON "tour_stops" USING btree ("tour_id","place_id");--> statement-breakpoint
CREATE INDEX "tour_stops_place_id_idx" ON "tour_stops" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tours_city_slug_unique" ON "tours" USING btree ("city_id","slug");