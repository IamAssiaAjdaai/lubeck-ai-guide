import {
  describe,
  expect,
  it,
} from "vitest";

import {
  retrieveVerifiedKnowledge,
} from "@/lib/knowledgeRetriever.server";

describe(
  "retrieveVerifiedKnowledge",
  () => {
    it(
      "retrieves relevant knowledge for the current place",
      () => {
        const result =
          retrieveVerifiedKnowledge({
            city: "lubeck",

            placeSlug:
              "heiligen-geist-hospital",

            locale: "en",

            question:
              "When was the hospital established?",

            limit: 2,
          });

        expect(
          result.length,
        ).toBeGreaterThan(0);

        expect(
          result[0].chunk.id,
        ).toBe(
          "hospital-foundation",
        );

        expect(
          result.every(
            ({ chunk }) =>
              chunk.placeSlug ===
              "heiligen-geist-hospital",
          ),
        ).toBe(true);
      },
    );

    it(
      "uses priority fallback for generic questions",
      () => {
        const result =
          retrieveVerifiedKnowledge({
            city: "lubeck",

            placeSlug:
              "heiligen-geist-hospital",

            locale: "en",

            question:
              "Why is it famous?",

            limit: 1,
          });

        expect(
          result,
        ).toHaveLength(1);

        expect(
          result[0].chunk.id,
        ).toBe(
          "hospital-foundation",
        );
      },
    );

    it(
      "never leaks knowledge from another place",
      () => {
        const result =
          retrieveVerifiedKnowledge({
            city: "lubeck",

            placeSlug:
              "holstentor",

            locale: "en",

            question:
              "What happened in 1942?",

            limit: 5,
          });

        expect(
          result.every(
            ({ chunk }) =>
              chunk.placeSlug ===
              "holstentor",
          ),
        ).toBe(true);

        expect(
          result.some(
            ({ chunk }) =>
              chunk.id ===
              "marienkirche-1942",
          ),
        ).toBe(false);
      },
    );

    it(
      "does not silently use knowledge from another locale",
      () => {
        const result =
          retrieveVerifiedKnowledge({
            city: "lubeck",

            placeSlug:
              "holstentor",

            locale: "fr",

            question:
              "Pourquoi est-il important ?",
          });

        expect(
          result,
        ).toEqual([]);
      },
    );

    it(
      "returns provenance with every retrieved chunk",
      () => {
        const result =
          retrieveVerifiedKnowledge({
            city: "lubeck",

            placeSlug:
              "buddenbrookhaus",

            locale: "en",

            question:
              "What is the literary connection?",

            limit: 1,
          });

        expect(
          result[0].chunk
            .source.type,
        ).toBe("official");

        expect(
          result[0].chunk
            .source.url,
        ).toMatch(
          /^https:\/\//,
        );

        expect(
          result[0].chunk
            .source.verifiedAt,
        ).toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        );
      },
    );

    it(
      "respects the requested result limit",
      () => {
        const result =
          retrieveVerifiedKnowledge({
            city: "lubeck",

            placeSlug:
              "rathaus",

            locale: "en",

            question:
              "Tell me about the history and architecture",

            limit: 1,
          });

        expect(
          result,
        ).toHaveLength(1);
      },
    );
  },
);