CREATE TABLE "account_saved_walks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"city_slug" text NOT NULL,
	"fingerprint" text NOT NULL,
	"route" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_saved_walks" ADD CONSTRAINT "account_saved_walks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_saved_walks_user_route_unique" ON "account_saved_walks" USING btree ("user_id","fingerprint");