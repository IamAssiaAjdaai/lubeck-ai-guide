import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import { buildWalk, deadlineForToday } from "@citywalk/traveler-core/walkPlanner";
import {
  clearCurrentWalk, loadCurrentWalk, persistCurrentWalk, reopenSavedWalk,
  startCurrentWalk, subscribeCurrentWalk, type WalkStore,
} from "../src/lib/walkStorage";

// Only storage I/O is doubled. Every parser/transform/write/start assertion calls production code.
const slot = "citywalk:native:v2:active:city";
const origin = { lat: 53.86, lng: 10.68 };
function record(id = "saved-record"): WalkJourney {
  return { id, citySlug: "city", settings: { minutes: 180, interests: ["history"], walking: "balanced", start: origin, finish: origin },
    remaining: ["place-0", "place-1"], visited: [], position: origin, finish: origin,
    startedAt: 100, historyDistance: 0 };
}
const places: PublicPlaceCard[] = Array.from({ length: 5 }, (_, i) => ({
  slug: `place-${i}`, category: "see", coordinates: { lat: origin.lat + i * 0.0003, lng: origin.lng }, durationMinutes: 20,
  tags: ["history"], media: [], requestedLocale: "en", resolvedLocale: "en", didFallback: false,
  content: { name: `Synthetic place ${i}`, shortDescription: "Test fixture, not production content" },
}));
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }) };
}
afterEach(() => vi.useRealTimers());

describe("S08 persistence regression boundaries (real production contracts)", () => {
  it.each([null, "null"])("[S08 BASELINE][S01] absent/tombstone %s reads without writing", async raw => {
    const store = memory(); if (raw !== null) store.values.set(slot, raw);
    expect(await loadCurrentWalk("city", store)).toBeUndefined();
    expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[S08 BASELINE][S02] I/O read rejection propagates and cannot mutate bytes", async () => {
    const store = memory(); store.values.set(slot, "preserve-me");
    store.getItem.mockRejectedValueOnce(new Error("storage-offline"));
    await expect(loadCurrentWalk("city", store)).rejects.toThrow("storage-offline");
    expect(store.values.get(slot)).toBe("preserve-me"); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[S08 BASELINE][S03] completed is not active while valid phase-less legacy remains active", async () => {
    const store = memory();
    store.values.set(slot, JSON.stringify({ ...record(), finishedAt: 200 }));
    expect(await loadCurrentWalk("city", store)).toBeUndefined();
    store.values.set(slot, JSON.stringify(record()));
    expect(await loadCurrentWalk("city", store)).toMatchObject({ phase: "active", journey: { id: "saved-record" } });
    expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[S08 PASS][E02] saved replay resets execution/deadline and stores preview without mutating source", async () => {
    const saved = { ...record(), visited: ["place-0"], remaining: ["place-1", "place-1"], historyDistance: 200,
      settings: { ...record().settings, deadline: 9_999_999 }, finishedAt: 300 };
    const before = JSON.stringify(saved);
    const replay = reopenSavedWalk(saved, "new-replay-session");
    expect(replay).toMatchObject({ id: "new-replay-session", savedWalkId: "saved-record", visited: [],
      remaining: ["place-0", "place-1"], historyDistance: 0, position: origin, finishedAt: undefined,
      settings: { ...saved.settings, deadline: undefined } });
    expect(replay.startedAt).toBeGreaterThan(saved.startedAt);
    const store = memory(); await persistCurrentWalk(replay, "preview", store);
    expect(await loadCurrentWalk("city", store)).toMatchObject({ phase: "preview", journey: { id: "new-replay-session" } });
    expect(JSON.stringify(saved)).toBe(before);
  });
  it("[S08 PASS][E05] stale confirmed rebuild cannot clear same-ID changed current or another city", async () => {
    const store = memory(); await persistCurrentWalk(record(), "preview", store);
    const expected = await loadCurrentWalk("city", store);
    await persistCurrentWalk({ ...record(), remaining: ["place-1"], visited: ["place-0"] }, "preview", store);
    await persistCurrentWalk({ ...record("other-current"), citySlug: "other" }, "active", store);
    const currentBytes = store.values.get(slot); const otherBytes = store.values.get("citywalk:native:v2:active:other");
    const writes = store.setItem.mock.calls.length;
    await expect(clearCurrentWalk("city", expected, store)).rejects.toThrow("walk-changed");
    expect(store.values.get(slot)).toBe(currentBytes); expect(store.values.get("citywalk:native:v2:active:other")).toBe(otherBytes);
    expect(store.setItem).toHaveBeenCalledTimes(writes);
  });
  it("[S08 PASS][S07] corrupt slot cannot be cleared under an absent-slot expectation", async () => {
    const store = memory(); store.values.set(slot, "{broken-json");
    await expect(clearCurrentWalk("city", undefined, store)).rejects.toThrow();
    expect(store.values.get(slot)).toBe("{broken-json"); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[S08 BASELINE][S06] failed write never notifies preview success; a real retry succeeds", async () => {
    const store = memory(); const notify = vi.fn(); const stop = subscribeCurrentWalk("city", notify);
    try {
      store.setItem.mockRejectedValueOnce(new Error("disk-full"));
      await expect(persistCurrentWalk(record(), "preview", store)).rejects.toThrow("disk-full");
      expect(notify).not.toHaveBeenCalled(); expect(store.values.has(slot)).toBe(false);
      await persistCurrentWalk(record(), "preview", store);
      expect(notify).toHaveBeenCalledOnce(); expect((await loadCurrentWalk("city", store))?.phase).toBe("preview");
    } finally { stop(); }
  });
  it("[S08 PASS][D02] actual deadline parser rejects past/invalid, normalizes digits, and does not create tomorrow", () => {
    const now = new Date(2026, 9, 28, 12, 0);
    for (const raw of ["", "garbage", "12:00", "11:59", "24:00", "12:99"]) expect(deadlineForToday(raw, now)).toBeUndefined();
    const expected = new Date(2026, 9, 28, 13, 0).getTime();
    expect(deadlineForToday("13:00", now)).toBe(expected);
    expect(deadlineForToday("١٣:٠٠", now)).toBe(expected);
    expect(deadlineForToday("۱۳:۰۰", now)).toBe(expected);
  });
  it("[S08 PASS][D05] actual shared planner reserves walking return and applies real deadline budget", () => {
    const now = new Date(2026, 9, 28, 12).getTime();
    const settings = record().settings;
    const full = buildWalk(places, settings, now);
    const constrained = buildWalk(places, { ...settings, deadline: now + 45 * 60_000 }, now);
    expect(constrained.places.length).toBeGreaterThan(0);
    expect(constrained.places.length).toBeLessThan(full.places.length);
    expect(constrained.minutes).toBeLessThanOrEqual(45);
    expect(constrained.finish).toEqual(origin);
    expect(constrained.walkingMinutes).toBeGreaterThan(0);
    expect(constrained.minutes).toBe(constrained.walkingMinutes + constrained.visitMinutes);
  });
  it("[S08 BASELINE][G04] preview persists as preview; explicit Start is idempotent and identity guarded", async () => {
    const store: WalkStore & ReturnType<typeof memory> = memory();
    await persistCurrentWalk(record(), "preview", store);
    expect((await loadCurrentWalk("city", store))?.phase).toBe("preview");
    await expect(startCurrentWalk("city", "wrong-id", places, true, store)).rejects.toThrow("walk-changed");
    await startCurrentWalk("city", "saved-record", places, true, store);
    const started = await loadCurrentWalk("city", store); const writes = store.setItem.mock.calls.length;
    await startCurrentWalk("city", "saved-record", places, true, store);
    expect(await loadCurrentWalk("city", store)).toEqual(started);
    expect(started?.phase).toBe("active"); expect(store.setItem).toHaveBeenCalledTimes(writes);
  });
});
