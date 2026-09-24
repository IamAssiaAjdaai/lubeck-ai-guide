import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildGuideSourceMetadata,
  parseGuideStructuredAnswer,
  retrieveGuideKnowledge,
} from "@/lib/guideKnowledge.server";
import { StaticVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

const provider = new StaticVerifiedKnowledgeProvider();

async function retrieve(
  currentPlaceSlug: string,
  visitedPlaceSlugs: readonly string[],
  question: string,
) {
  return retrieveGuideKnowledge({
    citySlug: "lubeck",
    currentPlaceSlug,
    visitedPlaceSlugs,
    question,
    provider,
  });
}

describe("retrieveGuideKnowledge", () => {
  it("retrieves current and visited place knowledge only", async () => {
    const result = await retrieve(
      "rathaus",
      ["holstentor", "marienkirche"],
      "How does this connect to the earlier stops?",
    );

    expect(result.some((item) => item.role === "current" && item.placeSlug === "rathaus")).toBe(true);
    expect(result.some((item) => item.role === "visited" && item.placeSlug === "holstentor")).toBe(true);
    expect(result.some((item) => item.placeSlug === "marienkirche")).toBe(true);
    expect(result.some((item) => item.placeSlug === "heiligen-geist-hospital")).toBe(false);
    expect(result.every((item) => item.citySlug === "lubeck")).toBe(true);
  });

  it("does not duplicate the current place as visited", async () => {
    const result = await retrieve("holstentor", ["holstentor"], "Why is this important?");
    expect(result.some((item) => item.role === "visited")).toBe(false);
  });

  it("builds deduplicated privacy-safe generic source metadata", async () => {
    const knowledge = await retrieve(
      "holstentor",
      [],
      "Tell me about its history and architecture",
    );
    const sources = buildGuideSourceMetadata(
      knowledge,
      knowledge.map((item) => item.retrieved.chunk.id),
    );

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((source) => source.citySlug === "lubeck")).toBe(true);
    expect(sources.every((source) => source.placeSlug === "holstentor")).toBe(true);
    expect(sources.every((source) => source.url.startsWith("https://"))).toBe(true);
    expect(sources.every((source) => source.chunkIds.length > 0)).toBe(true);
    for (const source of sources) {
      expect(Object.keys(source).sort()).toEqual([
        "chunkIds",
        "citySlug",
        "label",
        "placeSlug",
        "url",
        "verifiedAt",
      ].sort());
    }
  });

  it("accepts only attributed IDs present in the retrieved knowledge", async () => {
    const knowledge = await retrieve(
      "rathaus",
      ["holstentor", "marienkirche"],
      "How does this connect to earlier stops?",
    );
    const parsed = parseGuideStructuredAnswer(
      JSON.stringify({
        answer: "The Rathaus remains a seat of city administration.",
        groundingStatus: "grounded",
        usedChunkIds: ["rathaus-political-role", "fake-chunk"],
      }),
      knowledge,
    );

    expect(parsed?.usedChunkIds).toEqual(["rathaus-political-role"]);
    const sources = buildGuideSourceMetadata(knowledge, parsed?.usedChunkIds ?? []);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ citySlug: "lubeck", placeSlug: "rathaus" });
  });

  it("allows insufficient evidence without sources", async () => {
    const knowledge = await retrieve("holstentor", [], "When was it built?");
    const parsed = parseGuideStructuredAnswer(
      JSON.stringify({
        answer: "I do not have enough verified information.",
        groundingStatus: "insufficient_evidence",
        usedChunkIds: [],
      }),
      knowledge,
    );

    expect(parsed?.usedChunkIds).toEqual([]);
    expect(buildGuideSourceMetadata(knowledge, parsed?.usedChunkIds ?? [])).toEqual([]);
  });

  it("rejects obsolete free-text attribution responses", async () => {
    const knowledge = await retrieve("holstentor", [], "When was it built?");
    expect(parseGuideStructuredAnswer(
      "The Holstentor was built between 1464 and 1478.\n[[SOURCES:holstentor-history]]",
      knowledge,
    )).toBeNull();
  });
});
