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

  it("allows repeated and reordered years when both are cited", () => {
    expect(hasUnsupportedYear(answer("Between 1478 and 1464, the gate was built."), evidence)).toBe(false);
  });

  it("rejects a partially supported year range", () => {
    expect(hasUnsupportedYear(answer("The gate was built between 1464 and 1900."), evidence)).toBe(true);
  });

  it("documents a conservative false positive for otherwise harmless contextual dates", () => {
    // The guard has no semantic attribution: a year unrelated to the monument
    // is still blocked unless it occurs in the cited historical evidence.
    expect(hasUnsupportedYear(answer("In 2026, you can ask about the gate."), evidence)).toBe(true);
  });

  it("does not treat a standalone historical question as an assertion", () => {
    expect(hasUnsupportedYear(answer("Was the gate built in 1900?"), evidence)).toBe(false);
  });

  it("still rejects an unsupported assertion after a question", () => {
    expect(hasUnsupportedYear(answer("Was it built in 1900? It was constructed in 1900."), evidence)).toBe(true);
  });

  it("allows a cited answer following an unsupported question", () => {
    expect(hasUnsupportedYear(answer("Was it built in 1900? The sources say 1464 to 1478."), evidence)).toBe(false);
  });

  it("rejects a fabricated assertion even when followed by a question", () => {
    expect(hasUnsupportedYear(answer("The gate was built in 1900. Did you know that?"), evidence)).toBe(true);
  });

  it("rejects fabricated dates between two questions", () => {
    expect(hasUnsupportedYear(answer("Was it built in 1900? It was built in 1900. Really?"), evidence)).toBe(true);
  });

  it("does not reject a standalone question containing an unsupported year", () => {
    expect(hasUnsupportedYear(answer("Could it have been built in 1900?"), evidence)).toBe(false);
  });

  it.each([
    ["EN invented statement", "The gate was built in 1900!", true],
    ["DE invented statement", "Das Holstentor wurde 1900 erbaut!", true],
    ["DE verified historical range", "Das Tor wurde zwischen 1464 und 1478 erbaut.", false],
    ["DE unsupported follow-up after a question", "Wurde es 1900 erbaut? Es stammt aus dem Jahr 1900!", true],
    ["EN supported fact after unsupported question", "Was it built in 1900? It was built between 1464 and 1478.", false],
    ["EN unsupported after exclamation", "Amazing! It was built in 1900.", true],
    ["DE standalone question", "Wurde das Tor im Jahr 1900 erbaut?", false],
    ["EN supported multiline answer", "The gate was built in 1464.\\nWork ended in 1478.", false],
  ] as const)("handles multilingual punctuation: %s", (_name, message, expected) => {
    expect(hasUnsupportedYear(answer(message), evidence)).toBe(expected);
  });

  it("does not pretend to validate claims without four-digit years", () => {
    expect(hasUnsupportedYear(answer("The gate is made entirely of gold."), evidence)).toBe(false);
  });
});
