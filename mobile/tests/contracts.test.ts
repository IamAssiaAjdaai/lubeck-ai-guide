import { describe, expect, it } from "vitest";

import {
  parseCityIndexResponse,
  parseCityResponse,
  parseGuideAnswerResponse,
  parseGuideEligibilityResponse,
} from "../src/lib/api/contracts";

describe("public content contracts", () => {
  it("retains server-declared localization fallback semantics", () => {
    const result = parseCityIndexResponse({ cities: [{
      slug: "lubeck", name: "Lübeck", requestedLocale: "ar", resolvedLocale: "en",
      didFallback: true, media: [],
    }] });
    expect(result.cities[0]).toMatchObject({ requestedLocale: "ar", resolvedLocale: "en", didFallback: true });
  });

  it("fails closed for malformed payloads", () => {
    expect(() => parseCityIndexResponse({ cities: [{ slug: "lubeck" }] })).toThrow();
  });

  it("parses Hamburg through the same generic city contract", () => {
    const index = parseCityIndexResponse({ cities: [{
      slug: "hamburg",
      countryCode: "DE",
      timezone: "Europe/Berlin",
      name: "Hamburg",
      requestedLocale: "de",
      resolvedLocale: "de",
      didFallback: false,
      media: [],
    }] });
    const city = parseCityResponse({
      city: {
        slug: "hamburg",
        countryCode: "DE",
        timezone: "Europe/Berlin",
        requestedLocale: "ar",
        resolvedLocale: "en",
        didFallback: true,
        content: {
          name: "Hamburg",
          shortDescription: "Harbour city",
          description: "A fuller traveler-facing city introduction.",
        },
        media: [],
      },
      places: [],
      tours: [],
    });

    expect(index.cities[0]).toMatchObject({
      slug: "hamburg",
      countryCode: "DE",
      timezone: "Europe/Berlin",
    });
    expect(city.city).toMatchObject({
      slug: "hamburg",
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
      content: {
        name: "Hamburg",
        shortDescription: "Harbour city",
        description: "A fuller traveler-facing city introduction.",
      },
    });
  });

  it("parses a future CMS city and its places without city-specific code", () => {
    const city = parseCityResponse({
      city: {
        slug: "no-code-pipeline-test",
        countryCode: "DE",
        timezone: "Europe/Berlin",
        requestedLocale: "en",
        resolvedLocale: "en",
        didFallback: false,
        content: {
          name: "No-code Pipeline Test",
          shortDescription: "A temporary API-discovered city.",
          description: "This city is supplied by the generic public API.",
        },
        media: [],
      },
      places: [
        {
          slug: "json-museum",
          category: "see",
          coordinates: { lat: 52.51, lng: 10.01 },
          durationMinutes: 30,
          requestedLocale: "en",
          resolvedLocale: "en",
          didFallback: false,
          content: {
            name: "JSON Museum",
            shortDescription: "A temporary test place.",
          },
          media: [],
        },
        {
          slug: "data-garden",
          category: "fun",
          coordinates: { lat: 52.52, lng: 10.02 },
          durationMinutes: 20,
          requestedLocale: "en",
          resolvedLocale: "en",
          didFallback: false,
          content: {
            name: "Data Garden",
            shortDescription: "A second temporary test place.",
          },
          media: [],
        },
      ],
      tours: [],
    });

    expect(city.city.slug).toBe("no-code-pipeline-test");
    expect(city.places.map(({ slug }) => slug)).toEqual([
      "json-museum",
      "data-garden",
    ]);
  });

  it("parses structured facts and retains safe legacy string compatibility", () => {
    const city = parseCityResponse(cityPayload({
      facts: [
        { label: "Built", value: "1478" },
        "Legacy fact",
      ],
    }));

    expect(city.places[0]?.content.facts).toEqual([
      { label: "Built", value: "1478" },
      { label: "", value: "Legacy fact" },
    ]);
    expect(() => parseCityResponse(cityPayload({ facts: [{ label: "Missing value" }] })))
      .toThrow("place fact value");
  });

  it("parses the published tour contract and fails closed for malformed stops", () => {
    const payload = cityPayload();
    payload.tours = [{
      slug: "historic-walk",
      estimatedDurationMinutes: 90,
      requestedLocale: "de",
      resolvedLocale: "en",
      didFallback: true,
      content: {
        title: "Historic walk",
        shortDescription: "A compact route.",
        description: "Follow the published places in order.",
      },
      stops: [{ placeSlug: "old-gate", position: 1, visitDurationMinutes: 20 }],
      media: [],
    }];

    expect(parseCityResponse(payload).tours[0]).toMatchObject({
      slug: "historic-walk",
      estimatedDurationMinutes: 90,
      requestedLocale: "de",
      resolvedLocale: "en",
      didFallback: true,
      stops: [{ placeSlug: "old-gate", position: 1, visitDurationMinutes: 20 }],
    });
    payload.tours[0]!.stops[0]!.position = -1;
    expect(() => parseCityResponse(payload)).toThrow("tour stop position");
  });

  it("parses guide eligibility and source-safe answers", () => {
    expect(parseGuideEligibilityResponse({ eligible: true })).toEqual({ eligible: true });
    expect(parseGuideAnswerResponse({
      answer: "The gate was completed in 1478.",
      sources: [{
        label: "Official source",
        url: "https://example.com/source",
        verifiedAt: "2026-09-13",
        citySlug: "lubeck",
        placeSlug: "holstentor",
        chunkIds: ["holstentor-history"],
      }],
    }).sources[0]?.chunkIds).toEqual(["holstentor-history"]);
    expect(() => parseGuideAnswerResponse({
      answer: "Unsafe",
      sources: [{
        label: "Unsafe source", url: "javascript:alert(1)", verifiedAt: "today",
        citySlug: "x", placeSlug: "y", chunkIds: ["z"],
      }],
    })).toThrow("source URL");
  });
});

function cityPayload(content: Record<string, unknown> = {}) {
  return {
    city: {
      slug: "test-city", requestedLocale: "en", resolvedLocale: "en",
      didFallback: false, content: { name: "Test City" }, media: [],
    },
    places: [{
      slug: "old-gate", category: "see", coordinates: { lat: 1, lng: 2 },
      durationMinutes: 20, requestedLocale: "en", resolvedLocale: "en",
      didFallback: false,
      content: { name: "Old Gate", shortDescription: "A public place.", ...content },
      media: [],
    }],
    tours: [] as MutableTourPayload[],
  };
}

type MutableTourPayload = {
  slug: string;
  estimatedDurationMinutes?: number;
  requestedLocale: string;
  resolvedLocale: string;
  didFallback: boolean;
  content: Record<string, unknown>;
  stops: Array<{
    placeSlug: string;
    position: number;
    visitDurationMinutes?: number;
  }>;
  media: unknown[];
};
