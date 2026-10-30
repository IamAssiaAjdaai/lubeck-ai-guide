import { describe, expect, it, vi } from "vitest";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import {
  observeCurrentWalk, commitCurrentWalkPreview, persistCurrentWalk, loadCurrentWalk,
  clearCurrentWalk, changeCurrentWalk, startCurrentWalk, subscribeCurrentWalk,
  reopenSavedWalk, type WalkSlotReceipt,
} from "../src/lib/walkStorage";
import { addPlaceToCurrentWalk } from "../src/lib/walkMembership";

const key = "citywalk:native:v2:active:city";
const point = { lat: 53.86, lng: 10.68 };
function journey(id = "session"): WalkJourney {
  return { id, citySlug: "city", remaining: ["place-0"], visited: [], settings: { minutes: 120, interests: ["history"], walking: "balanced", start: point },
    position: point, historyDistance: 0, startedAt: 10 };
}
function memory(raw?: string) {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set(key, raw);
  return { values, getItem: vi.fn(async (slot: string) => values.get(slot) ?? null),
    setItem: vi.fn(async (slot: string, value: string) => { values.set(slot, value); }) };
}
async function receipt(store: ReturnType<typeof memory>) {
  const observed = await observeCurrentWalk("city", store);
  expect(["empty", "current", "terminal"]).toContain(observed.kind);
  if (!("receipt" in observed)) throw new Error("Expected real observation receipt");
  return observed.receipt;
}
const place: PublicPlaceCard = { slug: "place-0", category: "see", coordinates: point, durationMinutes: 15, tags: ["history"], media: [],
  requestedLocale: "en", resolvedLocale: "en", didFallback: false, content: { name: "Synthetic place", shortDescription: "Fixture, not city content" } };

describe("classified city current-walk storage (real implementation, I/O faults only)", () => {
  it.each([undefined, "null"])("[S01] observes absent/tombstone %s without writing or leaking raw bytes", async raw => {
    const store = memory(raw);
    const o = await observeCurrentWalk("city", store);
    expect(o.kind).toBe("empty");
    expect(store.setItem).not.toHaveBeenCalled();
    expect(Object.keys(await receipt(store))).toEqual([]);
    expect(JSON.stringify(await receipt(store))).toBe("{}");
    expect(Object.isFrozen(o)).toBe(true);
  });
  it.each([undefined, "active", "preview"])("[S03] preserves supported current phase %s and legacy identity", async phase => {
    const store = memory(JSON.stringify({ ...journey(), ...(phase ? { nativePhase: phase } : {}) }));
    expect(await observeCurrentWalk("city", store)).toMatchObject({ kind: "current", current: { journey: journey(), phase: phase === "preview" ? "preview" : "active" } });
    expect(store.setItem).not.toHaveBeenCalled();
  });
  it.each([0, 100])("[S03] classifies a valid completed timestamp %s as terminal without resuming or clearing", async finishedAt => {
    const raw = JSON.stringify({ ...journey(), finishedAt }); const store = memory(raw);
    expect(await observeCurrentWalk("city", store)).toMatchObject({ kind: "terminal", journey: { finishedAt } });
    expect(store.values.get(key)).toBe(raw); expect(store.setItem).not.toHaveBeenCalled();
    await expect(clearCurrentWalk("city", undefined, store)).rejects.toThrow("walk-changed");
    expect(store.values.get(key)).toBe(raw);
  });
  it.each(["", "{broken", "undefined", "[]", "false", "{}", JSON.stringify({ ...journey(), citySlug: "other" }),
    JSON.stringify({ ...journey(), nativePhase: "future-phase" }), JSON.stringify({ ...journey(), nativePhase: null }),
    JSON.stringify({ ...journey(), finishedAt: 100, nativePhase: "future-phase" })])("[S02][S07] blocks invalid raw slot %s and all affected mutation fallbacks", async raw => {
    const store = memory(raw);
    expect(await observeCurrentWalk("city", store)).toEqual({ kind: "blocked" });
    await expect(clearCurrentWalk("city", undefined, store)).rejects.toThrow("walk-storage-blocked");
    await expect(addPlaceToCurrentWalk("city", place.slug, [place], store)).rejects.toThrow("walk-storage-blocked");
    await expect(persistCurrentWalk(journey("replacement"), "preview", store)).rejects.toThrow("walk-storage-blocked");
    await expect(startCurrentWalk("city", "session", [place], true, store)).rejects.toThrow("walk-changed");
    expect(store.values.get(key)).toBe(raw); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[S02] reports read errors separately and preserves legacy public read rejection", async () => {
    const raw = JSON.stringify(journey()); const store = memory(raw);
    store.getItem.mockRejectedValue(new Error("read-offline"));
    expect(await observeCurrentWalk("city", store)).toEqual({ kind: "unavailable" });
    await expect(loadCurrentWalk("city", store)).rejects.toThrow("read-offline");
    await expect(clearCurrentWalk("city", undefined, store)).rejects.toThrow("walk-storage-unavailable");
    expect(store.values.get(key)).toBe(raw); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[S01][G04] commits a real preview only against unchanged empty/terminal observations", async () => {
    for (const raw of [undefined, JSON.stringify({ ...journey("completed"), finishedAt: 100 })]) {
      const store = memory(raw); const token = await receipt(store);
      const result = await commitCurrentWalkPreview(journey("new"), token, "new", { store });
      expect(result).toEqual({ phase: "preview", journey: journey("new") });
      expect(await loadCurrentWalk("city", store)).toEqual(result);
      expect(store.setItem).toHaveBeenCalledTimes(1);
      expect(result.journey.startedAt).toBe(10);
    }
  });
  it("[S04] refuses a stale empty observation after another queued preview is written", async () => {
    const store = memory(); const token = await receipt(store);
    await persistCurrentWalk(journey("newer"), "active", store); const bytes = store.values.get(key);
    await expect(commitCurrentWalkPreview(journey("stale"), token, "new", { store })).rejects.toThrow("walk-changed");
    expect(store.values.get(key)).toBe(bytes); expect(store.setItem).toHaveBeenCalledTimes(1);
  });
  it("[S04] real browse Add to Walk creates B and prevents draft A replacing it", async () => {
    const store = memory(); const token = await receipt(store);
    const b = await addPlaceToCurrentWalk("city", place.slug, [place], store); const bytes = store.values.get(key);
    await expect(commitCurrentWalkPreview(journey("draft-a"), token, "new", { store })).rejects.toThrow("walk-changed");
    expect((await loadCurrentWalk("city", store))?.journey.id).toBe(b.journey.id);
    expect(store.values.get(key)).toBe(bytes); expect(store.setItem).toHaveBeenCalledTimes(1);
  });
  it.each(["membership", "phase", "linkage"] as const)("[S05] rejects same-ID %s changes, preserving exact current bytes", async field => {
    const store = memory(JSON.stringify({ ...journey(), nativePhase: "preview" })); const token = await receipt(store);
    const changed = field === "membership" ? { ...journey(), visited: ["place-0"], remaining: [] }
      : field === "phase" ? journey() : { ...journey(), accountSavedWalkId: "linked-record", accountSavedUserId: "owner" };
    if (field === "membership") await changeCurrentWalk("city", current => ({ ...current!, journey: changed }), store);
    else await persistCurrentWalk(changed, field === "phase" ? "active" : "preview", store);
    const bytes = store.values.get(key);
    await expect(commitCurrentWalkPreview(journey("edited"), token, { customize: "session" }, { store })).rejects.toThrow("walk-changed");
    expect(store.values.get(key)).toBe(bytes); expect(store.setItem).toHaveBeenCalledTimes(1);
  });
  it("[S05] permits exact explicit Customize while preserving current saved/account linkage", async () => {
    const linked = { ...journey(), savedWalkId: "saved-source", accountSavedWalkId: "account-source", accountSavedUserId: "owner" };
    const store = memory(JSON.stringify({ ...linked, nativePhase: "preview" })); store.values.set("citywalk:native:v2:saved", "preserve-saved-bytes");
    const result = await commitCurrentWalkPreview(journey("new-execution"), await receipt(store), { customize: "session" }, { store });
    expect(result.journey).toMatchObject({ ...linked, id: "new-execution" });
    expect(store.values.get("citywalk:native:v2:saved")).toBe("preserve-saved-bytes");
  });
  it.each(["new", "replay"] as const)("[E04] intent %s cannot replace even an unchanged unfinished current", async intent => {
    const raw = JSON.stringify(journey("keep-current")); const store = memory(raw);
    await expect(commitCurrentWalkPreview(journey("replacement"), await receipt(store), intent, { store })).rejects.toThrow("walk-changed");
    expect(store.values.get(key)).toBe(raw); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[E02] saved replay into empty slot preserves source/lineage and is a distinct preview", async () => {
    const store = memory(); const saved = { ...journey("saved"), visited: ["visited"], settings: { ...journey().settings, deadline: 200 } };
    const source = JSON.stringify(saved); store.values.set("citywalk:native:v2:saved", source);
    const replay = reopenSavedWalk(saved, "replayed");
    const result = await commitCurrentWalkPreview(replay, await receipt(store), "replay", { store });
    expect(result).toMatchObject({ phase: "preview", journey: { id: "replayed", savedWalkId: "saved", remaining: ["visited", "place-0"], visited: [] } });
    expect(result.journey.settings.deadline).toBeUndefined(); expect(store.values.get("citywalk:native:v2:saved")).toBe(source);
  });
  it("[S05] rejects forged, serialized, cross-city/store and invalid-candidate receipts without writes", async () => {
    const store = memory(), other = memory(); const token = await receipt(store);
    await expect(commitCurrentWalkPreview(journey(), {} as WalkSlotReceipt, "new", { store })).rejects.toThrow("walk-changed");
    await expect(commitCurrentWalkPreview(journey(), JSON.parse(JSON.stringify(token)), "new", { store })).rejects.toThrow("walk-changed");
    await expect(commitCurrentWalkPreview(journey(), token, "new", { store: other })).rejects.toThrow("walk-changed");
    await expect(commitCurrentWalkPreview({ ...journey(), citySlug: "other" }, token, "new", { store })).rejects.toThrow("walk-changed");
    await expect(commitCurrentWalkPreview({ ...journey(), historyDistance: -1 }, token, "new", { store })).rejects.toThrow("Invalid journey");
    await expect(commitCurrentWalkPreview({ ...journey(), nativePhase: "unsupported" } as WalkJourney, token, "new", { store })).rejects.toThrow("Invalid journey");
    expect(store.setItem).not.toHaveBeenCalled(); expect(other.setItem).not.toHaveBeenCalled();
  });
  it("[S04][G01] two receipts/rapid queued commits yield one successful preview", async () => {
    const store = memory(); const first = await receipt(store), second = await receipt(store);
    const results = await Promise.allSettled([commitCurrentWalkPreview(journey("first"), first, "new", { store }), commitCurrentWalkPreview(journey("second"), second, "new", { store })]);
    expect(results.map(r => r.status)).toEqual(["fulfilled", "rejected"]);
    expect((await loadCurrentWalk("city", store))?.journey.id).toBe("first"); expect(store.setItem).toHaveBeenCalledTimes(1);
  });
  it("[S06] rejected write consumes receipt, sends no success, and a fresh observation allows truthful retry", async () => {
    const store = memory(), token = await receipt(store), changed = vi.fn(); const off = subscribeCurrentWalk("city", changed);
    try {
      store.setItem.mockRejectedValueOnce(new Error("disk-full"));
      await expect(commitCurrentWalkPreview(journey(), token, "new", { store })).rejects.toThrow("disk-full");
      expect(changed).not.toHaveBeenCalled(); expect(store.values.has(key)).toBe(false);
      await expect(commitCurrentWalkPreview(journey(), token, "new", { store })).rejects.toThrow("walk-changed");
      await commitCurrentWalkPreview(journey(), await receipt(store), "new", { store });
      expect(changed).toHaveBeenCalledOnce(); expect(store.setItem).toHaveBeenCalledTimes(2);
    } finally { off(); }
  });
  it("[S06] write-applied-then-rejected is observed as current and cannot be blindly replaced", async () => {
    const store = memory(), token = await receipt(store), changed = vi.fn(); const off = subscribeCurrentWalk("city", changed);
    store.setItem.mockImplementationOnce(async (slot, value) => { store.values.set(slot, value); throw new Error("uncertain-write"); });
    try {
      await expect(commitCurrentWalkPreview(journey(), token, "new", { store })).rejects.toThrow("uncertain-write");
      expect(changed).not.toHaveBeenCalled(); expect(await observeCurrentWalk("city", store)).toMatchObject({ kind: "current", current: { phase: "preview", journey: { id: "session" } } });
      await expect(commitCurrentWalkPreview(journey("duplicate"), await receipt(store), "new", { store })).rejects.toThrow("walk-changed");
      expect(store.setItem).toHaveBeenCalledTimes(1);
    } finally { off(); }
  });
  it("[S05] captures caller-owned candidate and intent before queued asynchronous work", async () => {
    const store = memory(); const token = await receipt(store); const candidate = journey("captured");
    const pending = commitCurrentWalkPreview(candidate, token, "new", { store });
    candidate.citySlug = "other"; candidate.remaining = []; candidate.settings.minutes = 999;
    await pending;
    expect(await loadCurrentWalk("city", store)).toEqual({ phase: "preview", journey: journey("captured") });
    expect(store.values.has("citywalk:native:v2:active:other")).toBe(false);
  });
  it("[S02] a commit-time read failure is never empty and cannot write", async () => {
    const store = memory(); const token = await receipt(store);
    store.getItem.mockRejectedValueOnce(new Error("offline-at-commit"));
    await expect(commitCurrentWalkPreview(journey(), token, "new", { store })).rejects.toThrow("offline-at-commit");
    expect(store.values.has(key)).toBe(false); expect(store.setItem).not.toHaveBeenCalled();
  });
  it("[G02] cancellation before the actual write, including after await, performs no write", async () => {
    const store = memory(); const token = await receipt(store);
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(commitCurrentWalkPreview(journey(), token, "new", { store, isCurrent })).rejects.toThrow("walk-cancelled");
    expect(store.setItem).not.toHaveBeenCalled(); expect(isCurrent).toHaveBeenCalledTimes(2);
  });
  it("[G02] a write already started may finish after retirement; it stays preview and never auto-starts", async () => {
    const store = memory(); const token = await receipt(store); let live = true;
    let signal!: () => void, finish!: () => void;
    const began = new Promise<void>(r => { signal = r; }), pending = new Promise<void>(r => { finish = r; });
    store.setItem.mockImplementationOnce(async (slot, value) => { store.values.set(slot, value); signal(); await pending; });
    const write = commitCurrentWalkPreview(journey(), token, "new", { store, isCurrent: () => live });
    await began; live = false; finish(); await write;
    expect(await loadCurrentWalk("city", store)).toEqual({ phase: "preview", journey: journey() }); expect(store.setItem).toHaveBeenCalledTimes(1);
  });
  it("[S04] rechecks exact bytes at the writer boundary even if the I/O source changes between reads", async () => {
    const store = memory(); const token = await receipt(store); let reads = 0;
    store.getItem.mockImplementation(async slot => {
      reads++; if (reads === 2) store.values.set(key, JSON.stringify(journey("appeared")));
      return store.values.get(slot) ?? null;
    });
    await expect(commitCurrentWalkPreview(journey("stale"), token, "new", { store })).rejects.toThrow("walk-changed");
    expect((await loadCurrentWalk("city", store))?.journey.id).toBe("appeared"); expect(store.setItem).not.toHaveBeenCalled();
  });
});
