import { describe, expect, it, vi } from "vitest";

import {
  LOCAL_TRIPS_STORAGE_KEY,
  loadLocalTrips,
  saveLocalTrip,
} from "../src/lib/tripStorage";

function createStore(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: vi.fn(async () => value),
    setItem: vi.fn(async (_key: string, nextValue: string) => { value = nextValue; }),
    read: () => value,
  };
}

const result = {
  stops: [{
    place: {
      slug: "holstentor",
      category: "see" as const,
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
};

describe("native guest trip save boundary", () => {
  it("writes and loads an identifier-only saved trip without private place data", async () => {
    const store = createStore();
    await saveLocalTrip({
      citySlug: "lubeck",
      timeBudgetMinutes: 60,
      preferences: { interests: ["history"], walkingPreference: "standard" },
      result,
    }, {
      store,
      createId: () => "saved-one",
      now: () => new Date("2026-09-14T10:00:00.000Z"),
    });

    const serialized = store.read() ?? "";
    expect(store.setItem).toHaveBeenCalledWith(LOCAL_TRIPS_STORAGE_KEY, expect.any(String));
    expect(await loadLocalTrips(store)).toEqual([expect.objectContaining({
      id: "saved-one",
      citySlug: "lubeck",
      stopSlugs: ["holstentor"],
      timeBudgetMinutes: 60,
      totalVisitMinutes: 30,
    })]);
    expect(serialized).not.toMatch(/latitude|longitude|53\.8662|10\.6797|Holstentor|Gate/u);
  });

  it("keeps multiple trips in the same city under stable distinct IDs", async () => {
    const store = createStore();
    await saveLocalTrip({
      citySlug: "lubeck",
      timeBudgetMinutes: 60,
      preferences: { interests: [], walkingPreference: "standard" },
      result,
    }, { store, createId: () => "first", now: () => new Date("2026-09-14T10:00:00Z") });
    await saveLocalTrip({
      citySlug: "lubeck",
      timeBudgetMinutes: 90,
      preferences: { interests: ["architecture"], walkingPreference: "less-walking" },
      result,
    }, { store, createId: () => "second", now: () => new Date("2026-09-14T11:00:00Z") });

    expect((await loadLocalTrips(store)).map(({ id }) => id)).toEqual(["second", "first"]);
  });

  it("fails safely for malformed and legacy version-one data", async () => {
    await expect(loadLocalTrips(createStore("not-json"))).resolves.toEqual([]);
    await expect(loadLocalTrips(createStore(JSON.stringify({ version: 1 })))).resolves.toEqual([]);
    await expect(loadLocalTrips(createStore(JSON.stringify([{
      version: 1,
      citySlug: "lubeck",
      stopSlugs: ["holstentor"],
    }])))).resolves.toEqual([]);
  });
});
