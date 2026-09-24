import { describe, expect, it } from "vitest";

import {
  getCommerceBaseUrl,
  getStripeCheckoutEnvironment,
  getStripeWebhookEnvironment,
} from "@/lib/commerce/env.server";

describe("commerce environment", () => {
  it("keeps Stripe secrets server-only", () => {
    expect(() =>
      getStripeCheckoutEnvironment({
        STRIPE_SECRET_KEY: "sk_test_server",
        NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_test_public",
      }),
    ).toThrow(/must never be configured/i);
  });

  it("requires a webhook secret separately from checkout", () => {
    expect(
      getStripeCheckoutEnvironment({ STRIPE_SECRET_KEY: "sk_test_server" }),
    ).toEqual({ secretKey: "sk_test_server" });

    expect(() =>
      getStripeWebhookEnvironment({ STRIPE_SECRET_KEY: "sk_test_server" }),
    ).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("uses the configured app origin for provider return URLs", () => {
    expect(
      getCommerceBaseUrl({ BETTER_AUTH_URL: "https://citywalk.example/path" }),
    ).toBe("https://citywalk.example");
    expect(getCommerceBaseUrl({ VERCEL_URL: "preview.example.vercel.app" })).toBe(
      "https://preview.example.vercel.app",
    );
  });
});
