import { describe, expect, it } from "vitest";

import {
  adjacentMobileTripParams,
  createMobileTripPlaceParams,
  parseMobileTripContext,
} from "../src/lib/tripNavigation";

describe("shared native trip navigation", () => {
  const identity = {
    id: "personalized-1",
    citySlug: "lubeck",
    stopSlugs: ["holstentor", "salzspeicher", "rathaus"],
    source: "personalized" as const,
  };

  it("preserves generated stop order and starts at stop one", () => {
    const params = createMobileTripPlaceParams(identity, 0);
    expect(params).toMatchObject({
      placeSlug: "holstentor",
      tripStops: "holstentor,salzspeicher,rathaus",
      tripIndex: "0",
    });
    expect(parseMobileTripContext(params)?.stopSlugs).toEqual(identity.stopSlugs);
  });

  it("produces deterministic previous and next stop navigation", () => {
    const context = parseMobileTripContext(createMobileTripPlaceParams(identity, 1));
    expect(context).toBeDefined();
    expect(adjacentMobileTripParams(context!, -1)?.placeSlug).toBe("holstentor");
    expect(adjacentMobileTripParams(context!, 1)?.placeSlug).toBe("rathaus");
  });

  it("has no invalid next stop on the final stop", () => {
    const context = parseMobileTripContext(createMobileTripPlaceParams(identity, 2));
    expect(adjacentMobileTripParams(context!, 1)).toBeUndefined();
  });

  it("does not manufacture trip context for standalone or inconsistent place routes", () => {
    expect(parseMobileTripContext({ citySlug: "lubeck", placeSlug: "holstentor" })).toBeUndefined();
    expect(parseMobileTripContext({
      ...createMobileTripPlaceParams(identity, 0),
      placeSlug: "rathaus",
    })).toBeUndefined();
  });
});
