import { randomUUID } from "node:crypto";

import { and, eq, or } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { user } from "@/db/authSchema";
import { closeDb, getDb } from "@/db/client";
import {
  commerceEntitlements,
  commerceOrders,
  commercePrices,
  commerceProductGrants,
  commerceProducts,
  commerceProviderEvents,
} from "@/db/commerceSchema";
import {
  CommerceCheckoutError,
  databaseCheckoutDependencies,
  startCommerceCheckout,
} from "@/lib/commerce/checkout.server";
import type { HostedPaymentProvider } from "@/lib/commerce/types";
import {
  createDatabaseWebhookDependencies,
  processVerifiedProviderEvent,
} from "@/lib/commerce/webhook.server";

const runIntegration = process.env.COMMERCE_DB_INTEGRATION === "1";

describe.skipIf(!runIntegration)("commerce webhook PostgreSQL integration", () => {
  const suffix = randomUUID().slice(0, 8);
  const userId = `commerce-webhook-user-${suffix}`;
  const orderId = `commerce-webhook-order-${suffix}`;
  const providerEventId = `commerce-webhook-event-${suffix}`;
  const analyticsFailureOrderId = `commerce-analytics-failure-order-${suffix}`;
  const analyticsFailureEventId = `commerce-analytics-failure-event-${suffix}`;
  const checkoutRaceUserId = `commerce-checkout-race-user-${suffix}`;
  let productId = 0;
  let priceId = 0;

  beforeAll(async () => {
    const db = getDb();
    await db.insert(user).values({
      id: userId,
      name: "Commerce webhook integration",
      email: `${userId}@example.invalid`,
      emailVerified: true,
    });
    await db.insert(user).values({
      id: checkoutRaceUserId,
      name: "Commerce checkout race integration",
      email: `${checkoutRaceUserId}@example.invalid`,
      emailVerified: true,
    });
    const [product] = await db
      .insert(commerceProducts)
      .values({
        slug: `commerce-webhook-product-${suffix}`,
        name: "Commerce webhook integration",
        kind: "city_pass",
        active: true,
      })
      .returning({ id: commerceProducts.id });
    productId = product!.id;
    const [price] = await db
      .insert(commercePrices)
      .values({
        productId,
        provider: "stripe",
        providerPriceId: `price_integration_${suffix}`,
        currency: "eur",
        unitAmount: 699,
        active: true,
      })
      .returning({ id: commercePrices.id });
    priceId = price!.id;
    await db.insert(commerceProductGrants).values({
      productId,
      scopeType: "city",
      scopeKey: `integration-city-${suffix}`,
      durationDays: 3,
    });
    await db.insert(commerceOrders).values({
      id: orderId,
      userId,
      productId,
      priceId,
      provider: "stripe",
      status: "pending",
      currency: "eur",
      amountTotal: 699,
    });
    await db.insert(commerceOrders).values({
      id: analyticsFailureOrderId,
      userId,
      productId,
      priceId,
      provider: "stripe",
      status: "pending",
      currency: "eur",
      amountTotal: 699,
    });
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(commerceEntitlements)
      .where(
        or(
          eq(commerceEntitlements.userId, userId),
          eq(commerceEntitlements.userId, checkoutRaceUserId),
        ),
      );
    await db
      .delete(commerceProviderEvents)
      .where(
        and(
          eq(commerceProviderEvents.provider, "stripe"),
          or(
            eq(commerceProviderEvents.providerEventId, providerEventId),
            eq(
              commerceProviderEvents.providerEventId,
              analyticsFailureEventId,
            ),
          ),
        ),
      );
    await db
      .delete(commerceOrders)
      .where(
        or(
          eq(commerceOrders.id, orderId),
          eq(commerceOrders.id, analyticsFailureOrderId),
          eq(commerceOrders.userId, checkoutRaceUserId),
        ),
      );
    await db
      .delete(commerceProductGrants)
      .where(eq(commerceProductGrants.productId, productId));
    await db.delete(commercePrices).where(eq(commercePrices.id, priceId));
    await db.delete(commerceProducts).where(eq(commerceProducts.id, productId));
    await db.delete(user).where(eq(user.id, checkoutRaceUserId));
    await db.delete(user).where(eq(user.id, userId));
    await closeDb();
  });

  it("serializes concurrent Checkout attempts and rechecks entitlement under lock", async () => {
    const provider: HostedPaymentProvider = {
      id: "stripe",
      createCheckout: vi.fn().mockResolvedValue({
        sessionId: `cs_race_${suffix}`,
        url: "https://checkout.stripe.test/session",
      }),
      verifyWebhook: vi.fn(),
    };
    const dependencies = {
      ...databaseCheckoutDependencies,
      getProvider: vi.fn().mockReturnValue(provider),
      getBaseUrl: () => "https://citywalk.example",
    };
    const checkout = () =>
      startCommerceCheckout(
        {
          user: {
            id: checkoutRaceUserId,
            email: `${checkoutRaceUserId}@example.invalid`,
          },
          priceId,
          locale: "en",
        },
        dependencies,
      );

    const results = await Promise.allSettled([checkout(), checkout()]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejection = results.find(({ status }) => status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        code: "CHECKOUT_ALREADY_PENDING",
      }),
    });
    expect(provider.createCheckout).toHaveBeenCalledTimes(1);

    const [pendingOrder] = await getDb()
      .select({ id: commerceOrders.id })
      .from(commerceOrders)
      .where(
        and(
          eq(commerceOrders.userId, checkoutRaceUserId),
          eq(commerceOrders.productId, productId),
          eq(commerceOrders.status, "pending"),
        ),
      );
    expect(pendingOrder).toBeDefined();
    await getDb().insert(commerceEntitlements).values({
      userId: checkoutRaceUserId,
      productId,
      sourceOrderId: pendingOrder!.id,
      scopeType: "city",
      scopeKey: `integration-city-${suffix}`,
      status: "active",
    });

    await expect(
      databaseCheckoutDependencies.createPendingOrder({
        orderId: `commerce-checkout-after-entitlement-${suffix}`,
        userId: checkoutRaceUserId,
        price: {
          priceId,
          productId,
          productSlug: `commerce-webhook-product-${suffix}`,
          productName: "Commerce webhook integration",
          provider: "stripe",
          providerPriceId: `price_integration_${suffix}`,
          currency: "eur",
          unitAmount: 699,
        },
      }),
    ).rejects.toBeInstanceOf(CommerceCheckoutError);
  });

  it("keeps committed access valid when post-commit analytics delivery fails", async () => {
    const captureFailure = vi
      .fn()
      .mockRejectedValue(new Error("analytics unavailable"));
    const event = {
      provider: "stripe",
      eventId: analyticsFailureEventId,
      eventType: "checkout.session.completed",
      normalized: {
        kind: "checkout_paid",
        orderId: analyticsFailureOrderId,
        checkoutSessionId: `cs_analytics_integration_${suffix}`,
        paymentIntentId: `pi_analytics_integration_${suffix}`,
        amountTotal: 699,
        currency: "eur",
      },
    } as const;

    await expect(
      processVerifiedProviderEvent(
        event,
        createDatabaseWebhookDependencies({
          captureEntitlementGrant: captureFailure,
        }),
      ),
    ).resolves.toBe("processed");

    expect(captureFailure).toHaveBeenCalledTimes(1);
    expect(
      await getDb()
        .select()
        .from(commerceEntitlements)
        .where(
          eq(commerceEntitlements.sourceOrderId, analyticsFailureOrderId),
        ),
    ).toHaveLength(1);
    expect(
      await getDb()
        .select({ status: commerceOrders.status })
        .from(commerceOrders)
        .where(eq(commerceOrders.id, analyticsFailureOrderId)),
    ).toEqual([{ status: "paid" }]);
  });

  it("emits grant analytics only after commit and only once for duplicate delivery", async () => {
    const event = {
      provider: "stripe",
      eventId: providerEventId,
      eventType: "checkout.session.completed",
      normalized: {
        kind: "checkout_paid",
        orderId,
        checkoutSessionId: `cs_integration_${suffix}`,
        paymentIntentId: `pi_integration_${suffix}`,
        amountTotal: 699,
        currency: "eur",
      },
    } as const;
    const captureAfterRollback = vi.fn().mockResolvedValue(undefined);

    await expect(
      processVerifiedProviderEvent(
        event,
        createDatabaseWebhookDependencies({
          captureEntitlementGrant: captureAfterRollback,
          afterApplyInTransaction: async () => {
            throw new Error("deliberate post-grant rollback");
          },
        }),
      ),
    ).rejects.toThrow("deliberate post-grant rollback");

    expect(captureAfterRollback).not.toHaveBeenCalled();
    expect(
      await getDb()
        .select()
        .from(commerceEntitlements)
        .where(eq(commerceEntitlements.sourceOrderId, orderId)),
    ).toHaveLength(0);
    expect(
      await getDb()
        .select()
        .from(commerceProviderEvents)
        .where(eq(commerceProviderEvents.providerEventId, providerEventId)),
    ).toHaveLength(0);
    expect(
      await getDb()
        .select({ status: commerceOrders.status })
        .from(commerceOrders)
        .where(eq(commerceOrders.id, orderId)),
    ).toEqual([{ status: "pending" }]);

    const captureAfterCommit = vi.fn().mockResolvedValue(undefined);
    const dependencies = createDatabaseWebhookDependencies({
      captureEntitlementGrant: captureAfterCommit,
    });
    await expect(processVerifiedProviderEvent(event, dependencies)).resolves.toBe(
      "processed",
    );
    await expect(processVerifiedProviderEvent(event, dependencies)).resolves.toBe(
      "duplicate",
    );

    expect(
      await getDb()
        .select()
        .from(commerceEntitlements)
        .where(eq(commerceEntitlements.sourceOrderId, orderId)),
    ).toHaveLength(1);
    expect(captureAfterCommit).toHaveBeenCalledTimes(1);
    expect(captureAfterCommit).toHaveBeenCalledWith({
      scopeType: "city",
      scopeKey: `integration-city-${suffix}`,
      durationDays: 3,
    });
  });
});
