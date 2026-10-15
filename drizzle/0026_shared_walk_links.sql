CREATE TABLE IF NOT EXISTS "shared_walk_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "city_slug" text NOT NULL,
  "route" jsonb NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "shared_walk_links_route_object_chk" CHECK (jsonb_typeof("route") = 'object')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_walk_links_owner_idx" ON "shared_walk_links" ("owner_id");
