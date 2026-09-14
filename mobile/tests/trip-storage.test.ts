import { describe, expect, it, vi } from "vitest";

import { saveLocalTripDraft } from "../src/lib/tripStorage";

describe("native guest trip save boundary", () => {
  it("stores a local identifier-only draft without coordinates or translated content", async () => {
    const writes: string[] = [];
    const setItemAsync = vi.fn(async (_key: string, value: string) => {
      writes.push(value);
    });
    await saveLocalTripDraft({
      citySlug: "lubeck",
      timeBudgetMinutes: 60,
      preferences: { interests: ["history"], walkingPreference: "standard" },
      result: {
        stops: [{
          place: {
            slug: "holstentor",
            category: "see",
            coordinates: { lat: 53.8662, lng: 10.6797 },
            durationMinutes: 30,
            requestedLocale: "en",
            resolvedLocale: "en",
            didFallback: false,
            content: { name: "Holstentor", shortDescription: "Gate" },
            media: [],
          },
          legDistanceMeters: 0,
          legWalkingMinutes: 1,
        }],
        totalVisitMinutes: 30,
        totalWalkingMinutes: 1,
        totalMinutes: 31,
        totalDistanceMeters: 0,
      },
    }, { setItemAsync });

    const serialized = writes[0] ?? "";
    expect(JSON.parse(serialized)).toMatchObject({
      citySlug: "lubeck",
      stopSlugs: ["holstentor"],
      timeBudgetMinutes: 60,
    });
    expect(serialized).not.toMatch(/latitude|longitude|53\.8662|10\.6797|Holstentor|Gate/u);
  });
});
