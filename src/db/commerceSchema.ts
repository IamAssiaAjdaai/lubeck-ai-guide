import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/db/authSchema";

function createTimestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

export const commerceProductKindEnum = pgEnum("commerce_product_kind", [
  "city_pass",
  "feature_bundle",
]);

export const commerceOrderStatusEnum = pgEnum("commerce_order_status", [
  "pending",
  "paid",
  "partially_refunded",
  "refunded",
  "canceled",
  "failed",
]);

export const commerceEntitlementScopeEnum = pgEnum(
  "commerce_entitlement_scope",
  ["city", "feature"],
);

export const commerceEntitlementStatusEnum = pgEnum(
  "commerce_entitlement_status",
  ["active", "revoked", "expired"],
);

export const commerceProviderEventOutcomeEnum = pgEnum(
  "commerce_provider_event_outcome",
  ["processed", "ignored"],
);

export const commerceProducts = pgTable(
  "commerce_products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    kind: commerceProductKindEnum("kind").notNull(),
    active: boolean("active").default(false).notNull(),
    ...createTimestamps(),
  },
  (table) => [uniqueIndex("commerce_products_slug_unique").on(table.slug)],
);

export const commercePrices = pgTable(
  "commerce_prices",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => commerceProducts.id, { onDelete: "cascade" }),
    provider: text("provider").default("stripe").notNull(),
    providerPriceId: text("provider_price_id").notNull(),
    currency: text("currency").notNull(),
    unitAmount: integer("unit_amount").notNull(),
    active: boolean("active").default(false).notNull(),
    ...createTimestamps(),
  },
  (table) => [
    index("commerce_prices_product_id_idx").on(table.productId),
    index("commerce_prices_active_idx").on(table.active),
    uniqueIndex("commerce_prices_provider_price_unique").on(
      table.provider,
      table.providerPriceId,
    ),
  ],
);

export const commerceProductGrants = pgTable(
  "commerce_product_grants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => commerceProducts.id, { onDelete: "cascade" }),
    scopeType: commerceEntitlementScopeEnum("scope_type").notNull(),
    scopeKey: text("scope_key").notNull(),
    durationDays: integer("duration_days"),
    ...createTimestamps(),
  },
  (table) => [
    index("commerce_product_grants_product_id_idx").on(table.productId),
    uniqueIndex("commerce_product_grants_scope_unique").on(
      table.productId,
      table.scopeType,
      table.scopeKey,
    ),
  ],
);

export const commerceCustomers = pgTable(
  "commerce_customers",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    ...createTimestamps(),
  },
  (table) => [
    uniqueIndex("commerce_customers_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    uniqueIndex("commerce_customers_provider_customer_unique").on(
      table.provider,
      table.providerCustomerId,
    ),
  ],
);

export const commerceOrders = pgTable(
  "commerce_orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    productId: integer("product_id")
      .notNull()
      .references(() => commerceProducts.id, { onDelete: "restrict" }),
    priceId: integer("price_id")
      .notNull()
      .references(() => commercePrices.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerCheckoutSessionId: text("provider_checkout_session_id"),
    providerPaymentIntentId: text("provider_payment_intent_id"),
    status: commerceOrderStatusEnum("status").default("pending").notNull(),
    currency: text("currency").notNull(),
    amountTotal: integer("amount_total").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    ...createTimestamps(),
  },
  (table) => [
    index("commerce_orders_user_id_idx").on(table.userId),
    index("commerce_orders_status_idx").on(table.status),
    uniqueIndex("commerce_orders_checkout_session_unique").on(
      table.provider,
      table.providerCheckoutSessionId,
    ),
    uniqueIndex("commerce_orders_payment_intent_unique").on(
      table.provider,
      table.providerPaymentIntentId,
    ),
  ],
);

export const commerceProviderEvents = pgTable(
  "commerce_provider_events",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    outcome: commerceProviderEventOutcomeEnum("outcome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("commerce_provider_events_provider_event_unique").on(
      table.provider,
      table.providerEventId,
    ),
  ],
);

export const commerceEntitlements = pgTable(
  "commerce_entitlements",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => commerceProducts.id, { onDelete: "restrict" }),
    sourceOrderId: text("source_order_id")
      .notNull()
      .references(() => commerceOrders.id, { onDelete: "restrict" }),
    scopeType: commerceEntitlementScopeEnum("scope_type").notNull(),
    scopeKey: text("scope_key").notNull(),
    status: commerceEntitlementStatusEnum("status")
      .default("active")
      .notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
    ...createTimestamps(),
  },
  (table) => [
    index("commerce_entitlements_user_scope_idx").on(
      table.userId,
      table.scopeType,
      table.scopeKey,
      table.status,
    ),
    index("commerce_entitlements_source_order_idx").on(table.sourceOrderId),
    uniqueIndex("commerce_entitlements_order_scope_unique").on(
      table.userId,
      table.sourceOrderId,
      table.scopeType,
      table.scopeKey,
    ),
  ],
);

export type CommerceProductRow = typeof commerceProducts.$inferSelect;
export type CommercePriceRow = typeof commercePrices.$inferSelect;
export type CommerceOrderRow = typeof commerceOrders.$inferSelect;
export type CommerceEntitlementRow = typeof commerceEntitlements.$inferSelect;
