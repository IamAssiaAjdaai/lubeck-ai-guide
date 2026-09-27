import { describe, expect, it, vi } from "vitest";
import { clearCurrentWalk, loadCurrentWalk, loadSavedWalks, persistCurrentWalk, removeNativeWalk, saveNativeWalk, toggleSavedPlace, walkSaveStatus } from "../src/lib/walkStorage";
import { removePlaceFromCurrentWalk } from "../src/lib/walkMembership";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
const journey: WalkJourney = { id: "draft", citySlug: "lubeck", remaining: ["gate"], visited: [], settings: { minutes: 120, walking: "balanced", interests: ["history"], start: { lat: 53.86, lng: 10.68 } }, position: { lat: 53.86, lng: 10.68 }, startedAt: 10, historyDistance: 0 };
const places: PublicPlaceCard[] = [{ slug: "gate", category: "see", coordinates: journey.position, durationMinutes: 15, tags: [], media: [], requestedLocale: "en", resolvedLocale: "en", didFallback: false, content: { name: "Gate", shortDescription: "A published place" } }];
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null,
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }) };
}
describe("canonical saving of planned visit stops", () => {
  it("rejects the actual empty Preview after removing its final membership without writing saved data", async () => {
    const store = memory(); await persistCurrentWalk(journey, "preview", store);
    const empty = await removePlaceFromCurrentWalk("lubeck", "gate", store);
    store.setItem.mockClear(); const before = new Map(store.values);
    await expect(saveNativeWalk(empty.journey, places, true, store)).rejects.toThrow("walk-save-empty");
    expect(await loadSavedWalks(store)).toEqual([]); expect(store.values).toEqual(before); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("revalidates remove-last/save races and preserves an existing valid saved copy and unrelated data", async () => {
    const store = memory(); await persistCurrentWalk(journey, "preview", store);
    await saveNativeWalk(journey, places, true, store);
    const other = { ...journey, citySlug: "other" }; await persistCurrentWalk(other, "preview", store); await saveNativeWalk(other, places, true, store);
    await toggleSavedPlace({ citySlug: "lubeck", slug: "gate", name: "Gate" }, store);
    const before = new Map(store.values);
    const remove = removePlaceFromCurrentWalk("lubeck", "gate", store);
    const staleSave = saveNativeWalk(journey, places, true, store);
    await remove; await expect(staleSave).rejects.toThrow("walk-save-empty");
    for (const [key, value] of before) if (!key.endsWith("active:lubeck")) expect(store.values.get(key)).toBe(value);
    expect((await loadSavedWalks(store)).find(w => w.id === journey.id && w.citySlug === "lubeck")).toMatchObject(journey);
    expect((await loadCurrentWalk("lubeck", store))?.journey.remaining).toEqual([]);
  });
  it("rejects an explicitly empty update even when an older valid saved copy/current record exists", async () => {
    const store = memory(); await persistCurrentWalk(journey, "preview", store); await saveNativeWalk(journey, places, true, store);
    const before = new Map(store.values); store.setItem.mockClear();
    await expect(saveNativeWalk({ ...journey, remaining: [] }, places, true, store)).rejects.toThrow("walk-save-empty");
    expect(store.values).toEqual(before); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("saves one valid stop, persists it across reloads, and deduplicates repeated saves", async () => {
    const store = memory(); await persistCurrentWalk(journey, "preview", store);
    await Promise.all([saveNativeWalk(journey, places, true, store), saveNativeWalk(journey, places, true, store)]);
    const reopened = { ...store, values: new Map(store.values), getItem: async (key: string) => store.values.get(key) ?? null };
    expect(await loadSavedWalks(reopened)).toMatchObject([journey]);
    expect((await loadCurrentWalk("lubeck", store))?.phase).toBe("preview");
  });
  it.each([false, true])("saves a visited itinerary with no remaining stops (finished %s)", async finished => {
    const store = memory(), completed = { ...journey, remaining: [], visited: ["gate"], ...(finished ? { finishedAt: 100 } : {}) };
    await persistCurrentWalk(completed, "active", store);
    expect(walkSaveStatus(completed, places)).toBe("ready");
    await saveNativeWalk(completed, places, true, store);
    expect(await loadSavedWalks(store)).toMatchObject([completed]);
  });
  it("distinguishes loading, unresolved and ineligible data without an extra network request or saved write", async () => {
    const store = memory(); await persistCurrentWalk(journey, "preview", store); store.setItem.mockClear();
    expect(walkSaveStatus({ ...journey, remaining: [] }, [], false)).toBe("loading");
    await expect(saveNativeWalk(journey, places, false, store)).rejects.toThrow("walk-save-loading");
    await expect(saveNativeWalk(journey, [], true, store)).rejects.toThrow("walk-save-unresolved");
    await expect(saveNativeWalk(journey, [{ ...places[0], status: "closed" }], true, store)).rejects.toThrow("walk-save-empty");
    expect(store.setItem).not.toHaveBeenCalled();
  });
  it("cannot resurrect a discarded/replaced session from a stale Save callback", async () => {
    const store = memory(); await persistCurrentWalk(journey, "preview", store);
    await clearCurrentWalk("lubeck", await loadCurrentWalk("lubeck", store), store);
    await expect(saveNativeWalk(journey, places, true, store)).rejects.toThrow("walk-changed");
    await persistCurrentWalk({ ...journey, id: "new" }, "preview", store);
    await expect(saveNativeWalk(journey, places, true, store)).rejects.toThrow("walk-changed");
    expect(await loadSavedWalks(store)).toEqual([]);
  });
  it("preserves historical empty records until the owner explicitly removes them", async () => {
    const store = memory(), empty = { ...journey, remaining: [] };
    store.values.set("citywalk:native:v2:saved", JSON.stringify([empty])); store.setItem.mockClear();
    expect(await loadSavedWalks(store)).toEqual([empty]); expect(store.setItem).not.toHaveBeenCalled();
    await removeNativeWalk(empty.citySlug, empty.id, store);
    expect(await loadSavedWalks(store)).toEqual([]);
  });
});

it("blocks production local permanent saves; historical records stay readable/removable", async () => {
  await expect(saveNativeWalk(journey, places)).rejects.toThrow("account-required");
});
it("account persistence revalidates the latest draft under membership serialization", async () => {
  const { saveCurrentAccountWalk } = await import("../src/lib/walkStorage");
  const store = memory(); await persistCurrentWalk(journey, "preview", store);
  const persist = vi.fn(async () => ({ accountSavedWalkId: "server", accountSavedUserId: "owner" }));
  const remove = removePlaceFromCurrentWalk("lubeck", "gate", store);
  const save = saveCurrentAccountWalk(journey, places, true, persist, store);
  await remove; await expect(save).rejects.toThrow("walk-save-empty"); expect(persist).not.toHaveBeenCalled();
  expect(await loadSavedWalks(store)).toEqual([]);
});
it("account save preserves old local saves/favorites and writes only current-session lineage", async () => {
  const { saveCurrentAccountWalk } = await import("../src/lib/walkStorage");
  const store = memory(); await persistCurrentWalk(journey, "preview", store); await saveNativeWalk(journey, places, true, store);
  await toggleSavedPlace({ citySlug: "lubeck", slug: "gate", name: "Gate" }, store);
  const before = new Map(store.values); const persist = vi.fn(async () => ({ accountSavedWalkId: "server", accountSavedUserId: "owner" }));
  await saveCurrentAccountWalk(journey, places, true, persist, store);
  expect(store.values.get("citywalk:native:v2:saved")).toBe(before.get("citywalk:native:v2:saved"));
  expect(store.values.get("citywalk:native:v2:places")).toBe(before.get("citywalk:native:v2:places"));
  expect((await loadCurrentWalk("lubeck", store))?.journey).toMatchObject({ id: "draft", accountSavedWalkId: "server" });
});
