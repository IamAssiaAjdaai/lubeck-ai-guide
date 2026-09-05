import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { lubeckPlaces } from "@/data/places";
import {
  DEFAULT_TOUR_PREFERENCES,
  TOUR_INTERESTS,
  WALKING_PREFERENCES,
  parseTourPreferences,
  rankPlacesForTourPreferences,
  type RankablePreferencePlace,
} from "@/lib/tourPreferences";
import {
  clearTourPreferences,
  getTourPreferencesStorageKey,
  loadTourPreferences,
  saveTourPreferences,
  subscribeTourPreferences,
} from "@/lib/tourPreferencesStorage";

type TestPlace = RankablePreferencePlace &
  Readonly<{ slug: string }>;

const origin = {
  lat: 53.8662,
  lng: 10.6797,
};

const places = [
  {
    slug: "default-first",
    tags: ["architecture"],
    coordinates: { lat: 53.88, lng: 10.7 },
  },
  {
    slug: "history-family",
    tags: ["history", "family"],
    coordinates: { lat: 53.87, lng: 10.69 },
  },
  {
    slug: "hidden",
    tags: ["hidden-gem"],
    coordinates: { lat: 53.868, lng: 10.684 },
  },
  {
    slug: "near",
    tags: [],
    coordinates: origin,
  },
] as const satisfies readonly TestPlace[];

describe("tour preference domain", () => {
  it("defines valid defaults and the supported identifiers", () => {
    expect(TOUR_INTERESTS).toEqual([
      "history",
      "architecture",
      "hidden-gems",
      "family",
    ]);
    expect(WALKING_PREFERENCES).toEqual([
      "standard",
      "less-walking",
    ]);
    expect(
      parseTourPreferences(
        DEFAULT_TOUR_PREFERENCES,
      ),
    ).toEqual(DEFAULT_TOUR_PREFERENCES);
  });

  it("rejects malformed values and unknown interest identifiers", () => {
    expect(parseTourPreferences(null)).toEqual(
      DEFAULT_TOUR_PREFERENCES,
    );
    expect(
      parseTourPreferences({
        interests: ["history", "nightlife"],
        walkingPreference: "standard",
      }),
    ).toEqual(DEFAULT_TOUR_PREFERENCES);
  });

  it("normalizes duplicate interests in canonical order", () => {
    expect(
      parseTourPreferences({
        interests: [
          "family",
          "history",
          "family",
        ],
        walkingPreference: "standard",
      }),
    ).toEqual({
      interests: ["history", "family"],
      walkingPreference: "standard",
    });
  });

  it("rejects an unknown walking preference", () => {
    expect(
      parseTourPreferences({
        interests: ["history"],
        walkingPreference: "fastest",
      }),
    ).toEqual(DEFAULT_TOUR_PREFERENCES);
  });
});

describe("tour preference ranking", () => {
  const rank = (
    interests: readonly (
      | "history"
      | "architecture"
      | "hidden-gems"
      | "family"
    )[],
    walkingPreference:
      | "standard"
      | "less-walking" = "standard",
  ) =>
    rankPlacesForTourPreferences(
      places,
      { interests, walkingPreference },
      { origin },
    ).map(({ slug }) => slug);

  it("preserves original order with no preferences", () => {
    expect(rank([])).toEqual(
      places.map(({ slug }) => slug),
    );
  });

  it.each([
    ["history", "history-family"],
    ["architecture", "default-first"],
    ["hidden-gems", "hidden"],
    ["family", "history-family"],
  ] as const)(
    "boosts %s-tagged places",
    (interest, expectedFirst) => {
      expect(rank([interest])[0]).toBe(
        expectedFirst,
      );
    },
  );

  it("combines multiple interest matches additively", () => {
    expect(
      rank(["history", "family"])[0],
    ).toBe("history-family");
  });

  it("uses straight-line proximity only for less-walking", () => {
    expect(rank([], "less-walking")[0]).toBe(
      "near",
    );
    expect(rank([], "standard")[0]).toBe(
      "default-first",
    );
  });

  it("keeps interest matches ahead of proximity and uses original order for standard ties", () => {
    const ranked = rankPlacesForTourPreferences(
      [
        {
          slug: "first-history",
          tags: ["history"],
          coordinates: { lat: 54, lng: 11 },
        },
        {
          slug: "second-history",
          tags: ["history"],
          coordinates: origin,
        },
      ],
      {
        interests: ["history"],
        walkingPreference: "standard",
      },
      { origin },
    );

    expect(
      ranked.map(({ slug }) => slug),
    ).toEqual([
      "first-history",
      "second-history",
    ]);
  });

  it("uses original order as the final less-walking tie-break", () => {
    const ranked =
      rankPlacesForTourPreferences(
        [
          {
            slug: "first",
            tags: [],
            coordinates: origin,
          },
          {
            slug: "second",
            tags: [],
            coordinates: origin,
          },
        ],
        {
          interests: [],
          walkingPreference:
            "less-walking",
        },
        { origin },
      );

    expect(
      ranked.map(({ slug }) => slug),
    ).toEqual(["first", "second"]);
  });

  it("uses the existing Lübeck tags and canonical Holstentor origin", () => {
    const holstentor = lubeckPlaces.find(
      ({ slug }) => slug === "holstentor",
    );

    expect(holstentor).toBeDefined();

    if (!holstentor) {
      return;
    }

    const hiddenGemRanking =
      rankPlacesForTourPreferences(
        lubeckPlaces,
        {
          interests: ["hidden-gems"],
          walkingPreference: "standard",
        },
      );
    const familyRanking =
      rankPlacesForTourPreferences(
        lubeckPlaces,
        {
          interests: ["family"],
          walkingPreference: "standard",
        },
      );
    const compactRanking =
      rankPlacesForTourPreferences(
        lubeckPlaces,
        {
          interests: [],
          walkingPreference:
            "less-walking",
        },
        { origin: holstentor.coordinates },
      );

    expect(
      hiddenGemRanking
        .slice(0, 6)
        .map(({ slug }) => slug),
    ).toEqual([
      "fuechtingshof",
      "dunkelgruener-gang",
      "kalandsgang",
      "malerwinkel",
      "buergergaerten",
      "zaubertheater-luebeck",
    ]);
    expect(
      familyRanking
        .slice(0, 3)
        .map(({ slug }) => slug),
    ).toEqual([
      "europaeisches-hansemuseum",
      "willy-brandt-haus",
      "kolk-17",
    ]);
    expect(compactRanking[0].slug).toBe(
      "holstentor",
    );
  });
});

describe("tour preference persistence", () => {
  const tourId = "test-tour";

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("returns defaults for invalid persisted JSON", () => {
    window.sessionStorage.setItem(
      getTourPreferencesStorageKey(tourId),
      "not-json",
    );

    expect(loadTourPreferences(tourId)).toEqual(
      DEFAULT_TOUR_PREFERENCES,
    );
  });

  it("validates stored identifiers and version", () => {
    window.sessionStorage.setItem(
      getTourPreferencesStorageKey(tourId),
      JSON.stringify({
        version: 1,
        preferences: {
          interests: ["unknown"],
          walkingPreference: "standard",
        },
      }),
    );

    expect(loadTourPreferences(tourId)).toEqual(
      DEFAULT_TOUR_PREFERENCES,
    );
  });

  it("stores only versioned preference identifiers", () => {
    saveTourPreferences(tourId, {
      interests: ["history", "family"],
      walkingPreference: "less-walking",
    });

    const stored = window.sessionStorage.getItem(
      getTourPreferencesStorageKey(tourId),
    );

    expect(JSON.parse(stored ?? "null")).toEqual({
      version: 1,
      preferences: {
        interests: ["history", "family"],
        walkingPreference: "less-walking",
      },
    });
    expect(stored).not.toMatch(
      /coordinates|score|translation|prompt/i,
    );
  });

  it("stays usable when sessionStorage is unavailable", () => {
    vi.spyOn(
      Storage.prototype,
      "getItem",
    ).mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(
      Storage.prototype,
      "setItem",
    ).mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(loadTourPreferences(tourId)).toEqual(
      DEFAULT_TOUR_PREFERENCES,
    );
    expect(() =>
      saveTourPreferences(tourId, {
        interests: ["history"],
        walkingPreference: "standard",
      }),
    ).not.toThrow();
    expect(loadTourPreferences(tourId)).toEqual({
      interests: ["history"],
      walkingPreference: "standard",
    });

    vi.restoreAllMocks();
    clearTourPreferences(tourId);
  });

  it("notifies same-tab subscribers only for their tour", () => {
    const listener = vi.fn();
    const unsubscribe =
      subscribeTourPreferences(
        tourId,
        listener,
      );

    saveTourPreferences("another-tour", {
      interests: ["family"],
      walkingPreference: "standard",
    });
    expect(listener).not.toHaveBeenCalled();

    saveTourPreferences(tourId, {
      interests: ["architecture"],
      walkingPreference: "less-walking",
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    clearTourPreferences(tourId);
  });
});
