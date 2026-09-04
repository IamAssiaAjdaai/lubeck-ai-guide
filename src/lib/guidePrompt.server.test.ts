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

        expect(prompt).toContain(
          "Never describe a remaining or next stop as already visited",
        );

        expect(prompt).toContain(
          "Do not infer walking distance",
        );

        expect(prompt).toContain(
          "Every factual statement in the answer must be directly supported",
        );

        expect(prompt).toContain(
          "TOUR STATE is navigation state only",
        );

        expect(prompt).toContain(
          "Do not treat that stop as visited unless it also appears under VISITED STOPS",
        );

        expect(prompt).toContain(
          "Do NOT print or label these steps",
        );

        expect(prompt).toContain(
          "Preserve the strength of verified wording",
        );

        expect(prompt).toContain(
          "Never use proximity or geographic claims",
        );

        expect(prompt).toContain(
            "NEXT STOP — TRANSITION ONLY",
        );

        expect(prompt).toContain(
            "VISITED STOP",
        );

        expect(prompt).toContain(
            "A stop may be described as VISITED only if it appears under VISITED STOPS",
        );
      },
    );
  },
);