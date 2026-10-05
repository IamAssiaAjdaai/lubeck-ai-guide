CREATE TYPE "public"."commerce_subscription_status" AS ENUM('active', 'grace_period', 'billing_issue', 'paused', 'canceled', 'expired', 'revoked');
--> statement-breakpoint
CREATE TABLE "commerce_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"product_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"provider_product_id" text NOT NULL,
	"store" text NOT NULL,
	"environment" text NOT NULL,
	"original_transaction_id" text,
	"status" "commerce_subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_ends_at" timestamp with time zone,
	"will_renew" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ALTER COLUMN "source_order_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD COLUMN "source_subscription_id" text;
--> statement-breakpoint
ALTER TABLE "commerce_subscriptions" ADD CONSTRAINT "commerce_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "commerce_subscriptions" ADD CONSTRAINT "commerce_subscriptions_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_source_subscription_id_commerce_subscriptions_id_fk" FOREIGN KEY ("source_subscription_id") REFERENCES "public"."commerce_subscriptions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_exactly_one_source" CHECK ((("source_order_id" IS NOT NULL AND "source_subscription_id" IS NULL) OR ("source_order_id" IS NULL AND "source_subscription_id" IS NOT NULL)));
--> statement-breakpoint
CREATE INDEX "commerce_subscriptions_user_status_period_idx" ON "commerce_subscriptions" USING btree ("user_id","status","current_period_ends_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_subscriptions_provider_subscription_unique" ON "commerce_subscriptions" USING btree ("provider","provider_subscription_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_subscriptions_provider_original_unique" ON "commerce_subscriptions" USING btree ("provider","store","original_transaction_id");
--> statement-breakpoint
CREATE INDEX "commerce_entitlements_source_subscription_idx" ON "commerce_entitlements" USING btree ("source_subscription_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_entitlements_subscription_scope_unique" ON "commerce_entitlements" USING btree ("user_id","source_subscription_id","scope_type","scope_key");