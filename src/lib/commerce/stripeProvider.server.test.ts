import { createHmac } from "node:crypto";

import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  createStripeProvider,
  normalizeStripeEvent,
} from "@/lib/commerce/stripeProvider.server";

function stripeEvent(
  type: string,
  object: Record<string, unknown>,
): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    api_version: "2026-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  } as Stripe.Event;
}

describe("Stripe payment provider", () => {
  it("normalizes a paid hosted Checkout Session without card data", () => {
    expect(
      normalizeStripeEvent(
        stripeEvent("checkout.session.completed", {
          id: "cs_test_1",
          object: "checkout.session",
          payment_status: "paid",
          amount_total: 1200,
          currency: "eur",
          client_reference_id: "order-1",
          metadata: { citywalk_order_id: "order-1" },
          payment_intent: "pi_1",
          customer: "cus_1",
        }),
      ),
    ).toEqual({
      kind: "checkout_paid",
      orderId: "order-1",
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_1",
      customerId: "cus_1",
      amountTotal: 1200,
      currency: "eur",
    });
  });

  it("distinguishes partial from full refunds", () => {
    const partial = normalizeStripeEvent(
      stripeEvent("charge.refunded", {
        id: "ch_1",
        object: "charge",
        payment_intent: "pi_1",
        amount: 1200,
        amount_refunded: 500,
      }),
    );
    const full = normalizeStripeEvent(
      stripeEvent("charge.refunded", {
        id: "ch_2",
        object: "charge",
        payment_intent: "pi_1",
        amount: 1200,
        amount_refunded: 1200,
      }),
    );

    expect(partial).toEqual({
      kind: "payment_refunded",
      paymentIntentId: "pi_1",
      fullyRefunded: false,
    });
    expect(full).toEqual({
      kind: "payment_refunded",
      paymentIntentId: "pi_1",
      fullyRefunded: true,
    });
  });

  it("verifies the Stripe signature against the raw body", () => {
    const secret = "whsec_test_secret";
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: "evt_verified",
      object: "event",
      api_version: "2026-08-27.basil",
      created: timestamp,
      data: { object: { id: "obj_1", object: "customer" } },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: "customer.created",
    });
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const provider = createStripeProvider({
      STRIPE_SECRET_KEY: "sk_test_server",
      STRIPE_WEBHOOK_SECRET: secret,
    });

    const verified = provider.verifyWebhook(
      payload,
      `t=${timestamp},v1=${signature}`,
    );

    expect(verified.eventId).toBe("evt_verified");
    expect(verified.normalized).toBeUndefined();
  });
});
