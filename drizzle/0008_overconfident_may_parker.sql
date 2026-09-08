CREATE TABLE "traveler_guest_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "traveler_guest_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"session_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traveler_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traveler_guest_links" ADD CONSTRAINT "traveler_guest_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traveler_profiles" ADD CONSTRAINT "traveler_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "traveler_guest_links_user_id_idx" ON "traveler_guest_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "traveler_guest_links_visitor_id_unique" ON "traveler_guest_links" USING btree ("visitor_id");