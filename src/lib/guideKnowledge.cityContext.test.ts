import { describe, expect, it } from "vitest";

import { lubeckKnowledgeChunks } from "@/data/knowledge/lubeck";
import {
  buildGuideSourceMetadata,
  retrieveGuideKnowledge,
} from "@/lib/guideKnowledge.server";
import type { VerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

const provider: VerifiedKnowledgeProvider = {
  async listVerifiedChunks(scope) {
    return lubeckKnowledgeChunks.filter((chunk) =>
      chunk.citySlug === scope.citySlug &&
      chunk.placeSlug === scope.placeSlug &&
      chunk.locale === scope.locale
    );
  },
};

async function ask(question: string, citySlug = "lubeck") {
  return retrieveGuideKnowledge({
    citySlug,
    currentPlaceSlug: "holstentor",
    visitedPlaceSlugs: [],
    question,
    provider,
  });
}

describe("verified city history for related concept questions", () => {
  it("retrieves an explanation of the Hanseatic era and Lübeck's role", async () => {
    const evidence = await ask("What is the Hanseatic era?");
    const background = evidence.filter((item) => item.role === "city");
    expect(background.map((item) => item.retrieved.chunk.id)).toEqual([
      "lubeck-hanseatic-network-context",
      "lubeck-hanseatic-city-context",
    ]);
    expect(background.every((item) => item.placeSlug === "__city_context__")).toBe(true);
    expect(background[0]?.retrieved.chunk.text).toContain("12th century");
    expect(background[1]?.retrieved.chunk.text).toContain("Lübeck");
    expect(evidence.some((item) => item.role === "current")).toBe(true);
  });

  it.each([
    "When was Holstentor built?",
    "Tell me about its history and architecture",
    "What is special about its towers?",
  ])("does not inject Hanseatic city background into an unrelated place question: %s", async (question) => {
    const evidence = await ask(question);
    expect(evidence.filter((item) => item.role === "city")).toHaveLength(0);
    expect(evidence.some((item) => item.role === "current")).toBe(true);
  });

  it("never retrieves Lübeck context for another city", async () => {
    const evidence = await ask("What is the Hanseatic era?", "hamburg");
    expect(evidence).toHaveLength(0);
  });

  it("keeps real sources attached to city context, not fabricated landmark citations", async () => {
    const evidence = await ask("What is the Hanseatic era?");
    const background = evidence.filter((item) => item.role === "city");
    const sources = buildGuideSourceMetadata(
      evidence,
      background.map((item) => item.retrieved.chunk.id),
    );
    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.url)).toEqual([
      "https://www.hanse.org/en/the-medieval-hanseatic-league",
      "https://www.hansemuseum.eu/en/",
    ]);
    expect(sources.every((source) => source.placeSlug === "__city_context__")).toBe(true);
  });
});
