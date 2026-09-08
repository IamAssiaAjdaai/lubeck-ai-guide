import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPublicCitySnapshot,
  type PublicCitySnapshot,
} from "@/lib/content/publicRepository.server";
import {
  InvalidTourContextError,
  resolveTourContext,
} from "@/lib/tourContext.server";
import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";

describe("resolveTourContext", () => {
  let snapshot: PublicCitySnapshot;

  beforeAll(async () => {
    snapshot = await getPublicCitySnapshot("lubeck", "code");
  });

  it("resolves trusted multi-stop context from the published snapshot", () => {
    const context = resolveTourContext({
      input: {
        version: TOUR_CONTEXT_VERSION,
        tourId: LUBECK_HISTORIC_TOUR_ID,
        currentStop: "rathaus",
        visitedStops: ["marienkirche", "holstentor"],
      },
      locale: "en",
      expectedCurrentStop: "rathaus",
      snapshot,
    });

    expect(context).not.toBeNull();
    expect(context?.currentStop.slug).toBe("rathaus");
    expect(context?.currentStopNumber).toBe(3);
    expect(context?.totalStops).toBe(5);
    expect(context?.visitedStops.map((stop) => stop.slug)).toEqual([
      "holstentor",
      "marienkirche",
    ]);
    expect(context?.remainingStops.map((stop) => stop.slug)).toEqual([
      "heiligen-geist-hospital",
      "buddenbrookhaus",
    ]);
    expect(context?.nextStop?.slug).toBe("heiligen-geist-hospital");
    expect(JSON.stringify(context)).not.toMatch(/latitude|longitude|"lat"|"lng"/i);
  });

  it("removes duplicates and the current place", () => {
    const context = resolveTourContext({
      input: {
        version: 1,
        tourId: LUBECK_HISTORIC_TOUR_ID,
        currentStop: "marienkirche",
        visitedStops: ["holstentor", "holstentor", "marienkirche"],
      },
      locale: "en",
      expectedCurrentStop: "marienkirche",
      snapshot,
    });
    expect(context?.visitedStops.map((stop) => stop.slug)).toEqual(["holstentor"]);
  });

  it("rejects forged current-place and unknown-stop context", () => {
    expect(() => resolveTourContext({
      input: {
        version: 1,
        tourId: LUBECK_HISTORIC_TOUR_ID,
        currentStop: "rathaus",
        visitedStops: [],
      },
      locale: "en",
      expectedCurrentStop: "holstentor",
      snapshot,
    })).toThrow(InvalidTourContextError);

    expect(() => resolveTourContext({
      input: {
        version: 1,
        tourId: LUBECK_HISTORIC_TOUR_ID,
        currentStop: "rathaus",
        visitedStops: ["fake-place"],
      },
      locale: "en",
      expectedCurrentStop: "rathaus",
      snapshot,
    })).toThrow(InvalidTourContextError);
  });

  it("supports a generic published tour without Lübeck-only facts", () => {
    const genericSnapshot: PublicCitySnapshot = {
      ...snapshot,
      city: { ...snapshot.city, slug: "sample-city" },
      tours: [{
        slug: "sample-walk",
        content: snapshot.tours[0].content,
        stops: snapshot.tours[0].stops.slice(0, 2),
      }],
    };
    const context = resolveTourContext({
      input: {
        version: 1,
        tourId: "sample-walk",
        currentStop: "holstentor",
        visitedStops: [],
      },
      locale: "en",
      expectedCurrentStop: "holstentor",
      snapshot: genericSnapshot,
    });

    expect(context?.tourId).toBe("sample-walk");
    expect(context?.narrative).toBe("");
    expect(context?.lookFor).toEqual([]);
  });

  it("keeps requests without tour context compatible", () => {
    expect(resolveTourContext({
      input: undefined,
      locale: "en",
      expectedCurrentStop: "holstentor",
      snapshot,
    })).toBeNull();
  });
});
