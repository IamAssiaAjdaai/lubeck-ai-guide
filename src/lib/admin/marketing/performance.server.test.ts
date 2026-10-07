import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getMarketingPerformance } from "@/lib/admin/marketing/performance.server";

describe("Marketing performance query", () => {
  it("stays unconfigured without server-only read credentials", async () => {
    const send = vi.fn();
    await expect(getMarketingPerformance("lubeck", {}, send)).resolves.toEqual({ status: "not_configured", days: 30 });
    expect(send).not.toHaveBeenCalled();
  });

  it("maps PostHog funnel counts for a city", async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [["landing_view", 100], ["build_walk_clicked", 40], ["walk_started", 20], ["walk_completed", 12]] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const result = await getMarketingPerformance("lubeck", {
      CITYWALK_POSTHOG_QUERY_HOST: "https://eu.posthog.com",
      CITYWALK_POSTHOG_PROJECT_ID: "123",
      CITYWALK_POSTHOG_PERSONAL_API_KEY: "secret",
    }, send);
    expect(result).toEqual({ status: "ready", days: 30, landingViews: 100, buildWalkClicks: 40, walksStarted: 20, walksCompleted: 12 });
    const request = JSON.parse(String(send.mock.calls[0]?.[1]?.body));
    expect(request.query.values).toEqual({ city: "lubeck" });
    expect(String(send.mock.calls[0]?.[1]?.headers?.Authorization)).toBe("Bearer secret");
  });
});
