import { describe, expect, it } from "vitest";

import { lubeckLandmarks } from "@/data/places";

import { buildGuideSystemPrompt } from "@/lib/guidePrompt.server";

import { retrieveGuideKnowledge } from "@/lib/guideKnowledge.server";

import { resolveTourContext } from "@/lib/tourContext.server";

import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";

function getLandmark(slug: string) {
  const place = lubeckLandmarks.find((item) => item.slug === slug);

  if (!place) {
    throw new Error(`Missing landmark ${slug}`);
  }

  return place;
}

describe("buildGuideSystemPrompt", () => {
  it("builds a RAG-grounded multi-stop guide prompt", () => {
    const tourContext = resolveTourContext({
      input: {
        version: TOUR_CONTEXT_VERSION,

        tourId: LUBECK_HISTORIC_TOUR_ID,

        currentStop: "rathaus",

        visitedStops: ["holstentor", "marienkirche"],
      },

      locale: "en",

      expectedCurrentStop: "rathaus",
    });

    const knowledge = retrieveGuideKnowledge({
      currentPlaceSlug: "rathaus",

      visitedPlaceSlugs: ["holstentor", "marienkirche"],

      question: "How does this connect to the earlier stops?",
    });

    const prompt = buildGuideSystemPrompt({
      currentLandmark: getLandmark("rathaus"),

      locale: "en",

      tourContext,

      knowledge,
    });

    expect(prompt).toContain("3 of 5");

    expect(prompt).toContain("Holstentor");

    expect(prompt).toContain("Marienkirche");

    /*
     * Next-stop identity is still
     * available as navigation state.
     */
    expect(prompt).toContain("NEXT STOP:\nHeiligen-Geist-Hospital");

    /*
     * Factual knowledge comes from
     * retrieved chunks.
     */
    expect(prompt).toContain("VERIFIED RETRIEVED KNOWLEDGE");

    expect(prompt).toContain("rathaus-political-role");

    expect(prompt).toContain("holstentor-history");

    expect(prompt).toContain("marienkirche-history");

    /*
     * Next-stop factual content
     * must NOT be retrieved.
     */
    expect(prompt).not.toContain("hospital-foundation");

    /*
     * URLs stay outside the LLM
     * prompt. They remain server
     * provenance metadata.
     */
    expect(prompt).not.toContain("https://");

    expect(prompt).not.toMatch(/latitude|longitude|"lat"|"lng"/i);

    /*
     * Legacy factual evidence
     * sections are gone.
     */
    expect(prompt).not.toContain("VERIFIED CURRENT PLACE CONTENT:");

    expect(prompt).not.toContain("VERIFIED TOUR REFERENCE:");
  });

  it("keeps requests without tour context functional", () => {
    const knowledge = retrieveGuideKnowledge({
      currentPlaceSlug: "holstentor",

      visitedPlaceSlugs: [],

      question: "Why is this gate important?",
    });

    const prompt = buildGuideSystemPrompt({
      currentLandmark: getLandmark("holstentor"),

      locale: "en",

      tourContext: null,

      knowledge,
    });

    expect(prompt).toContain("Holstentor");

    expect(prompt).toContain("No active tour context.");

    expect(prompt).toContain("VERIFIED RETRIEVED KNOWLEDGE");

    expect(prompt).toContain("holstentor-history");

    expect(prompt).not.toContain("https://");

    expect(prompt).not.toMatch(/latitude|longitude|"lat"|"lng"/i);
  });

  it("keeps next-stop knowledge isolated and does not invent visual cues", () => {
    const tourContext = resolveTourContext({
      input: {
        version: TOUR_CONTEXT_VERSION,

        tourId: LUBECK_HISTORIC_TOUR_ID,

        currentStop: "holstentor",

        visitedStops: [],
      },

      locale: "en",

      expectedCurrentStop: "holstentor",
    });

    const knowledge = retrieveGuideKnowledge({
      currentPlaceSlug: "holstentor",

      visitedPlaceSlugs: [],

      question: "Why is this place important?",
    });

    const prompt = buildGuideSystemPrompt({
      currentLandmark: getLandmark("holstentor"),

      locale: "en",

      tourContext,

      knowledge,
    });

    expect(prompt).toContain("VERIFIED LOOK-FOR CUES:\nNone");

    expect(prompt).toContain("VISITED STOPS:\nNone");

    expect(prompt).toContain("NEXT STOP:\nMarienkirche");

    expect(prompt).toContain("holstentor-history");

    /*
     * Marienkirche is next,
     * not current or visited.
     */
    expect(prompt).not.toContain("marienkirche-history");

    expect(prompt).toContain(
      "Historical and factual claims may come ONLY from VERIFIED RETRIEVED KNOWLEDGE",
    );

    expect(prompt).toContain("NEXT STOP is navigation state only");

    expect(prompt).toContain(
      "Never describe a remaining or next stop as already visited",
    );

    expect(prompt).toContain("Do not infer walking distance");

    expect(prompt).toContain("If VISITED STOPS is None");

    expect(prompt).not.toContain("VERIFIED CURRENT PLACE CONTENT:");

    expect(prompt).not.toContain("VERIFIED TOUR REFERENCE:");
    expect(prompt).toContain("SOURCE ATTRIBUTION PROTOCOL");

    expect(prompt).toContain("[[SOURCES:chunk-id-1,chunk-id-2]]");

    expect(prompt).toContain(
      "Do not include chunks merely because they were retrieved or available.",
    );
  });
});
