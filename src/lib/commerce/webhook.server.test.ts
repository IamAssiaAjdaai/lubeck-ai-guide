import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applyNormalizedProviderEvent,
  processVerifiedProviderEvent,
  type CommerceMutationStore,
  type WebhookDependencies,
} from "@/lib/commerce/webhook.server";

function store(
  overrides: Partial<CommerceMutationStore> = {},
): CommerceMutationStore {
  return {
    loadOrderById: vi.fn().mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      productId: 3,
      provider: "stripe",
      status: "pending",
      currency: "eur",
      amountTotal: 1200,
    }),
    loadOrderByPaymentIntent: vi.fn().mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      productId: 3,
      provider: "stripe",
      status: "paid",
      currency: "eur",
      amountTotal: 1200,
    }),
    markPaid: vi.fn().mockResolvedValue(undefined),
    markStatus: vi.fn().mockResolvedValue(undefined),
    recordCustomer: vi.fn().mockResolvedValue(undefined),
    listProductGrants: vi.fn().mockResolvedValue([
      { scopeType: "city", scopeKey: "lubeck", durationDays: 2 },
      { scopeType: "feature", scopeKey: "premium_ai", durationDays: null },
    ]),
    grantEntitlement: vi.fn().mockResolvedValue(undefined),
    revokeOrderEntitlements: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const now = new Date("2026-09-08T12:00:00.000Z");

describe("commerce webhook processing", () => {
  it("grants product entitlements only after a verified paid event", async () => {
    const s = store();

    await applyNormalizedProviderEvent(
      "stripe",
      {
        kind: "checkout_paid",
        orderId: "order-1",
        checkoutSessionId: "cs_1",
        paymentIntentId: "pi_1",
        customerId: "cus_1",
        amountTotal: 1200,
        currency: "eur",
      },
      s,
      now,
    );

    expect(s.markPaid).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        checkoutSessionId: "cs_1",
        paymentIntentId: "pi_1",
      }),
    );
    expect(s.recordCustomer).toHaveBeenCalledWith(
      "user-1",
      "stripe",
      "cus_1",
    );
    expect(s.grantEntitlement).toHaveBeenCalledTimes(2);
    expect(s.grantEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        grant: expect.objectContaining({ scopeKey: "lubeck" }),
        expiresAt: new Date("2026-09-10T12:00:00.000Z"),
      }),
    );
  });

  it("fails closed when provider amount does not match the server-created order", async () => {
    const s = store();

    await expect(
      applyNormalizedProviderEvent(
        "stripe",
        {
          kind: "checkout_paid",
          orderId: "order-1",
          checkoutSessionId: "cs_1",
          paymentIntentId: "pi_1",
          amountTotal: 1,
          currency: "eur",
        },
        s,
        now,
      ),
    ).rejects.toMatchObject({ code: "AMOUNT_MISMATCH" });
    expect(s.markPaid).not.toHaveBeenCalled();
    expect(s.grantEntitlement).not.toHaveBeenCalled();
  });

  it("keeps access on partial refund and revokes it on full refund", async () => {
    const partialStore = store();
    await applyNormalizedProviderEvent(
      "stripe",
      {
        kind: "payment_refunded",
        paymentIntentId: "pi_1",
        fullyRefunded: false,
      },
      partialStore,
      now,
    );
    expect(partialStore.markStatus).toHaveBeenCalledWith(
      "order-1",
      "partially_refunded",
      now,
    );
    expect(partialStore.revokeOrderEntitlements).not.toHaveBeenCalled();

    const fullStore = store();
    await applyNormalizedProviderEvent(
      "stripe",
      {
        kind: "payment_refunded",
        paymentIntentId: "pi_1",
        fullyRefunded: true,
      },
      fullStore,
      now,
    );
    expect(fullStore.markStatus).toHaveBeenCalledWith(
      "order-1",
      "refunded",
      now,
    );
    expect(fullStore.revokeOrderEntitlements).toHaveBeenCalledWith(
      "order-1",
      now,
      "full_refund",
    );
  });

  it("does not grant access for checkout expiration", async () => {
    const s = store();
    await applyNormalizedProviderEvent(
      "stripe",
      {
        kind: "checkout_canceled",
        orderId: "order-1",
        checkoutSessionId: "cs_1",
      },
      s,
      now,
    );

    expect(s.markStatus).toHaveBeenCalledWith("order-1", "canceled", now);
    expect(s.grantEntitlement).not.toHaveBeenCalled();
  });

  it("short-circuits duplicate provider events before business mutations", async () => {
    const callbackInvoked = vi.fn();
    const dependencies: WebhookDependencies = {
      runOnce: vi.fn().mockImplementation(async () => {
        callbackInvoked();
        return "duplicate" as const;
      }),
    };

    const result = await processVerifiedProviderEvent(
      {
        provider: "stripe",
        eventId: "evt_1",
        eventType: "checkout.session.completed",
        normalized: {
          kind: "checkout_paid",
          orderId: "order-1",
          checkoutSessionId: "cs_1",
          amountTotal: 1200,
          currency: "eur",
        },
      },
      dependencies,
    );

    expect(result).toBe("duplicate");
    expect(callbackInvoked).toHaveBeenCalledTimes(1);
  });
});
