import { describe, expect, it } from "vitest";

import {
  buildGuideSourceMetadata,
  parseGuideStructuredAnswer,
  retrieveGuideKnowledge,
} from "@/lib/guideKnowledge.server";

describe("retrieveGuideKnowledge", () => {
  it("retrieves current and visited stop knowledge only", () => {
    const result = retrieveGuideKnowledge({
      currentPlaceSlug: "rathaus",

      visitedPlaceSlugs: ["holstentor", "marienkirche"],

      question: "How does this connect to the earlier stops?",
    });

    expect(
      result.some(
        (item) => item.role === "current" && item.placeSlug === "rathaus",
      ),
    ).toBe(true);

    expect(
      result.some(
        (item) => item.role === "visited" && item.placeSlug === "holstentor",
      ),
    ).toBe(true);

    expect(result.some((item) => item.placeSlug === "marienkirche")).toBe(true);

    expect(
      result.some((item) => item.placeSlug === "heiligen-geist-hospital"),
    ).toBe(false);
  });
  it("does not duplicate the current stop as visited", () => {
    const result = retrieveGuideKnowledge({
      currentPlaceSlug: "holstentor",

      visitedPlaceSlugs: ["holstentor"],

      question: "Why is this important?",
    });

    expect(result.some((item) => item.role === "visited")).toBe(false);
  });
  it("builds deduplicated safe source metadata", () => {
    const knowledge = retrieveGuideKnowledge({
      currentPlaceSlug: "holstentor",

      visitedPlaceSlugs: [],

      question: "Tell me about its history and architecture",
    });

    const usedChunkIds = knowledge.map((item) => item.retrieved.chunk.id);

    const sources = buildGuideSourceMetadata(knowledge, usedChunkIds);

    expect(sources.length).toBeGreaterThan(0);

    expect(sources.every((source) => source.placeSlug === "holstentor")).toBe(
      true,
    );

    expect(sources.every((source) => source.url.startsWith("https://"))).toBe(
      true,
    );

    expect(sources.every((source) => source.chunkIds.length > 0)).toBe(true);

    expect(
      new Set(sources.map((source) => `${source.placeSlug}:${source.url}`))
        .size,
    ).toBe(sources.length);
  });
  it("returns sources only for chunks actually attributed by the AI", () => {
    const knowledge = retrieveGuideKnowledge({
      currentPlaceSlug: "rathaus",

      visitedPlaceSlugs: ["holstentor", "marienkirche"],

      question: "How does this connect to earlier stops?",
    });

    const parsed = parseGuideStructuredAnswer(
      JSON.stringify({
        answer: "The Rathaus remains a seat of city administration.",

        groundingStatus: "grounded",

        usedChunkIds: ["rathaus-political-role", "fake-chunk"],
      }),
      knowledge,
    );

    expect(parsed?.answer).toBe(
      "The Rathaus remains a seat of city administration.",
    );

    expect(parsed?.groundingStatus).toBe("grounded");

    expect(parsed?.usedChunkIds).toEqual(["rathaus-political-role"]);

    const sources = buildGuideSourceMetadata(
      knowledge,
      parsed?.usedChunkIds ?? [],
    );

    expect(sources).toHaveLength(1);

    expect(sources[0].placeSlug).toBe("rathaus");

    expect(sources[0].chunkIds).toEqual(["rathaus-political-role"]);

    expect(sources.some((source) => source.placeSlug === "holstentor")).toBe(
      false,
    );

    expect(sources.some((source) => source.placeSlug === "marienkirche")).toBe(
      false,
    );
  });
  it("accepts insufficient evidence without attributed chunks", () => {
    const knowledge =
      retrieveGuideKnowledge({
        currentPlaceSlug:
          "holstentor",

        visitedPlaceSlugs:
          [],

        question:
          "When was it built?",
      });

    const parsed =
      parseGuideStructuredAnswer(
        JSON.stringify({
          answer: "I do not have enough verified information.",

          groundingStatus: "insufficient_evidence",

          usedChunkIds: [],
        }),
        knowledge,
      );

    expect(
      parsed?.answer,
    ).toBe(
      "I do not have enough verified information.",
    );

    expect(
      parsed?.usedChunkIds,
    ).toEqual([]);

    expect(
      buildGuideSourceMetadata(
        knowledge,
        parsed?.usedChunkIds ?? [],
      ),
    ).toEqual([]);
  });

  it("rejects obsolete free-text attribution responses", () => {
    const knowledge = retrieveGuideKnowledge({
      currentPlaceSlug: "holstentor",

      visitedPlaceSlugs: [],

      question: "When was it built?",
    });

    expect(
      parseGuideStructuredAnswer(
        [
          "The Holstentor was built between 1464 and 1478.",
          "[[SOURCES:holstentor-history]]",
        ].join("\n"),
        knowledge,
      ),
    ).toBeNull();
  });
});
