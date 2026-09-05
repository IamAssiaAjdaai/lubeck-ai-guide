import { describe, expect, it } from "vitest";

import {
  lubeckPlaces,
  type PlaceStatus,
} from "@/data/places";
import {
  calculateDistanceMeters,
  estimateWalkingMinutes,
} from "@/lib/distance";
import {
  DEFAULT_TOUR_TIME_BUDGET,
  TOUR_TIME_BUDGETS,
  buildPersonalizedTour,
  isEligibleTourPlace,
  parseTourTimeBudget,
  type TourBuilderPlace,
} from "@/lib/tourBuilder";
import type {
  TourInterest,
  WalkingPreference,
} from "@/lib/tourPreferences";

type TestPlace = TourBuilderPlace &
  Readonly<{ name: string }>;

const origin = { lat: 53.8662, lng: 10.6797 };

function place(
  slug: string,
  options: Readonly<{
    latOffset?: number;
    durationMinutes?: number;
    tags?: readonly string[];
    status?: PlaceStatus;
  }> = {},
): TestPlace {
  return {
    slug,
    name: slug,
    category: "see",
    coordinates: {
      lat: origin.lat + (options.latOffset ?? 0),
      lng: origin.lng,
    },
    durationMinutes:
      options.durationMinutes ?? 20,
    tags: options.tags ?? [],
    ...(options.status
      ? { status: options.status }
      : {}),
  };
}

function build(
  places: readonly TestPlace[],
  options: Readonly<{
    interests?: readonly TourInterest[];
    walkingPreference?: WalkingPreference;
    timeBudgetMinutes?: unknown;
  }> = {},
) {
  return buildPersonalizedTour({
    places,
    origin,
    preferences: {
      interests: options.interests ?? [],
      walkingPreference:
        options.walkingPreference ?? "standard",
    },
    timeBudgetMinutes:
      options.timeBudgetMinutes ?? 60,
  });
}

describe("tour time-budget domain", () => {
  it("supports only the approved minute budgets", () => {
    expect(TOUR_TIME_BUDGETS).toEqual([
      60,
      90,
      120,
      180,
    ]);
    expect(parseTourTimeBudget(90)).toBe(90);
    expect(parseTourTimeBudget(35)).toBe(
      DEFAULT_TOUR_TIME_BUDGET,
    );
    expect(parseTourTimeBudget("60")).toBe(
      DEFAULT_TOUR_TIME_BUDGET,
    );
  });
});

describe("tour candidate eligibility", () => {
  it.each(["closed", "renovation", "seasonal"] as const)(
    "excludes %s places",
    (status) => {
      expect(
        isEligibleTourPlace(
          place(status, { status }),
        ),
      ).toBe(false);
    },
  );

  it.each([undefined, "unknown", "open"] as const)(
    "keeps places with %s availability eligible without inventing opening claims",
    (status) => {
      expect(
        isEligibleTourPlace(
          place("eligible", {
            ...(status ? { status } : {}),
          }),
        ),
      ).toBe(true);
    },
  );

  it("excludes Buddenbrookhaus while its trusted renovation status is present", () => {
    const holstentor = lubeckPlaces.find(
      ({ slug }) => slug === "holstentor",
    );
    expect(holstentor).toBeDefined();

    if (!holstentor) return;

    const result = buildPersonalizedTour({
      places: lubeckPlaces,
      preferences: {
        interests: ["history"],
        walkingPreference: "standard",
      },
      timeBudgetMinutes: 180,
      origin: holstentor.coordinates,
    });

    expect(
      result.stops.map(({ place }) => place.slug),
    ).not.toContain("buddenbrookhaus");
  });

  it.each(TOUR_TIME_BUDGETS)(
    "builds a non-empty Lübeck route within the %i-minute budget",
    (timeBudgetMinutes) => {
      const holstentor = lubeckPlaces.find(
        ({ slug }) => slug === "holstentor",
      );
      expect(holstentor).toBeDefined();

      if (!holstentor) return;

      const result = buildPersonalizedTour({
        places: lubeckPlaces,
        preferences: {
          interests: [],
          walkingPreference: "standard",
        },
        timeBudgetMinutes,
        origin: holstentor.coordinates,
      });

      expect(result.stops.length).toBeGreaterThan(0);
      expect(result.totalMinutes).toBeLessThanOrEqual(
        timeBudgetMinutes,
      );
    },
  );
});

describe("deterministic route building", () => {
  it("never exceeds the selected budget and includes visit and walking time", () => {
    const result = build([
      place("first", {
        latOffset: 0.001,
        durationMinutes: 25,
      }),
      place("second", {
        latOffset: 0.002,
        durationMinutes: 25,
      }),
      place("too-much", {
        latOffset: 0.003,
        durationMinutes: 25,
      }),
    ]);

    expect(result.totalMinutes).toBeLessThanOrEqual(
      60,
    );
    expect(result.totalVisitMinutes).toBe(
      result.stops.reduce(
        (sum, stop) =>
          sum + stop.place.durationMinutes,
        0,
      ),
    );
    expect(result.totalWalkingMinutes).toBe(
      result.stops.reduce(
        (sum, stop) =>
          sum + stop.legWalkingMinutes,
        0,
      ),
    );
    expect(result.totalMinutes).toBe(
      result.totalVisitMinutes +
        result.totalWalkingMinutes,
    );
  });

  it("does not add a stop when its visit fits but the walking leg exceeds the budget", () => {
    const result = build([
      place("walk-too-far", {
        latOffset: 0.01,
        durationMinutes: 55,
      }),
    ]);

    expect(result.stops).toEqual([]);
    expect(result.totalMinutes).toBe(0);
  });

  it("sums geographic leg distances deterministically", () => {
    const first = place("first", {
      latOffset: 0.001,
      durationMinutes: 10,
    });
    const second = place("second", {
      latOffset: 0.002,
      durationMinutes: 10,
    });
    const firstLeg = calculateDistanceMeters(
      origin,
      first.coordinates,
    );
    const secondLeg = calculateDistanceMeters(
      first.coordinates,
      second.coordinates,
    );
    const result = build([first, second]);

    expect(firstLeg).toBeDefined();
    expect(secondLeg).toBeDefined();
    expect(
      result.stops.map(({ place }) => place.slug),
    ).toEqual(["first", "second"]);
    expect(result.totalDistanceMeters).toBeCloseTo(
      (firstLeg ?? 0) + (secondLeg ?? 0),
      8,
    );
    expect(result.stops[0].legWalkingMinutes).toBe(
      estimateWalkingMinutes(firstLeg ?? 0),
    );
  });

  it.each([
    ["history", "history-place"],
    ["architecture", "architecture-place"],
    ["hidden-gems", "hidden-place"],
    ["family", "family-place"],
  ] as const)(
    "%s preference changes the selected route",
    (interest, expectedSlug) => {
      const candidates = [
        place("history-place", {
          latOffset: 0.004,
          durationMinutes: 50,
          tags: ["history"],
        }),
        place("architecture-place", {
          latOffset: 0.003,
          durationMinutes: 50,
          tags: ["architecture"],
        }),
        place("hidden-place", {
          latOffset: 0.002,
          durationMinutes: 50,
          tags: ["hidden-gem"],
        }),
        place("family-place", {
          latOffset: 0.001,
          durationMinutes: 50,
          tags: ["family"],
        }),
      ];


      expect(
        build(candidates, {
          interests: [interest],
        }).stops[0].place.slug,
      ).toBe(expectedSlug);
    },
  );

  it("combines multiple interest matches additively", () => {
    const result = build(
      [
        place("near-history", {
          latOffset: 0.001,
          durationMinutes: 50,
          tags: ["history"],
        }),
        place("both", {
          latOffset: 0.003,
          durationMinutes: 50,
          tags: ["history", "architecture"],
        }),
      ],
      { interests: ["history", "architecture"] },
    );

    expect(result.stops[0].place.slug).toBe(
      "both",
    );
    expect(result.stops[0].interestMatches).toBe(
      2,
    );
  });

  it("makes less-walking no more geographically scattered than the comparable standard route", () => {
    const candidates = [
      place("far-history", {
        latOffset: 0.006,
        durationMinutes: 50,
        tags: ["history"],
      }),
      place("near", {
        latOffset: 0.001,
        durationMinutes: 50,
      }),
    ];
    const standard = build(candidates, {
      interests: ["history"],
    });
    const compact = build(candidates, {
      interests: ["history"],
      walkingPreference: "less-walking",
    });

    expect(standard.stops[0].place.slug).toBe(
      "far-history",
    );
    expect(compact.stops[0].place.slug).toBe(
      "near",
    );
    expect(
      compact.totalDistanceMeters,
    ).toBeLessThanOrEqual(
      standard.totalDistanceMeters,
    );
  });

  it("does not let less-walking override a larger interest-relevance gap", () => {
    const result = build(
      [
        place("far-double-match", {
          latOffset: 0.004,
          durationMinutes: 50,
          tags: ["history", "architecture"],
        }),
        place("near-no-match", {
          latOffset: 0.001,
          durationMinutes: 50,
        }),
      ],
      {
        interests: ["history", "architecture"],
        walkingPreference: "less-walking",
      },
    );

    expect(result.stops[0].place.slug).toBe(
      "far-double-match",
    );
  });

  it("produces deterministic output without interests and stable catalog-order ties", () => {
    const candidates = [
      place("first"),
      place("second"),
    ];

    expect(
      build(candidates).stops.map(
        ({ place }) => place.slug,
      ),
    ).toEqual(["first", "second"]);
    expect(
      build(candidates).stops.map(
        ({ place }) => place.slug,
      ),
    ).toEqual(
      build(candidates).stops.map(
        ({ place }) => place.slug,
      ),
    );
  });

  it("does not mutate the input array", () => {
    const candidates = [
      place("second", { latOffset: 0.002 }),
      place("first", { latOffset: 0.001 }),
    ];
    const before = [...candidates];

    build(candidates);

    expect(candidates).toEqual(before);
  });

  it("returns a safe empty result when no stop fits", () => {
    const result = build([
      place("too-long", {
        durationMinutes: 100,
      }),
    ]);

    expect(result.stops).toEqual([]);
    expect(result.totalVisitMinutes).toBe(0);
    expect(result.totalWalkingMinutes).toBe(0);
    expect(result.totalDistanceMeters).toBe(0);
    expect(result.totalMinutes).toBe(0);
  });
});
