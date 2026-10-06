import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PRODUCT_SLUG_BY_REVENUECAT_PRODUCT,
  RevenueCatWebhookError,
  revenueCatEventPolicy,
  verifyRevenueCatWebhook,
} from "@/lib/commerce/revenueCatWebhook.server";

const NOW_MS = 1_800_000_000_000;
const AUTHORIZATION = "Bearer revenuecat-test-authorization";
const SIGNING_SECRET = "revenuecat-test-signing-secret";

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    api_version: "1.0",
    event: {
      id: "event-1",
      type: "INITIAL_PURCHASE",
      event_timestamp_ms: NOW_MS,
      app_user_id: "user-123",
      product_id: "com.citywalk.premium.monthly",
      original_transaction_id: "original-123",
      expiration_at_ms: NOW_MS + 30 * 24 * 60 * 60 * 1000,
      store: "APP_STORE",
      environment: "SANDBOX",
      ...overrides,
    },
  });
}

function headers(rawBody: string, timestamp = Math.floor(NOW_MS / 1000)) {
  const signature = createHmac("sha256", SIGNING_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return new Headers({
    authorization: AUTHORIZATION,
    "x-revenuecat-webhook-signature": `t=${timestamp},v1=${signature}`,
  });
}

describe("RevenueCat webhook verification", () => {
  it("verifies authorization and HMAC before returning a parsed event", () => {
    const rawBody = payload();
    const verified = verifyRevenueCatWebhook({
      headers: headers(rawBody),
      rawBody,
      nowMs: NOW_MS,
      authorizationSecret: AUTHORIZATION,
      signingSecret: SIGNING_SECRET,
    });
    expect(verified.event.id).toBe("event-1");
    expect(verified.event.app_user_id).toBe("user-123");
  });

  it("rejects a wrong authorization header", () => {
    const rawBody = payload();
    const requestHeaders = headers(rawBody);
    requestHeaders.set("authorization", "Bearer wrong");
    expect(() => verifyRevenueCatWebhook({
      headers: requestHeaders,
      rawBody,
      nowMs: NOW_MS,
      authorizationSecret: AUTHORIZATION,
      signingSecret: SIGNING_SECRET,
    })).toThrowError(new RevenueCatWebhookError("UNAUTHORIZED"));
  });

  it("rejects a signature computed over different raw bytes", () => {
    const signedBody = payload();
    const changedBody = `${signedBody} `;
    expect(() => verifyRevenueCatWebhook({
      headers: headers(signedBody),
      rawBody: changedBody,
      nowMs: NOW_MS,
      authorizationSecret: AUTHORIZATION,
      signingSecret: SIGNING_SECRET,
    })).toThrowError(new RevenueCatWebhookError("INVALID_SIGNATURE"));
  });

  it("rejects signatures outside the replay tolerance", () => {
    const rawBody = payload();
    expect(() => verifyRevenueCatWebhook({
      headers: headers(rawBody, Math.floor(NOW_MS / 1000) - 301),
      rawBody,
      nowMs: NOW_MS,
      authorizationSecret: AUTHORIZATION,
      signingSecret: SIGNING_SECRET,
    })).toThrowError(new RevenueCatWebhookError("STALE_SIGNATURE"));
  });

  it("fails closed when webhook secrets are not configured", () => {
    const rawBody = payload();
    expect(() => verifyRevenueCatWebhook({
      headers: headers(rawBody),
      rawBody,
      nowMs: NOW_MS,
      authorizationSecret: "",
      signingSecret: "",
    })).toThrowError(new RevenueCatWebhookError("NOT_CONFIGURED"));
  });

  it("rejects malformed payloads only after the signature is valid", () => {
    const rawBody = "not-json";
    expect(() => verifyRevenueCatWebhook({
      headers: headers(rawBody),
      rawBody,
      nowMs: NOW_MS,
      authorizationSecret: AUTHORIZATION,
      signingSecret: SIGNING_SECRET,
    })).toThrowError(new RevenueCatWebhookError("INVALID_PAYLOAD"));
  });
});

describe("RevenueCat product mapping", () => {
  it("uses the annual product ID and rejects the stale yearly ID", () => {
    expect(PRODUCT_SLUG_BY_REVENUECAT_PRODUCT["com.citywalk.premium.annual"])
      .toBe("citywalk-premium");
    expect("com.citywalk.premium.yearly" in PRODUCT_SLUG_BY_REVENUECAT_PRODUCT).toBe(false);
  });
});

describe("RevenueCat lifecycle policy", () => {
  it("keeps voluntary cancellation access until expiration", () => {
    expect(revenueCatEventPolicy({
      id: "event",
      type: "CANCELLATION",
      event_timestamp_ms: NOW_MS,
      cancel_reason: "UNSUBSCRIBE",
    })).toEqual({ status: "canceled", willRenew: false, revokeImmediately: false });
  });

  it("revokes a customer-support refund immediately", () => {
    expect(revenueCatEventPolicy({
      id: "event",
      type: "CANCELLATION",
      event_timestamp_ms: NOW_MS,
      cancel_reason: "CUSTOMER_SUPPORT",
    })).toEqual({ status: "revoked", willRenew: false, revokeImmediately: true });
  });

  it("does not treat billing issue or pause as expiration", () => {
    expect(revenueCatEventPolicy({
      id: "billing",
      type: "BILLING_ISSUE",
      event_timestamp_ms: NOW_MS,
    })).toMatchObject({ status: "billing_issue", revokeImmediately: false });
    expect(revenueCatEventPolicy({
      id: "paused",
      type: "SUBSCRIPTION_PAUSED",
      event_timestamp_ms: NOW_MS,
    })).toMatchObject({ status: "paused", revokeImmediately: false });
  });

  it("revokes access on expiration", () => {
    expect(revenueCatEventPolicy({
      id: "expiration",
      type: "EXPIRATION",
      event_timestamp_ms: NOW_MS,
    })).toEqual({ status: "expired", willRenew: false, revokeImmediately: true });
  });

  it("ignores lifecycle events whose effect is not yet authoritative", () => {
    expect(revenueCatEventPolicy({
      id: "product-change",
      type: "PRODUCT_CHANGE",
      event_timestamp_ms: NOW_MS,
    })).toBeUndefined();
    expect(revenueCatEventPolicy({
      id: "transfer",
      type: "TRANSFER",
      event_timestamp_ms: NOW_MS,
    })).toBeUndefined();
  });
});
