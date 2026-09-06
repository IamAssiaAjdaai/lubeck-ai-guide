import { describe, expect, it } from "vitest";

import {
  CROSS_CITY_PLACE_MOVE_ERROR,
  TOUR_CITY_NOT_PUBLISHED_ERROR,
  TOUR_STOP_NOT_PUBLISHED_ERROR,
  getPublishedTourGraphError,
  hasCrossCityTourReference,
} from "@/lib/admin/content/graphIntegrity";

describe("CMS publication graph integrity", () => {
  it("rejects published tours in a draft or archived city", () => {
    expect(getPublishedTourGraphError("draft", ["published"]))
      .toBe(TOUR_CITY_NOT_PUBLISHED_ERROR);
    expect(getPublishedTourGraphError("archived", ["published"]))
      .toBe(TOUR_CITY_NOT_PUBLISHED_ERROR);
  });

  it("rejects draft or archived stops in a published tour", () => {
    expect(getPublishedTourGraphError("published", ["draft"]))
      .toBe(TOUR_STOP_NOT_PUBLISHED_ERROR);
    expect(getPublishedTourGraphError("published", ["archived"]))
      .toBe(TOUR_STOP_NOT_PUBLISHED_ERROR);
  });

  it("accepts only a published city with entirely published stops", () => {
    expect(
      getPublishedTourGraphError("published", ["published", "published"]),
    ).toBeUndefined();
  });

  it("detects a place move that would make any tour cross-city", () => {
    expect(hasCrossCityTourReference(2, [1])).toBe(true);
    expect(hasCrossCityTourReference(2, [2, 2])).toBe(false);
    expect(CROSS_CITY_PLACE_MOVE_ERROR).toContain("every affected tour");
  });
});
