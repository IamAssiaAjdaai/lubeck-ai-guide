import { describe, expect, it } from "vitest";

import {
  buildGuideSourceMetadata,
  parseGuideAnswerAttribution,
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

    const parsed = parseGuideAnswerAttribution(
      [
        "The Rathaus remains a seat of city administration.",
        "",
        "[[SOURCES:rathaus-political-role,fake-chunk]]",
      ].join("\n"),
      knowledge,
    );

    expect(parsed.answer).toBe(
      "The Rathaus remains a seat of city administration.",
    );

    expect(parsed.usedChunkIds).toEqual(["rathaus-political-role"]);

    const sources = buildGuideSourceMetadata(knowledge, parsed.usedChunkIds);

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
  it(
  "returns no attributed sources when the model provides no source marker",
  () => {
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
      parseGuideAnswerAttribution(
        "The Holstentor was built between 1464 and 1478.",
        knowledge,
      );

    expect(
      parsed.answer,
    ).toBe(
      "The Holstentor was built between 1464 and 1478.",
    );

    expect(
      parsed.usedChunkIds,
    ).toEqual([]);

    expect(
      buildGuideSourceMetadata(
        knowledge,
        parsed.usedChunkIds,
      ),
    ).toEqual([]);
  },
);
});