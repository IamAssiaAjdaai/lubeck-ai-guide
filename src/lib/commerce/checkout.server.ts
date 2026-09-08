import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  commerceOrders,
  commercePrices,
  commerceProducts,
} from "@/db/commerceSchema";
import { getDb } from "@/db/client";
import { getCommerceBaseUrl } from "@/lib/commerce/env.server";
import { createStripeProvider } from "@/lib/commerce/stripeProvider.server";
import type {
  CommerceProviderId,
  EligibleCommercePrice,
  HostedPaymentProvider,
} from "@/lib/commerce/types";
import { isLocale, type Locale } from "@/lib/i18n";

export type CheckoutUser = Readonly<{
  id: string;
  email: string;
}>;

type CheckoutDependencies = Readonly<{
  loadPrice: (priceId: number) => Promise<EligibleCommercePrice | undefined>;
  createPendingOrder: (input: {
    orderId: string;
    userId: string;
    price: EligibleCommercePrice;
  }) => Promise<void>;
  attachProviderSession: (orderId: string, sessionId: string) => Promise<void>;
  markOrderFailed: (orderId: string) => Promise<void>;
  getProvider: (provider: CommerceProviderId) => HostedPaymentProvider;
  getBaseUrl: () => string;
  createOrderId: () => string;
}>;

export class CommerceCheckoutError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "PRICE_NOT_AVAILABLE"
      | "UNSUPPORTED_PROVIDER"
      | "PROVIDER_ERROR",
  ) {
    super(code);
    this.name = "CommerceCheckoutError";
  }
}

async function loadEligiblePrice(
  priceId: number,
): Promise<EligibleCommercePrice | undefined> {
  const db = getDb();
  const [row] = await db
    .select({
      priceId: commercePrices.id,
      productId: commerceProducts.id,
      productSlug: commerceProducts.slug,
      productName: commerceProducts.name,
      provider: commercePrices.provider,
      providerPriceId: commercePrices.providerPriceId,
      currency: commercePrices.currency,
      unitAmount: commercePrices.unitAmount,
    })
    .from(commercePrices)
    .innerJoin(
      commerceProducts,
      eq(commercePrices.productId, commerceProducts.id),
    )
    .where(
      and(
        eq(commercePrices.id, priceId),
        eq(commercePrices.active, true),
        eq(commerceProducts.active, true),
      ),
    )
    .limit(1);

  if (!row || row.provider !== "stripe") return undefined;
  return { ...row, provider: "stripe" };
}

const defaultDependencies: CheckoutDependencies = {
  loadPrice: loadEligiblePrice,
  async createPendingOrder({ orderId, userId, price }) {
    await getDb().insert(commerceOrders).values({
      id: orderId,
      userId,
      productId: price.productId,
      priceId: price.priceId,
      provider: price.provider,
      currency: price.currency.toLowerCase(),
      amountTotal: price.unitAmount,
      status: "pending",
    });
  },
  async attachProviderSession(orderId, sessionId) {
    await getDb()
      .update(commerceOrders)
      .set({ providerCheckoutSessionId: sessionId })
      .where(eq(commerceOrders.id, orderId));
  },
  async markOrderFailed(orderId) {
    await getDb()
      .update(commerceOrders)
      .set({ status: "failed" })
      .where(eq(commerceOrders.id, orderId));
  },
  getProvider(provider) {
    if (provider !== "stripe") {
      throw new CommerceCheckoutError("UNSUPPORTED_PROVIDER");
    }
    return createStripeProvider();
  },
  getBaseUrl: getCommerceBaseUrl,
  createOrderId: randomUUID,
};

export async function startCommerceCheckout(
  input: Readonly<{
    user: CheckoutUser;
    priceId: number;
    locale: string;
  }>,
  dependencies: CheckoutDependencies = defaultDependencies,
): Promise<Readonly<{ orderId: string; checkoutUrl: string }>> {
  if (!Number.isSafeInteger(input.priceId) || input.priceId <= 0 || !isLocale(input.locale)) {
    throw new CommerceCheckoutError("INVALID_INPUT");
  }

  const price = await dependencies.loadPrice(input.priceId);
  if (!price) {
    throw new CommerceCheckoutError("PRICE_NOT_AVAILABLE");
  }

  const orderId = dependencies.createOrderId();
  await dependencies.createPendingOrder({
    orderId,
    userId: input.user.id,
    price,
  });

  const locale = input.locale as Locale;
  const baseUrl = dependencies.getBaseUrl();
  const purchasesPath = `/${locale}/account/purchases`;
  const provider = dependencies.getProvider(price.provider);

  try {
    const checkout = await provider.createCheckout({
      orderId,
      providerPriceId: price.providerPriceId,
      customerEmail: input.user.email,
      locale,
      successUrl: `${baseUrl}${purchasesPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}${purchasesPath}?checkout=canceled`,
    });

    await dependencies.attachProviderSession(orderId, checkout.sessionId);
    return { orderId, checkoutUrl: checkout.url };
  } catch (error) {
    await dependencies.markOrderFailed(orderId);
    if (error instanceof CommerceCheckoutError) throw error;
    throw new CommerceCheckoutError("PROVIDER_ERROR");
  }
}

export type { CheckoutDependencies };
