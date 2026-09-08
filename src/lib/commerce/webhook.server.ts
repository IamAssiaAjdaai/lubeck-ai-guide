import { and, eq } from "drizzle-orm";

import {
  commerceCustomers,
  commerceEntitlements,
  commerceOrders,
  commerceProductGrants,
  commerceProviderEvents,
} from "@/db/commerceSchema";
import { getDb } from "@/db/client";
import type {
  CommerceProviderId,
  NormalizedProviderEvent,
  VerifiedProviderEvent,
} from "@/lib/commerce/types";

export type CommerceWebhookResult = "processed" | "ignored" | "duplicate";

type StoredOrder = Readonly<{
  id: string;
  userId: string | null;
  productId: number;
  provider: string;
  status:
    | "pending"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "canceled"
    | "failed";
  currency: string;
  amountTotal: number;
}>;

type ProductGrant = Readonly<{
  scopeType: "city" | "feature";
  scopeKey: string;
  durationDays: number | null;
}>;

type CommerceMutationStore = Readonly<{
  loadOrderById: (orderId: string) => Promise<StoredOrder | undefined>;
  loadOrderByPaymentIntent: (
    provider: CommerceProviderId,
    paymentIntentId: string,
  ) => Promise<StoredOrder | undefined>;
  markPaid: (
    orderId: string,
    values: {
      checkoutSessionId: string;
      paymentIntentId?: string;
      paidAt: Date;
    },
  ) => Promise<void>;
  markStatus: (
    orderId: string,
    status: "partially_refunded" | "refunded" | "canceled" | "failed",
    at: Date,
  ) => Promise<void>;
  recordCustomer: (
    userId: string,
    provider: CommerceProviderId,
    customerId: string,
  ) => Promise<void>;
  listProductGrants: (productId: number) => Promise<readonly ProductGrant[]>;
  grantEntitlement: (input: {
    userId: string;
    productId: number;
    sourceOrderId: string;
    grant: ProductGrant;
    grantedAt: Date;
    expiresAt?: Date;
  }) => Promise<void>;
  revokeOrderEntitlements: (
    orderId: string,
    revokedAt: Date,
    reason: string,
  ) => Promise<void>;
}>;

type WebhookDependencies = Readonly<{
  runOnce: (
    event: VerifiedProviderEvent,
    apply: (store: CommerceMutationStore, now: Date) => Promise<void>,
  ) => Promise<CommerceWebhookResult>;
}>;

export class CommerceWebhookError extends Error {
  constructor(
    readonly code:
      | "ORDER_NOT_FOUND"
      | "PROVIDER_MISMATCH"
      | "AMOUNT_MISMATCH",
  ) {
    super(code);
    this.name = "CommerceWebhookError";
  }
}

function expiryFromGrant(grantedAt: Date, durationDays: number | null) {
  if (durationDays == null) return undefined;
  return new Date(grantedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

export async function applyNormalizedProviderEvent(
  provider: CommerceProviderId,
  event: NormalizedProviderEvent,
  store: CommerceMutationStore,
  now: Date,
): Promise<void> {
  if (event.kind === "checkout_paid") {
    const order = await store.loadOrderById(event.orderId);
    if (!order) throw new CommerceWebhookError("ORDER_NOT_FOUND");
    if (order.provider !== provider) {
      throw new CommerceWebhookError("PROVIDER_MISMATCH");
    }
    if (
      order.amountTotal !== event.amountTotal ||
      order.currency.toLowerCase() !== event.currency.toLowerCase()
    ) {
      throw new CommerceWebhookError("AMOUNT_MISMATCH");
    }

    if (order.status === "refunded") {
      return;
    }
    if (order.status === "canceled" || order.status === "failed") {
      throw new CommerceWebhookError("AMOUNT_MISMATCH");
    }

    await store.markPaid(order.id, {
      checkoutSessionId: event.checkoutSessionId,
      paymentIntentId: event.paymentIntentId,
      paidAt: now,
    });

    if (!order.userId) return;
    if (event.customerId) {
      await store.recordCustomer(order.userId, provider, event.customerId);
    }

    const grants = await store.listProductGrants(order.productId);
    for (const grant of grants) {
      await store.grantEntitlement({
        userId: order.userId,
        productId: order.productId,
        sourceOrderId: order.id,
        grant,
        grantedAt: now,
        expiresAt: expiryFromGrant(now, grant.durationDays),
      });
    }
    return;
  }

  if (event.kind === "checkout_failed" || event.kind === "checkout_canceled") {
    const order = await store.loadOrderById(event.orderId);
    if (!order) throw new CommerceWebhookError("ORDER_NOT_FOUND");
    if (order.status !== "pending") return;
    await store.markStatus(
      order.id,
      event.kind === "checkout_failed" ? "failed" : "canceled",
      now,
    );
    return;
  }

  if (event.kind === "payment_refunded") {
    const order = await store.loadOrderByPaymentIntent(
      provider,
      event.paymentIntentId,
    );
    if (!order) throw new CommerceWebhookError("ORDER_NOT_FOUND");

    if (event.fullyRefunded) {
      await store.markStatus(order.id, "refunded", now);
      await store.revokeOrderEntitlements(order.id, now, "full_refund");
    } else if (order.status === "paid") {
      await store.markStatus(order.id, "partially_refunded", now);
    }
    return;
  }

  const order = event.orderId
    ? await store.loadOrderById(event.orderId)
    : await store.loadOrderByPaymentIntent(provider, event.paymentIntentId);
  if (!order) throw new CommerceWebhookError("ORDER_NOT_FOUND");
  if (order.status === "pending") {
    await store.markStatus(order.id, "canceled", now);
  }
}

const defaultDependencies: WebhookDependencies = {
  async runOnce(event, apply) {
    const db = getDb();
    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(commerceProviderEvents)
        .values({
          provider: event.provider,
          providerEventId: event.eventId,
          eventType: event.eventType,
          outcome: event.normalized ? "processed" : "ignored",
        })
        .onConflictDoNothing()
        .returning({ id: commerceProviderEvents.id });

      if (!inserted) return "duplicate" as const;
      if (!event.normalized) return "ignored" as const;

      const store: CommerceMutationStore = {
        async loadOrderById(orderId) {
          const [order] = await tx
            .select({
              id: commerceOrders.id,
              userId: commerceOrders.userId,
              productId: commerceOrders.productId,
              provider: commerceOrders.provider,
              status: commerceOrders.status,
              currency: commerceOrders.currency,
              amountTotal: commerceOrders.amountTotal,
            })
            .from(commerceOrders)
            .where(eq(commerceOrders.id, orderId))
            .limit(1);
          return order;
        },
        async loadOrderByPaymentIntent(provider, paymentIntentId) {
          const [order] = await tx
            .select({
              id: commerceOrders.id,
              userId: commerceOrders.userId,
              productId: commerceOrders.productId,
              provider: commerceOrders.provider,
              status: commerceOrders.status,
              currency: commerceOrders.currency,
              amountTotal: commerceOrders.amountTotal,
            })
            .from(commerceOrders)
            .where(
              and(
                eq(commerceOrders.provider, provider),
                eq(commerceOrders.providerPaymentIntentId, paymentIntentId),
              ),
            )
            .limit(1);
          return order;
        },
        async markPaid(orderId, values) {
          await tx
            .update(commerceOrders)
            .set({
              status: "paid",
              providerCheckoutSessionId: values.checkoutSessionId,
              providerPaymentIntentId: values.paymentIntentId,
              paidAt: values.paidAt,
            })
            .where(eq(commerceOrders.id, orderId));
        },
        async markStatus(orderId, status, at) {
          await tx
            .update(commerceOrders)
            .set({
              status,
              ...(status === "refunded" ? { refundedAt: at } : {}),
              ...(status === "canceled" ? { canceledAt: at } : {}),
            })
            .where(eq(commerceOrders.id, orderId));
        },
        async recordCustomer(userId, provider, customerId) {
          await tx
            .insert(commerceCustomers)
            .values({
              userId,
              provider,
              providerCustomerId: customerId,
            })
            .onConflictDoNothing();
        },
        async listProductGrants(productId) {
          return tx
            .select({
              scopeType: commerceProductGrants.scopeType,
              scopeKey: commerceProductGrants.scopeKey,
              durationDays: commerceProductGrants.durationDays,
            })
            .from(commerceProductGrants)
            .where(eq(commerceProductGrants.productId, productId));
        },
        async grantEntitlement(input) {
          await tx
            .insert(commerceEntitlements)
            .values({
              userId: input.userId,
              productId: input.productId,
              sourceOrderId: input.sourceOrderId,
              scopeType: input.grant.scopeType,
              scopeKey: input.grant.scopeKey,
              status: "active",
              grantedAt: input.grantedAt,
              expiresAt: input.expiresAt,
            })
            .onConflictDoNothing();
        },
        async revokeOrderEntitlements(orderId, revokedAt, reason) {
          await tx
            .update(commerceEntitlements)
            .set({
              status: "revoked",
              revokedAt,
              revocationReason: reason,
            })
            .where(
              and(
                eq(commerceEntitlements.sourceOrderId, orderId),
                eq(commerceEntitlements.status, "active"),
              ),
            );
        },
      };

      await apply(store, new Date());
      return "processed" as const;
    });
  },
};

export async function processVerifiedProviderEvent(
  event: VerifiedProviderEvent,
  dependencies: WebhookDependencies = defaultDependencies,
): Promise<CommerceWebhookResult> {
  return dependencies.runOnce(event, async (store, now) => {
    if (!event.normalized) return;
    await applyNormalizedProviderEvent(event.provider, event.normalized, store, now);
  });
}

export type { CommerceMutationStore, WebhookDependencies };
