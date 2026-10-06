CREATE TABLE "external_account_erasure_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"external_customer_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "external_account_erasure_jobs_provider_customer_unique" ON "external_account_erasure_jobs" USING btree ("provider","external_customer_id");
--> statement-breakpoint
CREATE INDEX "external_account_erasure_jobs_pending_idx" ON "external_account_erasure_jobs" USING btree ("completed_at","next_attempt_at");
