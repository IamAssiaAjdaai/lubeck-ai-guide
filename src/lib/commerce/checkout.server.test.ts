import { describe, expect, it, vi } from "vitest";

import {
  parseCommerceCheckoutInput,
  startCommerceCheckout,
  type CheckoutDependencies,
} from "@/lib/commerce/checkout.server";
import type { HostedPaymentProvider } from "@/lib/commerce/types";

function dependencies(
  overrides: Partial<CheckoutDependencies> = {},
): CheckoutDependencies {
  const provider: HostedPaymentProvider = {
    id: "stripe",
    createCheckout: vi.fn().mockResolvedValue({
      sessionId: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/test",
    }),
    verifyWebhook: vi.fn(),
  };

  return {
    loadPrice: vi.fn().mockResolvedValue({
      priceId: 7,
      productId: 3,
      productSlug: "lubeck-pass",
      productName: "Lübeck Pass",
      provider: "stripe",
      providerPriceId: "price_test_1",
      currency: "eur",
      unitAmount: 1200,
    }),
    hasActiveProductGrant: vi.fn().mockResolvedValue(false),
    createPendingOrder: vi.fn().mockResolvedValue(undefined),
    attachProviderSession: vi.fn().mockResolvedValue(undefined),
    markOrderFailed: vi.fn().mockResolvedValue(undefined),
    getProvider: vi.fn().mockReturnValue(provider),
    getBaseUrl: () => "https://citywalk.example",
    createOrderId: () => "order-1",
    ...overrides,
  };
}

describe("commerce checkout", () => {
  it("strictly accepts only a positive numeric CITYWALK price identifier", () => {
    expect(parseCommerceCheckoutInput({ priceId: 7, locale: "en" })).toEqual({
      priceId: 7,
      locale: "en",
    });

    expect(
      parseCommerceCheckoutInput({ priceId: "7tampered", locale: "en" }),
    ).toBeUndefined();
    expect(
      parseCommerceCheckoutInput({ priceId: "7", locale: "en" }),
    ).toBeUndefined();
    expect(
      parseCommerceCheckoutInput({ priceId: 7.5, locale: "en" }),
    ).toBeUndefined();
    for (const priceId of ["1.5", "-1", "0", "arbitrary", 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
      expect(parseCommerceCheckoutInput({ priceId, locale: "en" })).toBeUndefined();
    }
    expect(
      parseCommerceCheckoutInput({ priceId: 7, locale: "invalid" }),
    ).toBeUndefined();
  });

  it("creates an order before redirecting to a server-selected hosted price", async () => {
    const deps = dependencies();
    const result = await startCommerceCheckout(
      {
        user: { id: "user-1", email: "traveler@example.com" },
        priceId: 7,
        locale: "en",
      },
      deps,
    );

    expect(result).toEqual({
      orderId: "order-1",
      checkoutUrl: "https://checkout.stripe.com/c/pay/test",
    });
    expect(deps.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        userId: "user-1",
        price: expect.objectContaining({ providerPriceId: "price_test_1" }),
      }),
    );
    const provider = deps.getProvider("stripe");
    expect(provider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        providerPriceId: "price_test_1",
        customerEmail: "traveler@example.com",
        successUrl: expect.stringContaining("/en/account/purchases?checkout=success"),
      }),
    );
    expect(deps.attachProviderSession).toHaveBeenCalledWith(
      "order-1",
      "cs_test_1",
    );
  });

  it("never accepts an unavailable price from the client", async () => {
    const deps = dependencies({ loadPrice: vi.fn().mockResolvedValue(undefined) });

    await expect(
      startCommerceCheckout(
        {
          user: { id: "user-1", email: "traveler@example.com" },
          priceId: 999,
          locale: "en",
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "PRICE_NOT_AVAILABLE",
    });
    expect(deps.createPendingOrder).not.toHaveBeenCalled();
  });

  it("rejects checkout before order creation when the product grant is active", async () => {
    const deps = dependencies({
      hasActiveProductGrant: vi.fn().mockResolvedValue(true),
    });

    await expect(
      startCommerceCheckout(
        {
          user: { id: "user-1", email: "traveler@example.com" },
          priceId: 7,
          locale: "en",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "ALREADY_ENTITLED" });
    expect(deps.createPendingOrder).not.toHaveBeenCalled();
    expect(deps.getProvider).not.toHaveBeenCalled();
  });

  it("fails the pending order when the payment provider cannot start checkout", async () => {
    const failingProvider: HostedPaymentProvider = {
      id: "stripe",
      createCheckout: vi.fn().mockRejectedValue(new Error("provider down")),
      verifyWebhook: vi.fn(),
    };
    const deps = dependencies({
      getProvider: vi.fn().mockReturnValue(failingProvider),
    });

    await expect(
      startCommerceCheckout(
        {
          user: { id: "user-1", email: "traveler@example.com" },
          priceId: 7,
          locale: "en",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    expect(deps.markOrderFailed).toHaveBeenCalledWith("order-1");
  });
});
