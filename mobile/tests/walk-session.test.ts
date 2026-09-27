import { describe, expect, it, vi } from "vitest";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import { clearCurrentWalk, loadActiveWalk, loadCurrentWalk, loadSavedPlaces, loadSavedWalks, persistCurrentWalk, saveNativeWalk, startCurrentWalk, subscribeCurrentWalk, toggleSavedPlace, walkStartStatus } from "../src/lib/walkStorage";
import { removePlaceFromCurrentWalk } from "../src/lib/walkMembership";
const place: PublicPlaceCard = { slug: "gate", category: "see", coordinates: { lat: 53.86, lng: 10.68 }, durationMinutes: 15, tags: [], media: [], requestedLocale: "en", resolvedLocale: "en", didFallback: false, content: { name: "Gate", shortDescription: "A place" } };
function session(remaining = [place.slug]): WalkJourney {
  return { id: "draft", citySlug: "lubeck", remaining, visited: [], startedAt: 10, position: place.coordinates, historyDistance: 0, settings: { start: place.coordinates, minutes: 120, interests: ["history"], walking: "balanced" } };
}
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null,
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }) };
}
describe("canonical native preview start and session reset", () => {
  it.each([{ remaining: [] }, { remaining: ["unknown"] }])("rejects empty/unresolved restored preview $remaining without writes or notifications", async ({ remaining }) => {
    const store = memory(), draft = session(remaining);
    await persistCurrentWalk(draft, "preview", store);
    const before = new Map(store.values), changed = vi.fn(), off = subscribeCurrentWalk("lubeck", changed);
    store.setItem.mockClear();
    try {
      await expect(startCurrentWalk("lubeck", draft.id, [place], true, store)).rejects.toThrow("walk-start-");
      expect(store.values).toEqual(before); expect(store.setItem).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled();
      expect(await loadActiveWalk("lubeck", store)).toBeUndefined();
    } finally { off(); }
  });
  it("rejects ineligible places using planner eligibility, separately from content loading", async () => {
    const store = memory(), draft = session(); await persistCurrentWalk(draft, "preview", store);
    const unavailable = { ...place, status: "closed" as const };
    expect(walkStartStatus(draft, [unavailable])).toBe("empty");
    await expect(startCurrentWalk("lubeck", draft.id, [unavailable], true, store)).rejects.toThrow("walk-start-empty");
    await expect(startCurrentWalk("lubeck", draft.id, [place], false, store)).rejects.toThrow("walk-start-loading");
    expect(walkStartStatus(session([]), [], false)).toBe("loading");
  });
  it("rechecks queued final-stop removal instead of a captured nonempty draft", async () => {
    const store = memory(), draft = session(); await persistCurrentWalk(draft, "preview", store);
    const removal = removePlaceFromCurrentWalk("lubeck", place.slug, store);
    const start = startCurrentWalk("lubeck", draft.id, [place], true, store);
    await removal; await expect(start).rejects.toThrow("walk-start-empty");
    expect((await loadCurrentWalk("lubeck", store))?.phase).toBe("preview");
  });
  it("starts one valid stop exactly once, with a fresh timestamp and deduplicated IDs", async () => {
    const store = memory(), draft = session([place.slug, place.slug]); await persistCurrentWalk(draft, "preview", store);
    store.setItem.mockClear();
    const [one, two] = await Promise.all([startCurrentWalk("lubeck", draft.id, [place], true, store), startCurrentWalk("lubeck", draft.id, [place], true, store)]);
    expect(one).toEqual(two); expect(one.phase).toBe("active"); expect(one.journey.startedAt).toBeGreaterThan(10);
    expect(one.journey.remaining).toEqual([place.slug]); expect(store.setItem).toHaveBeenCalledOnce();
  });
  it.each([false, true])("does not restart or reject existing completed-stop/return-only active walks (return %s)", async returning => {
    const store = memory(), draft = { ...session([]), visited: returning ? [] : [place.slug], finish: returning ? place.coordinates : undefined };
    await persistCurrentWalk(draft, "active", store); store.setItem.mockClear();
    expect((await startCurrentWalk("lubeck", draft.id, [], true, store)).journey).toEqual(draft);
    expect(store.setItem).not.toHaveBeenCalled();
    await persistCurrentWalk({ ...draft, finishedAt: 100 }, "active", store);
    expect(await loadCurrentWalk("lubeck", store)).toBeUndefined();
  });
  it("rejects replaced or corrupt drafts without starting a different session", async () => {
    const store = memory(); await persistCurrentWalk(session(), "preview", store);
    await expect(startCurrentWalk("lubeck", "old-id", [place], true, store)).rejects.toThrow("walk-changed");
    store.values.set("citywalk:native:v2:active:lubeck", "{}"); store.setItem.mockClear();
    await expect(startCurrentWalk("lubeck", "draft", [place], true, store)).rejects.toThrow("walk-changed");
    expect(store.setItem).not.toHaveBeenCalled();
  });
  it("clears only the confirmed current session, preserving saved original, favorites and private state", async () => {
    const store = memory(), draft = session();
    await persistCurrentWalk(draft, "preview", store);
    await saveNativeWalk(draft, [place], true, store); await toggleSavedPlace({ citySlug: "lubeck", slug: place.slug, name: "Gate" }, store);
    for (const key of ["locale", "account", "review-history", "citywalk:native:v2:active:hamburg"]) store.values.set(key, "keep");
    await persistCurrentWalk(draft, "active", store);
    const before = new Map(store.values), current = await loadCurrentWalk("lubeck", store);
    const changed = vi.fn(), off = subscribeCurrentWalk("lubeck", changed);
    try { await clearCurrentWalk("lubeck", current, store); expect(changed).toHaveBeenCalledWith(undefined); } finally { off(); }
    expect(await loadCurrentWalk("lubeck", store)).toBeUndefined();
    for (const [key, value] of before) if (!key.endsWith("active:lubeck")) expect(store.values.get(key)).toBe(value);
    expect(await loadSavedWalks(store)).toEqual([draft]); expect(await loadSavedPlaces(store)).toHaveLength(1);
    expect([...store.values.values()].some(v => v.includes('"finishedAt"'))).toBe(false);
  });
  it("does not erase a concurrent membership edit or clear on failed persistence", async () => {
    const store = memory(); await persistCurrentWalk(session(), "preview", store);
    const snapshot = await loadCurrentWalk("lubeck", store);
    await removePlaceFromCurrentWalk("lubeck", place.slug, store);
    await expect(clearCurrentWalk("lubeck", snapshot, store)).rejects.toThrow("walk-changed");
    const current = await loadCurrentWalk("lubeck", store);
    store.setItem.mockRejectedValueOnce(new Error("disk full"));
    await expect(clearCurrentWalk("lubeck", current, store)).rejects.toThrow("disk full");
    expect(await loadCurrentWalk("lubeck", store)).toEqual(current);
  });
});
