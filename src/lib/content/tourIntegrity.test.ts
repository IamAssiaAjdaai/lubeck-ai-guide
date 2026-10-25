import { describe, expect, it } from "vitest";
import { assertPublishedTourGraph } from "./tourIntegrity";

const places = new Set(["gate", "church", "hall", "cafe"]);
const tour = {
  slug: "editorial-walk",
  stops: [
    { placeSlug: "gate", position: 1, visitDurationMinutes: 5 },
    { placeSlug: "church", position: 2, visitDurationMinutes: 10 },
    { placeSlug: "hall", position: 3 },
  ],
};

describe("published editorial route integrity", () => {
  it("keeps authored order and does not add catalog places", () => {
    const before = JSON.stringify(tour);
    assertPublishedTourGraph([tour], places);
    expect(JSON.stringify(tour)).toBe(before);
  });

  it("allows cities without published editorial tours", () => {
    expect(() => assertPublishedTourGraph([], places)).not.toThrow();
  });

  it.each([
    [],
    [{ placeSlug: "gate", position: 1 }, { placeSlug: "gate", position: 2 }],
    [{ placeSlug: "unpublished", position: 1 }],
    [{ placeSlug: "gate", position: 0 }],
    [{ placeSlug: "gate", position: 1 }, { placeSlug: "hall", position: 3 }],
    [{ placeSlug: "church", position: 2 }, { placeSlug: "gate", position: 1 }],
    [{ placeSlug: "gate", position: 1.5 }],
    [{ placeSlug: "gate", position: 1, visitDurationMinutes: 0 }],
    [{ placeSlug: "gate", position: 1, visitDurationMinutes: -1 }],
    [{ placeSlug: "gate", position: 1, visitDurationMinutes: Number.NaN }],
  ].map(stops => ({ stops })))("rejects malformed, unavailable, duplicate or misordered stops: $stops", ({ stops }) => {
    expect(() => assertPublishedTourGraph([{ ...tour, stops }], places)).toThrow();
  });

  it("rejects duplicate editorial identities", () => {
    expect(() => assertPublishedTourGraph([tour, tour], places)).toThrow(/identities/);
  });

  it("requires the fixed route only for its designated tour", () => {
    const fixed = { slug: tour.slug, stopSlugs: ["gate", "church", "hall"] };
    expect(() => assertPublishedTourGraph([tour], places, fixed)).not.toThrow();
    expect(() => assertPublishedTourGraph([{ ...tour, slug: "other-walk" }], places,
      { ...fixed, stopSlugs: ["hall", "gate", "church"] })).not.toThrow();
    for (const stopSlugs of [["gate", "church"], ["gate", "church", "hall", "cafe"], ["church", "gate", "hall"]]) {
      expect(() => assertPublishedTourGraph([tour], places, { ...fixed, stopSlugs })).toThrow(/curated route/);
    }
  });
});
