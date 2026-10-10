import { describe, expect, it } from "vitest";
import { hasUnsupportedYear } from "@/lib/guideGroundingGuard.server";
import type { GuideKnowledgeItem, ParsedGuideAnswer } from "@/lib/guideKnowledge.server";

const evidence: readonly GuideKnowledgeItem[] = [{
  role: "current",
  citySlug: "lubeck",
  placeSlug: "holstentor",
  retrieved: {
    score: 1,
    chunk: {
      id: "gate-history",
      citySlug: "lubeck",
      placeSlug: "holstentor",
      locale: "en",
      text: "The Holstentor was built between 1464 and 1478.",
      topics: ["history"],
      priority: 1,
      source: { label: "Test reference", url: "https://example.org", type: "reference", verifiedAt: "2026-01-01" },
    },
  },
}];
const answer = (text: string, usedChunkIds = ["gate-history"]): ParsedGuideAnswer => ({
  answer: text, groundingStatus: "grounded", usedChunkIds,
});

describe("grounded AI answer cited-year guard", () => {
  it("rejects unsupported fabricated dates", () => {
    expect(hasUnsupportedYear(answer("The Holstentor was built in 1900."), evidence)).toBe(true);
  });

  it("permits cited historical years", () => {
    expect(hasUnsupportedYear(answer("The gate was built between 1464 and 1478."), evidence)).toBe(false);
  });

  it("does not treat a year in unrelated, uncited evidence as support", () => {
    expect(hasUnsupportedYear(answer("The gate dates from 1900.", ["unrelated"]), evidence)).toBe(true);
  });

  it("does not apply the guard to safe insufficient-evidence responses", () => {
    const missing: ParsedGuideAnswer = { answer: "I cannot verify 1900.", groundingStatus: "insufficient_evidence", usedChunkIds: [] };
    expect(hasUnsupportedYear(missing, evidence)).toBe(false);
  });

  it("does not pretend to validate claims without four-digit years", () => {
    expect(hasUnsupportedYear(answer("The gate is made entirely of gold."), evidence)).toBe(false);
  });
});
