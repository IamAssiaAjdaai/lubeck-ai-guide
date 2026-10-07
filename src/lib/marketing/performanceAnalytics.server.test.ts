import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { captureMarketingFunnelEvent } from "@/lib/marketing/performanceAnalytics.server";

describe("Marketing funnel server analytics", () => {
  it("sends campaign attribution without personal data", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await captureMarketingFunnelEvent({ event: "walk_completed", city: "lubeck", source: "instagram", campaign: "two-hours-in-lubeck", contentId: "CW-LUB-TIME-001", landingVariant: "2-hours" }, { NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "token", NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" }, send);
    const body = String(send.mock.calls[0]?.[1]?.body);
    expect(body).toContain("walk_completed");
    expect(body).toContain("two-hours-in-lubeck");
    expect(body).not.toMatch(/email|user_id|auth|cookie/i);
  });
  it("does nothing without analytics configuration", async () => {
    const send = vi.fn();
    await captureMarketingFunnelEvent({ event: "walk_started", city: "lubeck" }, {}, send);
    expect(send).not.toHaveBeenCalled();
  });
});
