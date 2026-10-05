import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { user } from "@/db/authSchema";
import { closeDb, getDb } from "@/db/client";
import {
  commerceEntitlements,
  commerceProductGrants,
  commerceProducts,
  commerceProviderEvents,
  commerceSubscriptions,
} from "@/db/commerceSchema";
import {
  processRevenueCatWebhookEvent,
  type RevenueCatWebhookEnvelope,
} from "@/lib/commerce/revenueCatWebhook.server";

const runIntegration = process.env.COMMERCE_DB_INTEGRATION === "1";
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!runIntegration)("RevenueCat PostgreSQL reconciliation", () => {
  const suffix = randomUUID().slice(0, 8);
  const userId = `revenuecat-user-${suffix}`;
  const deletedUserId = `revenuecat-deleted-${suffix}`;
  let productId = 0;

  function envelope(input: {
    id: string;
    type: string;
    eventAt: number;
    userId?: string;
    productId?: string;
    originalTransactionId?: string;
    expirationAt?: number;
    cancelReason?: string;
  }): RevenueCatWebhookEnvelope {
    return {
      api_version: "1.0",
      event: {
        id: `${suffix}-${input.id}`,
        type: input.type,
        event_timestamp_ms: input.eventAt,
        app_user_id: input.userId ?? userId,
        product_id: input.productId ?? "com.citywalk.premium.monthly",
        transaction_id: `${suffix}-${input.id}-transaction`,
        original_transaction_id: input.originalTransactionId ?? `${suffix}-original`,
        expiration_at_ms: input.expirationAt ?? input.eventAt + 30 * DAY,
        purchased_at_ms: input.eventAt,
        store: "APP_STORE",
        environment: "SANDBOX",
        cancel_reason: input.cancelReason,
      },
    };
  }

  beforeAll(async () => {
    const db = getDb();
    await db.insert(user).values([
      {
        id: userId,
        name: "RevenueCat integration user",
        email: `${userId}@example.invalid`,
        emailVerified: true,
      },
      {
        id: deletedUserId,
        name: "RevenueCat deleted integration user",
        email: `${deletedUserId}@example.invalid`,
        emailVerified: true,
      },
    ]);
    const [product] = await db
      .insert(commerceProducts)
      .values({
        slug: "citywalk-premium",
        name: "CITYWALK Premium",
        kind: "feature_bundle",
        active: false,
      })
      .onConflictDoUpdate({
        target: commerceProducts.slug,
        set: { updatedAt: new Date() },
      })
      .returning({ id: commerceProducts.id });
    productId = product!.id;
    await db
      .insert(commerceProductGrants)
      .values({
        productId,
        scopeType: "feature",
        scopeKey: "premium",
        durationDays: null,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    const db = getDb();
    const providerPrefix = `${suffix}-`;
    await db.delete(commerceEntitlements).where(eq(commerceEntitlements.productId, productId));
    await db.delete(commerceSubscriptions).where(eq(commerceSubscriptions.productId, productId));
    const events = await db
      .select({ id: commerceProviderEvents.id, providerEventId: commerceProviderEvents.providerEventId })
      .from(commerceProviderEvents)
      .where(eq(commerceProviderEvents.provider, "revenuecat"));
    for (const event of events) {
      if (event.providerEventId.startsWith(providerPrefix)) {
        await db.delete(commerceProviderEvents).where(eq(commerceProviderEvents.id, event.id));
      }
    }
    await db.delete(commerceProductGrants).where(eq(commerceProductGrants.productId, productId));
    await db.delete(user).where(eq(user.id, userId));
    await db.delete(user).where(eq(user.id, deletedUserId));
    await closeDb();
  });

  it("grants Premium from a verified initial purchase and deduplicates redelivery", async () => {
    const eventAt = Date.parse("2030-01-01T00:00:00Z");
    const initial = envelope({ id: "initial", type: "INITIAL_PURCHASE", eventAt });
    await expect(processRevenueCatWebhookEvent(initial)).resolves.toBe("processed");
    await expect(processRevenueCatWebhookEvent(initial)).resolves.toBe("duplicate");

    const [subscription] = await getDb()
      .select()
      .from(commerceSubscriptions)
      .where(
        and(
          eq(commerceSubscriptions.provider, "revenuecat"),
          eq(commerceSubscriptions.providerSubscriptionId, `${suffix}-original`),
        ),
      );
    expect(subscription).toMatchObject({
      userId,
      productId,
      providerProductId: "com.citywalk.premium.monthly",
      status: "active",
      willRenew: true,
    });
    expect(subscription?.providerEventAt?.getTime()).toBe(eventAt);

    const [entitlement] = await getDb()
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.sourceSubscriptionId, subscription!.id));
    expect(entitlement).toMatchObject({
      userId,
      scopeType: "feature",
      scopeKey: "premium",
      status: "active",
    });
  });

  it("keeps access through voluntary cancellation and ignores an older renewal", async () => {
    const cancellationAt = Date.parse("2030-01-10T00:00:00Z");
    await expect(processRevenueCatWebhookEvent(envelope({
      id: "cancel",
      type: "CANCELLATION",
      eventAt: cancellationAt,
      cancelReason: "UNSUBSCRIBE",
      expirationAt: Date.parse("2030-02-01T00:00:00Z"),
    }))).resolves.toBe("processed");

    const [canceled] = await getDb()
      .select()
      .from(commerceSubscriptions)
      .where(eq(commerceSubscriptions.providerSubscriptionId, `${suffix}-original`));
    expect(canceled).toMatchObject({ status: "canceled", willRenew: false });

    const [entitlement] = await getDb()
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.sourceSubscriptionId, canceled!.id));
    expect(entitlement?.status).toBe("active");

    await expect(processRevenueCatWebhookEvent(envelope({
      id: "stale-renewal",
      type: "RENEWAL",
      eventAt: cancellationAt - DAY,
    }))).resolves.toBe("ignored");
    const [afterStale] = await getDb()
      .select({ status: commerceSubscriptions.status, providerEventAt: commerceSubscriptions.providerEventAt })
      .from(commerceSubscriptions)
      .where(eq(commerceSubscriptions.id, canceled!.id));
    expect(afterStale?.status).toBe("canceled");
    expect(afterStale?.providerEventAt?.getTime()).toBe(cancellationAt);
  });

  it("reactivates on a newer renewal and removes access on expiration", async () => {
    const renewalAt = Date.parse("2030-01-20T00:00:00Z");
    await expect(processRevenueCatWebhookEvent(envelope({
      id: "renewal",
      type: "RENEWAL",
      eventAt: renewalAt,
      expirationAt: Date.parse("2030-02-20T00:00:00Z"),
    }))).resolves.toBe("processed");

    const [subscription] = await getDb()
      .select()
      .from(commerceSubscriptions)
      .where(eq(commerceSubscriptions.providerSubscriptionId, `${suffix}-original`));
    expect(subscription).toMatchObject({ status: "active", willRenew: true });

    const expirationAt = Date.parse("2030-02-20T00:00:01Z");
    await expect(processRevenueCatWebhookEvent(envelope({
      id: "expiration",
      type: "EXPIRATION",
      eventAt: expirationAt,
      expirationAt,
    }))).resolves.toBe("processed");

    const [expiredSubscription] = await getDb()
      .select()
      .from(commerceSubscriptions)
      .where(eq(commerceSubscriptions.id, subscription!.id));
    const [expiredEntitlement] = await getDb()
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.sourceSubscriptionId, subscription!.id));
    expect(expiredSubscription?.status).toBe("expired");
    expect(expiredEntitlement?.status).toBe("expired");
  });

  it("revokes immediately for a customer-support refund", async () => {
    const originalTransactionId = `${suffix}-refund-original`;
    const initialAt = Date.parse("2031-01-01T00:00:00Z");
    await processRevenueCatWebhookEvent(envelope({
      id: "refund-initial",
      type: "INITIAL_PURCHASE",
      eventAt: initialAt,
      originalTransactionId,
    }));
    await expect(processRevenueCatWebhookEvent(envelope({
      id: "refund",
      type: "CANCELLATION",
      eventAt: initialAt + DAY,
      originalTransactionId,
      cancelReason: "CUSTOMER_SUPPORT",
    }))).resolves.toBe("processed");

    const [subscription] = await getDb()
      .select()
      .from(commerceSubscriptions)
      .where(eq(commerceSubscriptions.providerSubscriptionId, originalTransactionId));
    const [entitlement] = await getDb()
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.sourceSubscriptionId, subscription!.id));
    expect(subscription?.status).toBe("revoked");
    expect(entitlement?.status).toBe("revoked");
    expect(entitlement?.revocationReason).toContain("CUSTOMER_SUPPORT");
  });

  it("fails closed for unknown products and unknown users", async () => {
    const eventAt = Date.parse("2032-01-01T00:00:00Z");
    await expect(processRevenueCatWebhookEvent(envelope({
      id: "unknown-product",
      type: "INITIAL_PURCHASE",
      eventAt,
      productId: "com.citywalk.unknown",
      originalTransactionId: `${suffix}-unknown-product-original`,
    }))).resolves.toBe("ignored");
    await expect(processRevenueCatWebhookEvent(envelope({
      id: "unknown-user",
      type: "INITIAL_PURCHASE",
      eventAt: eventAt + 1,
      userId: `${suffix}-missing-user`,
      originalTransactionId: `${suffix}-unknown-user-original`,
    }))).resolves.toBe("ignored");
  });

  it("does not reattach a deleted account from a later webhook", async () => {
    const originalTransactionId = `${suffix}-deleted-original`;
    const eventAt = Date.parse("2033-01-01T00:00:00Z");
    await processRevenueCatWebhookEvent(envelope({
      id: "deleted-initial",
      type: "INITIAL_PURCHASE",
      eventAt,
      userId: deletedUserId,
      originalTransactionId,
    }));
    await getDb().delete(user).where(eq(user.id, deletedUserId));

    await expect(processRevenueCatWebhookEvent(envelope({
      id: "deleted-renewal",
      type: "RENEWAL",
      eventAt: eventAt + DAY,
      userId: deletedUserId,
      originalTransactionId,
    }))).resolves.toBe("ignored");

    const [subscription] = await getDb()
      .select({ userId: commerceSubscriptions.userId })
      .from(commerceSubscriptions)
      .where(eq(commerceSubscriptions.providerSubscriptionId, originalTransactionId));
    expect(subscription?.userId).toBeNull();
  });
});
