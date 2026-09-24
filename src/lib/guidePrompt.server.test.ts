import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPublicCitySnapshot,
  type PublicCitySnapshot,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { retrieveGuideKnowledge } from "@/lib/guideKnowledge.server";
import { buildGuideSystemPrompt } from "@/lib/guidePrompt.server";
import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";
import { resolveTourContext } from "@/lib/tourContext.server";
import { StaticVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

const provider = new StaticVerifiedKnowledgeProvider();

describe("buildGuideSystemPrompt", () => {
  let snapshot: PublicCitySnapshot;

  beforeAll(async () => {
    snapshot = await getPublicCitySnapshot("lubeck", "code");
  });

  async function buildPrompt({
    placeSlug,
    visitedPlaceSlugs = [],
    withTour = false,
  }: {
    placeSlug: string;
    visitedPlaceSlugs?: readonly string[];
    withTour?: boolean;
  }) {
    const place = snapshot.places.find((candidate) => candidate.slug === placeSlug);
    const cityContent = resolvePublicLocalization(snapshot.city.content, "en");
    const placeContent = place && resolvePublicLocalization(place.content, "en");
    if (!place || !cityContent || !placeContent) throw new Error("Missing test content");

    const tourContext = withTour
      ? resolveTourContext({
          input: {
            version: TOUR_CONTEXT_VERSION,
            tourId: LUBECK_HISTORIC_TOUR_ID,
            currentStop: placeSlug,
            visitedStops: visitedPlaceSlugs,
          },
          locale: "en",
          expectedCurrentStop: placeSlug,
          snapshot,
        })
      : null;
    const knowledge = await retrieveGuideKnowledge({
      citySlug: "lubeck",
      currentPlaceSlug: placeSlug,
      visitedPlaceSlugs,
      question: "How does this connect to the earlier stops?",
      provider,
    });

    return buildGuideSystemPrompt({
      citySlug: "lubeck",
      cityName: cityContent.content.name,
      currentPlace: { slug: place.slug, name: placeContent.content.name },
      locale: "en",
      tourContext,
      knowledge,
    });
  }

  it("builds a RAG-grounded multi-stop guide prompt", async () => {
    const prompt = await buildPrompt({
      placeSlug: "rathaus",
      visitedPlaceSlugs: ["holstentor", "marienkirche"],
      withTour: true,
    });

    expect(prompt).toContain("3 of 5");
    expect(prompt).toContain("Holstentor");
    expect(prompt).toContain("Marienkirche");
    expect(prompt).toContain("NEXT STOP:\nHeiligen-Geist-Hospital");
    expect(prompt).toContain("rathaus-political-role");
    expect(prompt).toContain("holstentor-history");
    expect(prompt).toContain("marienkirche-history");
    expect(prompt).not.toContain("hospital-foundation");
    expect(prompt).not.toContain("https://");
    expect(prompt).not.toMatch(/latitude|longitude|"lat"|"lng"/i);
  });

  it("keeps non-tour generic requests functional", async () => {
    const prompt = await buildPrompt({ placeSlug: "holstentor" });
    expect(prompt).toContain("CITYWALK, a friendly local city guide for Lübeck (lubeck)");
    expect(prompt).toContain("No active tour context.");
    expect(prompt).toContain("holstentor-history");
    expect(prompt).not.toContain("https://");
  });

  it("isolates next-stop knowledge and preserves structured fail-closed rules", async () => {
    const prompt = await buildPrompt({ placeSlug: "holstentor", withTour: true });
    expect(prompt).toContain("VERIFIED LOOK-FOR CUES:\nNone");
    expect(prompt).toContain("VISITED STOPS:\nNone");
    expect(prompt).toContain("NEXT STOP:\nMarienkirche");
    expect(prompt).toContain("holstentor-history");
    expect(prompt).not.toContain("marienkirche-history");
    expect(prompt).toContain("NEXT STOP is navigation state only");
    expect(prompt).toContain("answer, groundingStatus, and usedChunkIds");
    expect(prompt).toContain("A grounded response must include at least one exact CHUNK ID");
    expect(prompt).not.toContain("[[SOURCES:");
  });
});
