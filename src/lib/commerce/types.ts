import type { Locale } from "@/lib/i18n";

export type CommerceProviderId = "stripe";
export type EntitlementScopeType = "city" | "feature";

export type EligibleCommercePrice = Readonly<{
  priceId: number;
  productId: number;
  productSlug: string;
  productName: string;
  provider: CommerceProviderId;
  providerPriceId: string;
  currency: string;
  unitAmount: number;
}>;

export type HostedCheckoutInput = Readonly<{
  orderId: string;
  providerPriceId: string;
  customerEmail: string;
  locale: Locale;
  successUrl: string;
  cancelUrl: string;
}>;

export type HostedCheckoutResult = Readonly<{
  sessionId: string;
  url: string;
}>;

export type NormalizedProviderEvent =
  | Readonly<{
      kind: "checkout_paid";
      orderId: string;
      checkoutSessionId: string;
      paymentIntentId?: string;
      customerId?: string;
      amountTotal: number;
      currency: string;
    }>
  | Readonly<{
      kind: "checkout_failed";
      orderId: string;
      checkoutSessionId: string;
    }>
  | Readonly<{
      kind: "checkout_canceled";
      orderId: string;
      checkoutSessionId: string;
    }>
  | Readonly<{
      kind: "payment_refunded";
      paymentIntentId: string;
      fullyRefunded: boolean;
    }>
  | Readonly<{
      kind: "payment_canceled";
      orderId?: string;
      paymentIntentId: string;
    }>;

export type VerifiedProviderEvent = Readonly<{
  provider: CommerceProviderId;
  eventId: string;
  eventType: string;
  normalized?: NormalizedProviderEvent;
}>;

export interface HostedPaymentProvider {
  readonly id: CommerceProviderId;
  createCheckout(input: HostedCheckoutInput): Promise<HostedCheckoutResult>;
  verifyWebhook(rawBody: string, signature: string): VerifiedProviderEvent;
}
