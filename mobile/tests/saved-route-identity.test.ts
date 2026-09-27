import { describe, expect, it, vi } from "vitest";
import { advanceWalk, type WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import { loadCurrentWalk, loadSavedWalks, persistCurrentWalk, removeNativeWalk, reopenSavedWalk, savedRouteIdentity, savedWalkState, saveNativeWalk, subscribeSavedWalks, toggleSavedPlace } from "../src/lib/walkStorage";
import { removePlaceFromCurrentWalk } from "../src/lib/walkMembership";
const start = { lat: 53.86, lng: 10.68 };
const route: WalkJourney = { id: "session", citySlug: "lubeck", remaining: ["gate", "church"], visited: [], settings: { minutes: 120, walking: "balanced", interests: ["history"], start }, position: start, startedAt: 100, historyDistance: 0 };
const places: PublicPlaceCard[] = ["gate", "church", "river"].map(slug => ({ slug, category: "see", coordinates: start, durationMinutes: 5, requestedLocale: "en", resolvedLocale: "en", didFallback: false, media: [], content: { name: slug, shortDescription: "Published place" } }));
function memory() {
  const data = new Map<string, string>();
  return { data, getItem: async (key: string) => data.get(key) ?? null, setItem: vi.fn(async (key: string, value: string) => { data.set(key, value); }) };
}
async function save(store: ReturnType<typeof memory>, journey = route) {
  await persistCurrentWalk(journey, "preview", store);
  return saveNativeWalk(journey, places, true, store);
}
describe("saved route identity and edit lineage", () => {
  it("same route across sessions, locale/content names and repeated taps is one record with stable timestamps", async () => {
    const store = memory(); await save(store);
    const original = (await loadSavedWalks(store))[0];
    const translated = { ...route, id: "new-session", startedAt: 500, settings: { ...route.settings, deadline: 900 } };
    await persistCurrentWalk(translated, "preview", store);
    const translatedPlaces = places.map(p => ({ ...p, requestedLocale: "de", resolvedLocale: "de", content: { ...p.content, name: "Kirche" } }));
    await Promise.all([saveNativeWalk(translated, translatedPlaces, true, store), saveNativeWalk(translated, translatedPlaces, true, store)]);
    expect(await loadSavedWalks(store)).toEqual([original]);
    expect(savedWalkState(translated, [original]).status).toBe("saved");
  });
  it("reopening and editing updates the original record, preserving savedAt and membership/favorites", async () => {
    const store = memory(); await save(store);
    const original = (await loadSavedWalks(store))[0];
    const reopened = reopenSavedWalk(original, "reopened");
    await save(store, reopened);
    const changed = await removePlaceFromCurrentWalk("lubeck", "church", store);
    expect(savedWalkState(changed.journey, [original]).status).toBe("changed");
    await toggleSavedPlace({ citySlug: "lubeck", slug: "church", name: "Church" }, store);
    const favorites = store.data.get("citywalk:native:v2:places");
    await saveNativeWalk(changed.journey, places, true, store);
    const saved = await loadSavedWalks(store);
    expect(saved).toHaveLength(1); expect(saved[0]).toMatchObject({ id: original.id, savedAt: original.savedAt, remaining: ["gate"] });
    expect((await loadCurrentWalk("lubeck", store))?.journey.remaining).toEqual(["gate"]);
    expect(store.data.get("citywalk:native:v2:places")).toBe(favorites);
    // Simulated restart: a fresh store interface reads persisted data, not a module cache.
    expect(await loadSavedWalks({ getItem: store.getItem, setItem: store.setItem })).toEqual(saved);
  });
  it("materially different new routes, stop order, city or finish are distinct", async () => {
    const store = memory(); await save(store);
    for (const [index, change] of [{ remaining: ["church", "gate"] }, { remaining: ["river"] }, { citySlug: "hamburg" }, { finish: start }].entries()) {
      await save(store, { ...route, ...change, id: `new-${index}` });
    }
    expect(await loadSavedWalks(store)).toHaveLength(5);
  });
  it("visited/current-stop progress and completion do not change route identity", async () => {
    const store = memory(); await save(store);
    const progress = advanceWalk(route, places[0], true);
    const completed = { ...advanceWalk(progress, places[1], true), finishedAt: 300 };
    expect(savedRouteIdentity(completed)).toBe(savedRouteIdentity(route));
    await persistCurrentWalk(completed, "active", store);
    await saveNativeWalk(completed, places, true, store);
    expect(await loadSavedWalks(store)).toHaveLength(1);
    expect(savedWalkState(completed, await loadSavedWalks(store)).status).toBe("saved");
  });
  it("retains historical duplicates and updates only the explicitly reopened one", async () => {
    const store = memory(); const historical = [route, { ...route, id: "duplicate" }];
    store.data.set("citywalk:native:v2:saved", JSON.stringify(historical));
    await save(store, { ...route, id: "another-session" });
    expect(await loadSavedWalks(store)).toEqual(historical);
    await save(store, { ...reopenSavedWalk(historical[1], "edit"), remaining: ["gate"] });
    const updated = await loadSavedWalks(store);
    expect(updated).toHaveLength(2); expect(updated[0]).toEqual(route); expect(updated[1]).toMatchObject({ id: "duplicate", remaining: ["gate"] });
    await removeNativeWalk("lubeck", "duplicate", store); expect(await loadSavedWalks(store)).toEqual([route]);
  });
  it("notifies all visible save surfaces after save/update/remove without altering current membership", async () => {
    const store = memory(), changed = vi.fn(); const unsubscribe = subscribeSavedWalks(changed);
    const linked = await save(store); expect(changed).toHaveBeenCalledOnce();
    expect(savedWalkState(linked, changed.mock.calls[0][0]).status).toBe("saved");
    const before = await loadCurrentWalk("lubeck", store);
    await removeNativeWalk("lubeck", "session", store);
    expect(savedWalkState(linked, changed.mock.calls[1][0]).status).toBe("unsaved");
    expect(await loadCurrentWalk("lubeck", store)).toEqual(before); unsubscribe();
  });
  it("remove-last/save race cannot overwrite a valid saved record", async () => {
    const store = memory(); await save(store, { ...route, remaining: ["gate"] }); const original = await loadSavedWalks(store);
    const remove = removePlaceFromCurrentWalk("lubeck", "gate", store);
    const staleSave = saveNativeWalk(route, places, true, store);
    await remove; await expect(staleSave).rejects.toThrow("walk-save-empty");
    expect(await loadSavedWalks(store)).toEqual(original);
  });
});
