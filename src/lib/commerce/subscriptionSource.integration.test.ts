import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { user } from "@/db/authSchema";
import { closeDb, getDb } from "@/db/client";
import {
  commerceEntitlements,
  commerceOrders,
  commerceProducts,
  commerceSubscriptions,
} from "@/db/commerceSchema";
import { hasActiveEntitlement } from "@/lib/commerce/entitlements.server";

const runIntegration = process.env.COMMERCE_DB_INTEGRATION === "1";

describe.skipIf(!runIntegration)(
  "subscription-backed entitlement PostgreSQL integration",
  () => {
    const suffix = randomUUID().slice(0, 8);
    const userId = `commerce-subscription-user-${suffix}`;
    const subscriptionId = `commerce-subscription-${suffix}`;
    const orderId = `commerce-order-${suffix}`;
    let productId = 0;

    beforeAll(async () => {
      const db = getDb();
      await db.insert(user).values({
        id: userId,
        name: "Subscription entitlement integration",
        email: `${userId}@example.invalid`,
        emailVerified: true,
      });
      const [product] = await db
        .insert(commerceProducts)
        .values({
          slug: `premium-subscription-${suffix}`,
          name: "CITYWALK Premium",
          kind: "feature_bundle",
          active: false,
        })
        .returning({ id: commerceProducts.id });
      productId = product!.id;

      await db.insert(commerceSubscriptions).values({
        id: subscriptionId,
        userId,
        productId,
        provider: "revenuecat",
        providerSubscriptionId: `rc-sub-${suffix}`,
        providerProductId: "com.citywalk.premium.monthly",
        store: "app_store",
        environment: "sandbox",
        originalTransactionId: `apple-original-${suffix}`,
        status: "active",
        currentPeriodEndsAt: new Date("2099-01-01T00:00:00Z"),
        willRenew: true,
      });

      await db.insert(commerceOrders).values({
        id: orderId,
        userId,
        productId,
        provider: "apple_sandbox",
        providerPaymentIntentId: `legacy-native-${suffix}`,
        status: "paid",
        paidAt: new Date(),
      });
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(commerceEntitlements)
        .where(eq(commerceEntitlements.userId, userId));
      await db
        .delete(commerceSubscriptions)
        .where(eq(commerceSubscriptions.id, subscriptionId));
      await db.delete(commerceOrders).where(eq(commerceOrders.id, orderId));
      await db.delete(commerceProducts).where(eq(commerceProducts.id, productId));
      await db.delete(user).where(eq(user.id, userId));
      await closeDb();
    });

    it("authorizes a subscription-backed global Premium entitlement", async () => {
      await getDb().insert(commerceEntitlements).values({
        userId,
        productId,
        sourceSubscriptionId: subscriptionId,
        scopeType: "feature",
        scopeKey: "premium",
        status: "active",
        expiresAt: new Date("2099-01-01T00:00:00Z"),
      });

      await expect(
        hasActiveEntitlement({
          userId,
          scopeType: "feature",
          scopeKey: "premium",
          now: new Date("2030-01-01T00:00:00Z"),
        }),
      ).resolves.toBe(true);
    });

    it("rejects an entitlement with no trusted source", async () => {
      await expect(
        getDb().insert(commerceEntitlements).values({
          userId,
          productId,
          scopeType: "feature",
          scopeKey: `missing-source-${suffix}`,
          status: "active",
        }),
      ).rejects.toThrow();
    });

    it("rejects an entitlement backed by both an order and a subscription", async () => {
      await expect(
        getDb().insert(commerceEntitlements).values({
          userId,
          productId,
          sourceOrderId: orderId,
          sourceSubscriptionId: subscriptionId,
          scopeType: "feature",
          scopeKey: `double-source-${suffix}`,
          status: "active",
        }),
      ).rejects.toThrow();
    });

    it("preserves an existing order-backed entitlement", async () => {
      await getDb().insert(commerceEntitlements).values({
        userId,
        productId,
        sourceOrderId: orderId,
        scopeType: "city",
        scopeKey: `legacy-city-${suffix}`,
        status: "active",
      });

      await expect(
        hasActiveEntitlement({
          userId,
          scopeType: "city",
          scopeKey: `legacy-city-${suffix}`,
        }),
      ).resolves.toBe(true);
    });
  },
);
