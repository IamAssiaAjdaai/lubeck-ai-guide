import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildGuideSourceMetadata,
  retrieveGuideKnowledge,
} from "@/lib/guideKnowledge.server";

describe(
  "retrieveGuideKnowledge",
  () => {
    it(
      "retrieves current and visited stop knowledge only",
      () => {
        const result =
          retrieveGuideKnowledge({
            currentPlaceSlug:
              "rathaus",

            visitedPlaceSlugs: [
              "holstentor",
              "marienkirche",
            ],

            question:
              "How does this connect to the earlier stops?",
          });

        expect(
          result.some(
            (item) =>
              item.role ===
                "current" &&
              item.placeSlug ===
                "rathaus",
          ),
        ).toBe(true);

        expect(
          result.some(
            (item) =>
              item.role ===
                "visited" &&
              item.placeSlug ===
                "holstentor",
          ),
        ).toBe(true);

        expect(
          result.some(
            (item) =>
              item.placeSlug ===
              "marienkirche",
          ),
        ).toBe(true);

        expect(
          result.some(
            (item) =>
              item.placeSlug ===
              "heiligen-geist-hospital",
          ),
        ).toBe(false);
      },
    );

    it(
      "does not duplicate the current stop as visited",
      () => {
        const result =
          retrieveGuideKnowledge({
            currentPlaceSlug:
              "holstentor",

            visitedPlaceSlugs: [
              "holstentor",
            ],

            question:
              "Why is this important?",
          });

        expect(
          result.some(
            (item) =>
              item.role ===
              "visited",
          ),
        ).toBe(false);
      },
    );

    it(
        "builds deduplicated safe source metadata",
        () => {
          const knowledge =
            retrieveGuideKnowledge({
              currentPlaceSlug:
                "holstentor",

              visitedPlaceSlugs:
                [],

              question:
                "Tell me about its history and architecture",
            });

          const sources =
            buildGuideSourceMetadata(
              knowledge,
            );

          expect(
            sources.length,
          ).toBeGreaterThan(0);

          expect(
            sources.every(
              (source) =>
                source.placeSlug ===
                "holstentor",
            ),
          ).toBe(true);

          expect(
            sources.every(
              (source) =>
                source.url.startsWith(
                  "https://",
                ),
            ),
          ).toBe(true);

          expect(
            sources.every(
              (source) =>
                source.chunkIds.length >
                0,
            ),
          ).toBe(true);

          expect(
            new Set(
              sources.map(
                (source) =>
                  `${source.placeSlug}:${source.url}`,
              ),
            ).size,
          ).toBe(
            sources.length,
          );
        },
      );
  },
);