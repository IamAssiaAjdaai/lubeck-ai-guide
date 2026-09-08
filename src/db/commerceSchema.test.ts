import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  commerceCustomers,
  commerceEntitlements,
  commerceOrderStatusEnum,
  commerceOrders,
  commercePrices,
  commerceProductGrants,
  commerceProducts,
  commerceProviderEvents,
} from "@/db/commerceSchema";

describe("commerce database schema", () => {
  it("models products, prices, orders, provider events and entitlements", () => {
    expect(
      [
        commerceProducts,
        commercePrices,
        commerceProductGrants,
        commerceCustomers,
        commerceOrders,
        commerceProviderEvents,
        commerceEntitlements,
      ].map((table) => getTableConfig(table).name),
    ).toEqual([
      "commerce_products",
      "commerce_prices",
      "commerce_product_grants",
      "commerce_customers",
      "commerce_orders",
      "commerce_provider_events",
      "commerce_entitlements",
    ]);
  });

  it("supports explicit payment lifecycle states", () => {
    expect(commerceOrderStatusEnum.enumValues).toEqual([
      "pending",
      "paid",
      "partially_refunded",
      "refunded",
      "canceled",
      "failed",
    ]);
  });

  it("enforces provider-event idempotency and one entitlement per order scope", () => {
    const providerEvents = getTableConfig(commerceProviderEvents);
    const entitlements = getTableConfig(commerceEntitlements);

    expect(
      providerEvents.indexes.some(
        (index) =>
          index.config.name ===
            "commerce_provider_events_provider_event_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
    expect(
      entitlements.indexes.some(
        (index) =>
          index.config.name === "commerce_entitlements_order_scope_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
  });

  it("stores no raw card or location columns", () => {
    const columnNames = [
      commerceCustomers,
      commerceOrders,
      commerceProviderEvents,
      commerceEntitlements,
    ].flatMap((table) =>
      getTableConfig(table).columns.map((column) => column.name),
    );

    expect(columnNames).not.toContain("card_number");
    expect(columnNames).not.toContain("cvc");
    expect(columnNames).not.toContain("latitude");
    expect(columnNames).not.toContain("longitude");
  });
});
