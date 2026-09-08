import Stripe from "stripe";

import {
  getStripeCheckoutEnvironment,
  getStripeWebhookEnvironment,
} from "@/lib/commerce/env.server";
import type {
  HostedCheckoutInput,
  HostedCheckoutResult,
  HostedPaymentProvider,
  NormalizedProviderEvent,
  VerifiedProviderEvent,
} from "@/lib/commerce/types";

const ORDER_METADATA_KEY = "citywalk_order_id";

export class StripeProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeProviderError";
  }
}

function readExpandableId(
  value: string | { id: string } | null | undefined,
): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

function requireOrderId(
  metadata: Stripe.Metadata | null | undefined,
  fallback?: string | null,
): string {
  const orderId = metadata?.[ORDER_METADATA_KEY] || fallback;
  if (!orderId) {
    throw new StripeProviderError("Verified Stripe event is missing the CITYWALK order id.");
  }
  return orderId;
}

export function normalizeStripeEvent(
  event: Stripe.Event,
): NormalizedProviderEvent | undefined {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        return undefined;
      }
      if (session.amount_total == null || !session.currency) {
        throw new StripeProviderError("Paid Checkout Session is missing amount or currency.");
      }
      return {
        kind: "checkout_paid",
        orderId: requireOrderId(session.metadata, session.client_reference_id),
        checkoutSessionId: session.id,
        paymentIntentId: readExpandableId(session.payment_intent),
        customerId: readExpandableId(session.customer),
        amountTotal: session.amount_total,
        currency: session.currency.toLowerCase(),
      };
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        kind: "checkout_failed",
        orderId: requireOrderId(session.metadata, session.client_reference_id),
        checkoutSessionId: session.id,
      };
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        kind: "checkout_canceled",
        orderId: requireOrderId(session.metadata, session.client_reference_id),
        checkoutSessionId: session.id,
      };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = readExpandableId(charge.payment_intent);
      if (!paymentIntentId) {
        throw new StripeProviderError("Refunded charge is missing a payment intent id.");
      }
      return {
        kind: "payment_refunded",
        paymentIntentId,
        fullyRefunded: charge.amount_refunded >= charge.amount,
      };
    }
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        kind: "payment_canceled",
        orderId: paymentIntent.metadata?.[ORDER_METADATA_KEY] || undefined,
        paymentIntentId: paymentIntent.id,
      };
    }
    default:
      return undefined;
  }
}

export function createStripeProvider(
  checkoutEnvironment: Readonly<Record<string, string | undefined>> = process.env,
): HostedPaymentProvider {
  const { secretKey } = getStripeCheckoutEnvironment(checkoutEnvironment);
  const stripe = new Stripe(secretKey, {
    appInfo: { name: "CITYWALK" },
    maxNetworkRetries: 2,
  });

  return {
    id: "stripe",
    async createCheckout(input: HostedCheckoutInput): Promise<HostedCheckoutResult> {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [{ price: input.providerPriceId, quantity: 1 }],
          client_reference_id: input.orderId,
          customer_email: input.customerEmail,
          customer_creation: "always",
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: { [ORDER_METADATA_KEY]: input.orderId },
          payment_intent_data: {
            metadata: { [ORDER_METADATA_KEY]: input.orderId },
          },
        },
        { idempotencyKey: `citywalk-order-${input.orderId}` },
      );

      if (!session.url) {
        throw new StripeProviderError("Stripe did not return a hosted Checkout URL.");
      }

      return { sessionId: session.id, url: session.url };
    },
    verifyWebhook(rawBody: string, signature: string): VerifiedProviderEvent {
      const { webhookSecret } = getStripeWebhookEnvironment(checkoutEnvironment);
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      return {
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
        normalized: normalizeStripeEvent(event),
      };
    },
  };
}
