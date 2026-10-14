// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => vi.fn());
vi.mock("@/lib/marketing/performanceAnalytics.server", () => ({ captureMarketingFunnelEvent: capture }));
import { POST } from "./route";

function request(body: unknown, consent?: string) {
  return new Request("https://example.test/api/analytics/marketing-funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(consent ? { "X-Citywalk-Analytics-Consent": consent } : {}) },
    body: JSON.stringify(body),
  });
}

describe("native funnel consent boundary", () => {
  beforeEach(() => capture.mockReset());

  it.each([undefined, "denied", "unset", "true"])("drops events without an explicit grant: %s", async consent => {
    const response = await POST(request({ event: "walk_started", city: "lubeck" }, consent));
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(capture).not.toHaveBeenCalled();
  });

  it("forwards only allowlisted attribution after an explicit grant", async () => {
    const response = await POST(request({
      event: "walk_completed", city: "lubeck", campaign: "launch",
      email: "synthetic@example.test", latitude: 53, token: "synthetic",
    }, "granted"));
    expect(response.status).toBe(204);
    expect(capture).toHaveBeenCalledExactlyOnceWith({ event: "walk_completed", city: "lubeck", campaign: "launch" });
  });

  it.each([
    { event: "unapproved", city: "lubeck" },
    { event: "walk_started", city: "lubeck", campaign: "synthetic@example.test" },
    { event: "walk_started", city: "lubeck", source: "x".repeat(129) },
    { event: "walk_started", city: "" },
  ])("rejects invalid consented payloads", async body => {
    expect((await POST(request(body, "granted"))).status).toBe(400);
    expect(capture).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and unsupported content types", async () => {
    for (const [type, body, status] of [["text/plain", "{}", 415], ["application/json", "{", 400]] as const) {
      const response = await POST(new Request("https://example.test", {
        method: "POST", headers: { "Content-Type": type, "X-Citywalk-Analytics-Consent": "granted" }, body,
      }));
      expect(response.status).toBe(status);
    }
    expect(capture).not.toHaveBeenCalled();
  });
});
