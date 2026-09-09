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
});
