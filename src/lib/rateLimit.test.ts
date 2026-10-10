import { beforeEach, describe, expect, it, vi } from "vitest";

const consumeDatabaseRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/databaseRateLimit.server", () => ({ consumeDatabaseRateLimit }));

import {
  AI_GUIDE_GLOBAL_DAILY_ATTEMPT_CAP,
  aiGuideGlobalProviderBudget,
  aiGuideRateLimit,
  getAiGuideDailyRateLimit,
} from "./rateLimit";

describe("AI guide global and per-visitor budgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeDatabaseRateLimit.mockResolvedValue({
      success: true,
      limit: 120,
      remaining: 119,
      reset: Date.now() + 60_000,
    });
  });

  it("uses one global provider budget independent of the city and visitor", async () => {
    await aiGuideGlobalProviderBudget.limit();
    expect(AI_GUIDE_GLOBAL_DAILY_ATTEMPT_CAP).toBe(120);
    expect(consumeDatabaseRateLimit).toHaveBeenCalledWith({
      scope: "citywalk-ai-guide-provider-attempts-global-v1",
      identifier: "all-visitors",
      maxRequests: 120,
      windowMs: 86_400_000,
    });
  });

  it("preserves the per-identity ten-request short window", async () => {
    await aiGuideRateLimit.limit("cloudflare:203.0.113.10");
    expect(consumeDatabaseRateLimit).toHaveBeenCalledWith({
      scope: "citywalk-ai-guide-abuse",
      identifier: "cloudflare:203.0.113.10",
      maxRequests: 10,
      windowMs: 600_000,
    });
  });

  it("preserves the tier-specific 24-hour allowance", async () => {
    await getAiGuideDailyRateLimit("free", 3).limit("lubeck:visitor:hashed");
    expect(consumeDatabaseRateLimit).toHaveBeenCalledWith({
      scope: "citywalk-ai-free-3-daily",
      identifier: "lubeck:visitor:hashed",
      maxRequests: 3,
      windowMs: 86_400_000,
    });
  });

  it("propagates unavailable-database failures instead of failing open", async () => {
    consumeDatabaseRateLimit.mockRejectedValueOnce(new Error("RATE_LIMIT_UNAVAILABLE"));
    await expect(aiGuideGlobalProviderBudget.limit()).rejects.toThrow("RATE_LIMIT_UNAVAILABLE");
  });
});
