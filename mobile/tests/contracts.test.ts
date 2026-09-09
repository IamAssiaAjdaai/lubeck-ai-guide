import { describe, expect, it } from "vitest";

import { parseCityIndexResponse, parseCityResponse } from "../src/lib/api/contracts";

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
});
