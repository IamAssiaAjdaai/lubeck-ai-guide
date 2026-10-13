import { describe, expect, it } from "vitest";
import { hasUnsupportedYear } from "@/lib/guideGroundingGuard.server";
import type { GuideKnowledgeItem, ParsedGuideAnswer } from "@/lib/guideKnowledge.server";

/**
 * Deterministic evaluation, NOT a live-LLM benchmark or semantic proof.
 * expectedUnsafe labels are based on the one supplied evidence snippet.
 * A false negative is unsafe text the narrow guard fails to flag.
 */
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
      source: { label: "Fixture reference", url: "https://example.org/holstentor", type: "reference", verifiedAt: "2026-01-01" },
    },
  },
}];

const cases: readonly { name: string; answer: string; unsafe: boolean }[] = [
  { name: "supported English range", answer: "It was built between 1464 and 1478.", unsafe: false },
  { name: "supported German range", answer: "Das Tor wurde zwischen 1464 und 1478 erbaut.", unsafe: false },
  { name: "valid question", answer: "Was it built in 1900?", unsafe: false },
  { name: "valid German question", answer: "Wurde es 1900 erbaut?", unsafe: false },
  { name: "valid modern contextual year", answer: "In 2026, you can ask about its history.", unsafe: false },
  { name: "unsupported invented date", answer: "The gate was built in 1900.", unsafe: true },
  { name: "unsupported date in German", answer: "Das Tor wurde 1900 erbaut.", unsafe: true },
  { name: "unsupported year after question", answer: "Was it built in 1900? It was built in 1900.", unsafe: true },
  { name: "unsupported future year", answer: "It was built in 2500.", unsafe: true },
  { name: "unsupported date expressed in words", answer: "It was built in nineteen hundred.", unsafe: true },
  { name: "unsupported material without dates", answer: "The gate is made entirely of gold.", unsafe: true },
  { name: "supported dates with invented historical claim", answer: "In 1464, the gate was constructed by aliens.", unsafe: true },
];

function evaluate() {
  const counts = { tp: 0, fp: 0, tn: 0, fn: 0 };
  const predictions = cases.map((item) => {
    const response: ParsedGuideAnswer = {
      answer: item.answer,
      groundingStatus: "grounded",
      usedChunkIds: ["gate-history"],
    };
    const flagged = hasUnsupportedYear(response, evidence);
    if (flagged && item.unsafe) counts.tp++;
    else if (flagged && !item.unsafe) counts.fp++;
    else if (!flagged && item.unsafe) counts.fn++;
    else counts.tn++;
    return { ...item, flagged };
  });
  return {
    counts,
    predictions,
    precision: counts.tp / (counts.tp + counts.fp),
    recall: counts.tp / (counts.tp + counts.fn),
    falsePositiveRate: counts.fp / (counts.fp + counts.tn),
  };
}

describe("AI year guard: labeled deterministic evaluation", () => {
  it("pins the baseline confusion matrix so future changes are measurable", () => {
    const report = evaluate();
    expect(report.predictions).toHaveLength(12);
    expect(report.counts).toEqual({ tp: 4, fp: 1, tn: 4, fn: 3 });
    expect(report.precision).toBeCloseTo(0.8);
    expect(report.recall).toBeCloseTo(4 / 7);
    expect(report.falsePositiveRate).toBeCloseTo(0.2);
  });

  it("keeps known semantic misses visible rather than claiming complete verification", () => {
    const report = evaluate();
    expect(report.predictions.filter((x) => x.unsafe && !x.flagged).map((x) => x.name)).toEqual([
      "unsupported date expressed in words",
      "unsupported material without dates",
      "supported dates with invented historical claim",
    ]);
  });
});
