import {
  describe,
  expect,
  it,
} from "vitest";

import {
  lubeckLandmarks,
} from "@/data/places";

import {
  buildGuideSystemPrompt,
} from "@/lib/guidePrompt.server";

import {
  resolveTourContext,
} from "@/lib/tourContext.server";

import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";

function getLandmark(
  slug: string,
) {
  const place =
    lubeckLandmarks.find(
      (item) =>
        item.slug === slug,
    );

  if (!place) {
    throw new Error(
      `Missing landmark ${slug}`,
    );
  }

  return place;
}

describe(
  "buildGuideSystemPrompt",
  () => {
    it(
      "builds a grounded multi-stop guide prompt",
      () => {
        const tourContext =
          resolveTourContext({
            input: {
              version:
                TOUR_CONTEXT_VERSION,
              tourId:
                LUBECK_HISTORIC_TOUR_ID,
              currentStop:
                "rathaus",
              visitedStops: [
                "holstentor",
                "marienkirche",
              ],
            },
            locale: "en",
            expectedCurrentStop:
              "rathaus",
          });

        const prompt =
          buildGuideSystemPrompt({
            currentLandmark:
              getLandmark(
                "rathaus",
              ),
            locale: "en",
            tourContext,
          });

        expect(prompt).toContain(
          "3 of 5",
        );

        expect(prompt).toContain(
          "Holstentor",
        );

        expect(prompt).toContain(
          "Marienkirche",
        );

        expect(prompt).toContain(
          "Heiligen-Geist-Hospital",
        );

        /*
         * Verified previous-stop
         * historical content is available
         * to support real connections.
         */
        expect(prompt).toContain(
          "1464",
        );

        /*
         * Rathaus has an explicit
         * verified observation cue.
         */
        expect(prompt).toContain(
          "the mix of Brick Gothic and Renaissance architecture",
        );

        expect(prompt).not.toMatch(
          /latitude|longitude|"lat"|"lng"/i,
        );
      },
    );

    it(
      "keeps legacy requests functional without tour context",
      () => {
        const prompt =
          buildGuideSystemPrompt({
            currentLandmark:
              getLandmark(
                "holstentor",
              ),
            locale: "en",
            tourContext: null,
          });

        expect(prompt).toContain(
          "Holstentor",
        );

        expect(prompt).toContain(
          "No active tour context.",
        );

        expect(prompt).not.toMatch(
          /latitude|longitude|"lat"|"lng"/i,
        );
      },
    );

    it(
      "does not invent visual cues",
      () => {
        const tourContext =
          resolveTourContext({
            input: {
              version: 1,
              tourId:
                LUBECK_HISTORIC_TOUR_ID,
              currentStop:
                "holstentor",
              visitedStops: [],
            },
            locale: "en",
            expectedCurrentStop:
              "holstentor",
          });

        const prompt =
          buildGuideSystemPrompt({
            currentLandmark:
              getLandmark(
                "holstentor",
              ),
            locale: "en",
            tourContext,
          });

        expect(prompt).toContain(
          "VERIFIED LOOK-FOR CUES:\nNone",
        );
      },
    );
  },
);