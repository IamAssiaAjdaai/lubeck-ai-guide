import { describe, expect, it } from "vitest";

import { CitywalkApiError } from "../src/lib/api/client";
import { canSubmitGuideQuestion, classifyGuideFailure, isGuideAllowanceExhausted } from "../src/lib/guideFailure";
import { guideUpgradePath } from "../src/lib/guideUpgrade";

const free = { kind: "daily_guide", tier: "free", limit: 3, remaining: 0, resetAt: 1_800_000_000_000 } as const;
const premium = { ...free, tier: "premium", limit: 20 } as const;

describe("native guide limit and retry policy", () => {
  it("recognizes only coded, authoritative daily exhaustion", () => {
    expect(classifyGuideFailure(new CitywalkApiError(429, "limit", "guide_daily_allowance_reached", free))).toBe("daily_allowance");
    expect(isGuideAllowanceExhausted(free)).toBe(true);
    expect(isGuideAllowanceExhausted(premium)).toBe(true);
    expect(free.limit).toBe(3);
    expect(premium.limit).toBe(20);
    expect(classifyGuideFailure(new CitywalkApiError(429, "unknown"))).toBe("technical");
    expect(classifyGuideFailure(new CitywalkApiError(429, "limit", "guide_daily_allowance_reached"))).toBe("technical");
  });

  it("keeps abuse and unexpected transport/server failures distinct", () => {
    expect(classifyGuideFailure(new CitywalkApiError(429, "abuse", "guide_abuse_rate_limited"))).toBe("abuse_limit");
    expect(classifyGuideFailure(new Error("network"))).toBe("technical");
    expect(classifyGuideFailure(new CitywalkApiError(502, "backend"))).toBe("technical");
  });

  it("links only configured City Pass cities to the existing web checkout entry", () => {
    expect(guideUpgradePath("lubeck", "de")).toBe("/de/pass/lubeck");
    expect(guideUpgradePath("test-city", "en")).toBeUndefined();
    expect(guideUpgradePath("../admin", "en")).toBeUndefined();
  });

  it("suppresses repeated daily submits but keeps abuse and technical retries available", () => {
    const base = { busy: false, hydrated: true, question: "Can you explain?" } as const;
    expect(canSubmitGuideQuestion({ ...base, allowance: free })).toBe(false);
    expect(canSubmitGuideQuestion({ ...base, failure: "daily_allowance" })).toBe(false);
    expect(canSubmitGuideQuestion({ ...base, allowance: premium })).toBe(false);
    expect(canSubmitGuideQuestion({ ...base, failure: "abuse_limit" })).toBe(true);
    expect(canSubmitGuideQuestion({ ...base, failure: "technical" })).toBe(true);
    expect(canSubmitGuideQuestion({ ...base, busy: true })).toBe(false);
    expect(canSubmitGuideQuestion({ ...base, hydrated: false })).toBe(false);
    expect(canSubmitGuideQuestion({ ...base, question: "  " })).toBe(false);
  });
});
