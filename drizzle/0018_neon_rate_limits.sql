CREATE TABLE "rate_limit_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rate_limit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scope" text NOT NULL,
	"identifier_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_events_scope_identifier_created_idx" ON "rate_limit_events" USING btree ("scope","identifier_hash","created_at");--> statement-breakpoint
CREATE INDEX "rate_limit_events_created_at_idx" ON "rate_limit_events" USING btree ("created_at");