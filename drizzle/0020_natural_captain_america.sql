CREATE TYPE "public"."marketing_campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."marketing_content_status" AS ENUM('idea', 'draft', 'in_review', 'approved', 'ready', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."marketing_page_kind" AS ENUM('landing', 'blog');--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"objective" text NOT NULL,
	"audience" text NOT NULL,
	"message" text NOT NULL,
	"cta" text NOT NULL,
	"status" "marketing_campaign_status" DEFAULT 'draft' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"campaign_id" integer,
	"page_id" integer,
	"content_code" text NOT NULL,
	"platform" text NOT NULL,
	"format" text NOT NULL,
	"hook" text NOT NULL,
	"script" text,
	"caption" text,
	"cta" text,
	"status" "marketing_content_status" DEFAULT 'idea' NOT NULL,
	"published_url" text,
	"published_at" timestamp with time zone,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"campaign_id" integer,
	"kind" "marketing_page_kind" NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"cta" text,
	"publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content" ADD CONSTRAINT "marketing_content_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content" ADD CONSTRAINT "marketing_content_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content" ADD CONSTRAINT "marketing_content_page_id_marketing_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."marketing_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_pages" ADD CONSTRAINT "marketing_pages_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_pages" ADD CONSTRAINT "marketing_pages_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_campaigns_city_slug_unique" ON "marketing_campaigns" USING btree ("city_id","slug");--> statement-breakpoint
CREATE INDEX "marketing_campaigns_city_status_idx" ON "marketing_campaigns" USING btree ("city_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_content_code_unique" ON "marketing_content" USING btree ("content_code");--> statement-breakpoint
CREATE INDEX "marketing_content_city_status_idx" ON "marketing_content" USING btree ("city_id","status");--> statement-breakpoint
CREATE INDEX "marketing_content_campaign_idx" ON "marketing_content" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "marketing_content_page_idx" ON "marketing_content" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_pages_path_unique" ON "marketing_pages" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_pages_city_kind_slug_unique" ON "marketing_pages" USING btree ("city_id","kind","slug");--> statement-breakpoint
CREATE INDEX "marketing_pages_city_publication_idx" ON "marketing_pages" USING btree ("city_id","publication_status");--> statement-breakpoint
CREATE INDEX "marketing_pages_campaign_idx" ON "marketing_pages" USING btree ("campaign_id");