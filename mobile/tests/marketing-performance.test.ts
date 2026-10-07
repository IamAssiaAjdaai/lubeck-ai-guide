import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(async (key: string) => storage.get(key) ?? null), setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }) } }));
vi.mock("../src/lib/api/environment", () => ({ getConfiguredApiOrigin: () => "https://getcitywalk.com" }));
import { persistNativeMarketingAttribution } from "../src/lib/marketingAttribution";
import { captureNativeMarketingFunnelEvent } from "../src/lib/marketingPerformance";

describe("native Marketing performance", () => {
  beforeEach(() => { storage.clear(); vi.clearAllMocks(); });
  it("forwards stored attribution for the matching city", async () => {
    await persistNativeMarketingAttribution({ citySlug: "lubeck", source: "instagram", campaign: "two-hours-in-lubeck", landingVariant: "2-hours" });
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await captureNativeMarketingFunnelEvent("walk_started", "lubeck", send);
    expect(send).toHaveBeenCalledOnce();
    expect(String(send.mock.calls[0]?.[0])).toBe("https://getcitywalk.com/api/analytics/marketing-funnel");
    expect(String(send.mock.calls[0]?.[1]?.body)).toContain("walk_started");
  });
  it("does not attribute another city", async () => {
    await persistNativeMarketingAttribution({ citySlug: "lubeck", source: "instagram" });
    const send = vi.fn();
    await captureNativeMarketingFunnelEvent("walk_completed", "hamburg", send);
    expect(send).not.toHaveBeenCalled();
  });
});
