import { describe, expect, it } from "vitest";
import {
  loadActiveWalk,
  loadSavedWalks,
  loadSavedPlaces,
  persistActiveWalk,
  saveNativeWalk,
  removeNativeWalk,
  toggleSavedPlace,
  saveWalkFeedback,
  type WalkStore,
} from "../src/lib/walkStorage";
import {
  loadLocalTrips,
  saveLocalTrip,
  removeLocalTrip,
} from "../src/lib/tripStorage";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
const start = { lat: 53.86, lng: 10.68 };
const journey: WalkJourney = {
  id: "one",
  citySlug: "city",
  settings: {
    minutes: 120,
    interests: ["nature"],
    walking: "balanced",
    start,
    finish: start,
  },
  remaining: ["place"],
  visited: [],
  position: start,
  finish: start,
  startedAt: Date.now(),
  historyDistance: 0,
};
function memory() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: async (k: string) => values.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
describe("anonymous native V2 persistence", () => {
  it("resumes active journeys within the same city only", async () => {
    const store = memory();
    await persistActiveWalk(journey, store);
    expect(await loadActiveWalk("city", store)).toEqual(journey);
    expect(await loadActiveWalk("other", store)).toBeUndefined();
    await persistActiveWalk({ ...journey, finishedAt: Date.now() }, store);
    expect(await loadActiveWalk("city", store)).toBeUndefined();
  });
  it("deduplicates saves and scopes removal by city and ID", async () => {
    const store = memory();
    await Promise.all([
      saveNativeWalk(journey, store),
      saveNativeWalk(journey, store),
      saveNativeWalk({ ...journey, citySlug: "other" }, store),
    ]);
    expect(await loadSavedWalks(store)).toHaveLength(2);
    await removeNativeWalk("city", "one", store);
    expect((await loadSavedWalks(store)).map((w) => w.citySlug)).toEqual([
      "other",
    ]);
  });
  it("toggles saved places without cross-city collisions", async () => {
    const store = memory(),
      place = { citySlug: "city", slug: "place", name: "Place" };
    await Promise.all([
      toggleSavedPlace(place, store),
      toggleSavedPlace({ ...place, citySlug: "other" }, store),
    ]);
    expect(await loadSavedPlaces(store)).toHaveLength(2);
    expect(await toggleSavedPlace(place, store)).toBe(false);
    expect((await loadSavedPlaces(store))[0].citySlug).toBe("other");
  });
  it("does not rewrite storage when a read fails", async () => {
    let writes = 0;
    const store: WalkStore = {
      getItem: async () => {
        throw new Error("offline");
      },
      setItem: async () => {
        writes++;
      },
    };
    await expect(removeNativeWalk("city", "one", store)).rejects.toThrow();
    await expect(saveNativeWalk(journey, store)).rejects.toThrow();
    expect(writes).toBe(0);
  });
  it("persists feedback separately from active routes", async () => {
    const store = memory();
    await persistActiveWalk(journey, store);
    await saveWalkFeedback(journey.id, "fit", "yes", store);
    expect(await loadActiveWalk("city", store)).toEqual(journey);
    expect([...store.values.values()]).toContain("yes");
  });
  it("retains legacy saved trips while V2 saves and removals occur", async () => {
    const store = memory();
    await saveLocalTrip(
      {
        citySlug: "city",
        timeBudgetMinutes: 60,
        preferences: { interests: ["history"], walkingPreference: "standard" },
        result: {
          stops: [
            {
              place: { slug: "place" } as never,
              legDistanceMeters: 0,
              legWalkingMinutes: 0,
            },
          ],
          totalVisitMinutes: 10,
          totalMinutes: 10,
          totalWalkingMinutes: 0,
          totalDistanceMeters: 0,
        },
      },
      { store, createId: () => "legacy" },
    );
    await saveNativeWalk(journey, store);
    await removeNativeWalk("city", "one", store);
    expect(await loadLocalTrips(store)).toHaveLength(1);
    await removeLocalTrip("other", "legacy", store);
    expect(await loadLocalTrips(store)).toHaveLength(1);
    await removeLocalTrip("city", "legacy", store);
    expect(await loadLocalTrips(store)).toHaveLength(0);
  });
});
