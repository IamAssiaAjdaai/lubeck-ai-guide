CREATE TYPE "public"."commerce_entitlement_scope" AS ENUM('city', 'feature');--> statement-breakpoint
CREATE TYPE "public"."commerce_entitlement_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."commerce_order_status" AS ENUM('pending', 'paid', 'partially_refunded', 'refunded', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."commerce_product_kind" AS ENUM('city_pass', 'feature_bundle');--> statement-breakpoint
CREATE TYPE "public"."commerce_provider_event_outcome" AS ENUM('processed', 'ignored');--> statement-breakpoint
CREATE TABLE "commerce_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" integer NOT NULL,
	"source_order_id" text NOT NULL,
	"scope_type" "commerce_entitlement_scope" NOT NULL,
	"scope_key" text NOT NULL,
	"status" "commerce_entitlement_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"product_id" integer NOT NULL,
	"price_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_checkout_session_id" text,
	"provider_payment_intent_id" text,
	"status" "commerce_order_status" DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"amount_total" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_price_id" text NOT NULL,
	"currency" text NOT NULL,
	"unit_amount" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_product_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"scope_type" "commerce_entitlement_scope" NOT NULL,
	"scope_key" text NOT NULL,
	"duration_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "commerce_product_kind" NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_provider_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"outcome" "commerce_provider_event_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_customers" ADD CONSTRAINT "commerce_customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_source_order_id_commerce_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_price_id_commerce_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."commerce_prices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_prices" ADD CONSTRAINT "commerce_prices_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_product_grants" ADD CONSTRAINT "commerce_product_grants_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_customers_user_provider_unique" ON "commerce_customers" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_customers_provider_customer_unique" ON "commerce_customers" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE INDEX "commerce_entitlements_user_scope_idx" ON "commerce_entitlements" USING btree ("user_id","scope_type","scope_key","status");--> statement-breakpoint
CREATE INDEX "commerce_entitlements_source_order_idx" ON "commerce_entitlements" USING btree ("source_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_entitlements_order_scope_unique" ON "commerce_entitlements" USING btree ("user_id","source_order_id","scope_type","scope_key");--> statement-breakpoint
CREATE INDEX "commerce_orders_user_id_idx" ON "commerce_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "commerce_orders_status_idx" ON "commerce_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_checkout_session_unique" ON "commerce_orders" USING btree ("provider","provider_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_payment_intent_unique" ON "commerce_orders" USING btree ("provider","provider_payment_intent_id");--> statement-breakpoint
CREATE INDEX "commerce_prices_product_id_idx" ON "commerce_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "commerce_prices_active_idx" ON "commerce_prices" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_prices_provider_price_unique" ON "commerce_prices" USING btree ("provider","provider_price_id");--> statement-breakpoint
CREATE INDEX "commerce_product_grants_product_id_idx" ON "commerce_product_grants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_product_grants_scope_unique" ON "commerce_product_grants" USING btree ("product_id","scope_type","scope_key");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_products_slug_unique" ON "commerce_products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_provider_events_provider_event_unique" ON "commerce_provider_events" USING btree ("provider","provider_event_id");