import { describe, expect, it } from "vitest";

import { parseCityIndexResponse } from "../src/lib/api/contracts";

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
});
