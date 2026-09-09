import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { captureVerifiedEntitlementGrant } from "@/lib/commerce/analytics.server";

describe("commerce server analytics", () => {
  it("emits only aggregate verified entitlement metadata", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await captureVerifiedEntitlementGrant(
      { scopeType: "city", scopeKey: "lubeck", durationDays: 3 },
      {
        NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "project-token",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
      },
      send,
    );
    const body = String(send.mock.calls[0]?.[1]?.body);
    expect(body).toContain("entitlement_granted");
    expect(body).toContain("city:lubeck");
    expect(body).toContain("72");
    expect(body).not.toMatch(/email|payment|stripe|user_id|auth/i);
  });

  it("does nothing without analytics configuration", async () => {
    const send = vi.fn();
    await captureVerifiedEntitlementGrant(
      { scopeType: "city", scopeKey: "lubeck", durationDays: 3 },
      {},
      send,
    );
    expect(send).not.toHaveBeenCalled();
  });
});

