import { describe, expect, it } from "vitest";

import { getVisitorJourneyEvent } from "@/lib/visitorJourney";

describe("visitor journey route mapping", () => {
  it("tracks a localized city page", () => {
    expect(getVisitorJourneyEvent("/en/lubeck")).toEqual({
      eventName: "city_opened",
      properties: {
        city: "lubeck",
        locale: "en",
      },
    });
  });

  it("tracks generic and legacy place pages with the same canonical event", () => {
    expect(getVisitorJourneyEvent("/de/quedlinburg/castle")).toEqual({
      eventName: "place_viewed",
      properties: {
        city: "quedlinburg",
        place: "castle",
        locale: "de",
      },
    });

    expect(getVisitorJourneyEvent("/ar/lubeck/holstentor")).toEqual({
      eventName: "place_viewed",
      properties: {
        city: "lubeck",
        place: "holstentor",
        locale: "ar",
      },
    });
  });

  it("does not misclassify the Lübeck completion page as a place", () => {
    expect(getVisitorJourneyEvent("/en/lubeck/complete")).toBeUndefined();
  });

  it("ignores home, admin, invalid locale, and deeper non-place routes", () => {
    expect(getVisitorJourneyEvent("/")).toBeUndefined();
    expect(getVisitorJourneyEvent("/admin")).toBeUndefined();
    expect(getVisitorJourneyEvent("/xx/lubeck")).toBeUndefined();
    expect(getVisitorJourneyEvent("/en/lubeck/holstentor/more")).toBeUndefined();
  });
});
