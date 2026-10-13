import { describe, expect, it } from "vitest";

import {
  buildGuideSourceMetadata,
  parseGuideStructuredAnswer,
  type GuideKnowledgeItem,
} from "@/lib/guideKnowledge.server";

/**
 * AI grounding regression suite.
 *
 * Deliberately tests the deterministic server-side trust boundary rather than
 * assuming a language model's self-reported citations prove factual accuracy.
 * Run: npx vitest run src/lib/guideGrounding.audit.test.ts
 */
const evidence: readonly GuideKnowledgeItem[] = [
  {
    role: "current",
    citySlug: "lubeck",
    placeSlug: "holstentor",
    retrieved: {
      score: 10,
      chunk: {
        id: "verified-holstentor",
        citySlug: "lubeck",
        placeSlug: "holstentor",
        locale: "en",
        text: "Holstentor was built between 1464 and 1478.",
        topics: ["history"],
        priority: 1,
        source: {
          label: "Curated reference",
          url: "https://example.org/reference",
          type: "reference",
          verifiedAt: "2026-01-01",
        },
      },
    },
  },
];

const parse = (value: unknown) =>
  parseGuideStructuredAnswer(JSON.stringify(value), evidence);

describe("AI Guide grounding safety regression", () => {
  it("rejects invalid JSON and unexpected response shapes", () => {
    expect(parseGuideStructuredAnswer("{not json", evidence)).toBeNull();
    expect(parse({ answer: "", groundingStatus: "grounded", usedChunkIds: [] })).toBeNull();
    expect(parse({ answer: "Something", groundingStatus: "unknown", usedChunkIds: [] })).toBeNull();
    expect(parse({ answer: "Something", groundingStatus: "grounded", usedChunkIds: [42] })).toBeNull();
  });

  it("never exposes forged citations as sources", () => {
    const answer = parse({
      answer: "Verified statement.",
      groundingStatus: "grounded",
      usedChunkIds: ["forged-id", "verified-holstentor", "forged-id"],
    });
    expect(answer?.usedChunkIds).toEqual(["verified-holstentor"]);
    const sources = buildGuideSourceMetadata(evidence, answer?.usedChunkIds ?? []);
    expect(sources).toHaveLength(1);
    expect(sources[0].chunkIds).toEqual(["verified-holstentor"]);
    expect(JSON.stringify(sources)).not.toContain("forged-id");
  });

  it("does not turn insufficient evidence into a cited answer", () => {
    const answer = parse({
      answer: "I don't have enough verified information.",
      groundingStatus: "insufficient_evidence",
      usedChunkIds: ["verified-holstentor"],
    });
    expect(answer?.usedChunkIds).toEqual([]);
    expect(buildGuideSourceMetadata(evidence, answer?.usedChunkIds ?? [])).toEqual([]);
  });

  it("makes the semantic-grounding gap explicit for a follow-up audit", () => {
    // A real chunk ID is NOT proof that the answer's prose is supported.
    // This documents the current limitation, rather than claiming it is solved.
    const answer = parse({
      answer: "Holstentor was built in the year 1900.",
      groundingStatus: "grounded",
      usedChunkIds: ["verified-holstentor"],
    });
    expect(answer?.usedChunkIds).toEqual(["verified-holstentor"]);
    expect(evidence[0].retrieved.chunk.text).not.toContain("1900");
  });
});
