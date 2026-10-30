import { describe, expect, it } from "vitest";
import { createCuratedProgress, curatedResumeIndex, markCuratedStop, parseCuratedProgress, setCuratedExecutionState } from "@citywalk/traveler-core";
import { changeCuratedExecutionState, loadCuratedProgress, openCuratedProgress, updateCuratedProgress } from "../src/lib/curatedProgressStorage";
import { accountLocalDataContract, purgeDeletedAccountLocalData } from "../src/lib/auth/accountLocalData";
const stops = ["holstentor", "marienkirche", "rathaus", "heiligen-geist-hospital", "buddenbrookhaus"];
function memory() { const values = new Map<string, string>(); return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } }; }
describe("curated route execution", () => {
  it("tracks skip/visit independently of the immutable five-stop order", () => {
    const initial = createCuratedProgress("lubeck", "historic-center-walk", stops, 100);
    let progress = markCuratedStop(initial, 0, "visited", 101);
    progress = markCuratedStop(progress, 1, "skipped", 102);
    expect(curatedResumeIndex(progress)).toBe(2);
    expect(initial.statuses).toEqual(stops.map(() => "pending"));
    for (let i = 2; i < 5; i++) progress = markCuratedStop(progress, i, "visited", 103);
    expect(curatedResumeIndex(progress)).toBe(-1);
    expect(progress.stopSlugs).toEqual(stops);
    expect(progress.statuses).toEqual(["visited", "skipped", "visited", "visited", "visited"]);
  });
  it("rejects malformed storage and definitions instead of inventing progress", () => {
    expect(parseCuratedProgress({})).toBeUndefined();
    expect(() => createCuratedProgress("lubeck", "historic", ["a", "a"])).toThrow();
    const progress = createCuratedProgress("lubeck", "historic", stops, 100);
    expect(parseCuratedProgress({ ...progress, statuses: ["visited"] })).toBeUndefined();
    expect(parseCuratedProgress({ ...progress, citySlug: undefined })).toBeUndefined();
    expect(parseCuratedProgress({ ...progress, statuses: ["pending", "visited", "pending", "pending", "pending"] })).toBeUndefined();
    expect(() => markCuratedStop(progress, 5, "visited")).toThrow();
    expect(() => markCuratedStop(progress, 1, "visited")).toThrow();
  });
  it("recovers the same execution across launches without touching the custom walk slot", async () => {
    const store = memory(); store.values.set("citywalk:native:v2:active:lubeck", "custom-walk");
    const first = await openCuratedProgress("lubeck", "historic", stops, store);
    const next = await updateCuratedProgress(first, 0, "skipped", store);
    expect(await loadCuratedProgress("lubeck", "historic", store)).toEqual(next);
    expect(await openCuratedProgress("lubeck", "historic", stops, store)).toEqual(next);
    expect(store.values.get("citywalk:native:v2:active:lubeck")).toBe("custom-walk");
    await expect(openCuratedProgress("lubeck", "historic", [...stops].reverse(), store)).rejects.toThrow();
  });
  it("serializes rapid mutations and rejects stale screens without losing progress", async () => {
    const store = memory(), initial = await openCuratedProgress("lubeck", "historic", stops, store);
    const results = await Promise.allSettled([updateCuratedProgress(initial, 0, "visited", store), updateCuratedProgress(initial, 1, "skipped", store)]);
    expect(results.map(r => r.status)).toEqual(["fulfilled", "rejected"]);
    expect((await loadCuratedProgress("lubeck", "historic", store))?.statuses).toEqual(["visited", "pending", "pending", "pending", "pending"]);
  });
  it("does not claim persistence after storage failure", async () => {
    const store = memory();
    const initial = await openCuratedProgress("lubeck", "historic", stops, store);
    await expect(updateCuratedProgress(initial, 0, "visited", { ...store, setItem: async () => { throw Error("full"); } })).rejects.toThrow();
    expect(await loadCuratedProgress("lubeck", "historic", store)).toEqual(initial);
  });
});


describe("curated execution lifecycle", () => {
  it("preserves legacy omitted-state records as active without changing their shape", async () => {
    const legacy = createCuratedProgress("lubeck", "historic", stops, 100);
    expect(legacy).not.toHaveProperty("executionState");
    expect(parseCuratedProgress(legacy)).toEqual(legacy);
    expect(markCuratedStop(legacy, 0, "visited", 101).statuses[0]).toBe("visited");
    const store = memory();
    store.values.set("citywalk:native:v1:curated:lubeck:historic", JSON.stringify(legacy));
    expect(await openCuratedProgress("lubeck", "historic", stops, store)).toEqual(legacy);
    expect(store.values.get("citywalk:native:v1:curated:lubeck:historic")).toBe(JSON.stringify(legacy));
  });
  it("validates lifecycle state instead of accepting corrupted stored state", () => {
    const initial = createCuratedProgress("lubeck", "historic", stops, 100);
    expect(parseCuratedProgress({ ...initial, executionState: "suspended" })).toBeUndefined();
    for (const executionState of ["active", "paused", "ended"] as const) {
      expect(parseCuratedProgress({ ...initial, executionState })?.executionState).toBe(executionState);
    }
  });
  it("prevents progression while paused and resumes the same cursor without mutating history", () => {
    const initial = markCuratedStop(createCuratedProgress("lubeck", "historic", stops, 100), 0, "visited", 101);
    const paused = setCuratedExecutionState(initial, "paused", 102);
    expect(() => markCuratedStop(paused, 1, "visited", 103)).toThrow();
    const resumed = setCuratedExecutionState(paused, "active", 104);
    expect(curatedResumeIndex(resumed)).toBe(1);
    expect(resumed.stopSlugs).toEqual(stops);
    expect(resumed.statuses).toEqual(initial.statuses);
    expect(resumed.startedAt).toBe(100);
    expect(initial).not.toHaveProperty("executionState");
    expect(markCuratedStop(resumed, 1, "skipped", 105).statuses).toEqual(["visited", "skipped", "pending", "pending", "pending"]);
  });
  it("ends without discarding pending stops and requires explicit resume before further progression", () => {
    const ended = setCuratedExecutionState(createCuratedProgress("lubeck", "historic", stops, 100), "ended", 101);
    expect(() => markCuratedStop(ended, 0, "skipped", 102)).toThrow();
    expect(() => setCuratedExecutionState(ended, "paused", 102)).toThrow();
    const resumed = setCuratedExecutionState(ended, "active", 103);
    expect(curatedResumeIndex(resumed)).toBe(0);
    expect(resumed.statuses).toEqual(stops.map(() => "pending"));
    expect(resumed.startedAt).toBe(100);
  });
  it("never restarts a completed tour or resets its statuses", () => {
    let progress = createCuratedProgress("lubeck", "historic", ["one"], 100);
    progress = markCuratedStop(progress, 0, "visited", 101);
    const ended = setCuratedExecutionState(progress, "ended", 102);
    expect(() => setCuratedExecutionState(ended, "active", 103)).toThrow("Curated tour complete");
    expect(ended.statuses).toEqual(["visited"]);
    expect(curatedResumeIndex(ended)).toBe(-1);
  });
  it("does not move execution timestamps backwards or accept an invalid clock", () => {
    const initial = createCuratedProgress("lubeck", "historic", stops, 100);
    expect(setCuratedExecutionState(initial, "paused", 90).updatedAt).toBe(100);
    expect(() => setCuratedExecutionState(initial, "paused", Number.NaN)).toThrow();
  });
  it("restores paused and ended records without implicitly resuming or touching a custom walk", async () => {
    const store = memory();
    store.values.set("citywalk:native:v2:active:lubeck", "custom-walk");
    const initial = await openCuratedProgress("lubeck", "historic", stops, store);
    const paused = await changeCuratedExecutionState(initial, "paused", store);
    expect(await openCuratedProgress("lubeck", "historic", stops, store)).toEqual(paused);
    const ended = await changeCuratedExecutionState(paused, "ended", store);
    expect(await openCuratedProgress("lubeck", "historic", stops, store)).toEqual(ended);
    const resumed = await changeCuratedExecutionState(ended, "active", store);
    expect(resumed.executionState).toBe("active");
    expect(resumed.statuses).toEqual(initial.statuses);
    expect(store.values.get("citywalk:native:v2:active:lubeck")).toBe("custom-walk");
  });
  it("serializes lifecycle changes with progression and rejects stale screens", async () => {
    const store = memory(), initial = await openCuratedProgress("lubeck", "historic", stops, store);
    const results = await Promise.allSettled([
      changeCuratedExecutionState(initial, "paused", store),
      updateCuratedProgress(initial, 0, "visited", store),
    ]);
    expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
    const restored = await loadCuratedProgress("lubeck", "historic", store);
    expect(restored?.executionState).toBe("paused");
    expect(restored?.statuses).toEqual(stops.map(() => "pending"));
    await expect(changeCuratedExecutionState(initial, "ended", store)).rejects.toThrow("Curated progress changed");
  });
  it("surfaces lifecycle write/read failure and never claims an unsaved state", async () => {
    const store = memory(), initial = await openCuratedProgress("lubeck", "historic", stops, store);
    await expect(changeCuratedExecutionState(initial, "paused", { ...store, setItem: async () => { throw Error("full"); } })).rejects.toThrow("full");
    expect(await loadCuratedProgress("lubeck", "historic", store)).toEqual(initial);
    await expect(changeCuratedExecutionState(initial, "ended", { ...store, getItem: async () => { throw Error("unavailable"); } })).rejects.toThrow("unavailable");
  });
});


it("purges curated guest execution only through the existing committed-account-deletion cleanup", async () => {
  const curatedKey = `${accountLocalDataContract.curatedProgressPrefix}lubeck:historic`;
  const otherPreference = accountLocalDataContract.travelerStyleKey("another-user");
  const removed: string[] = [];
  await purgeDeletedAccountLocalData("deleted-user", {
    getAllKeys: async () => [curatedKey, otherPreference, "citywalk:locale:v1", "citywalk:public-content-cache:v1"],
    multiRemove: async keys => { removed.push(...keys); },
    removeItem: async key => { removed.push(key); },
  });
  expect(removed).toContain(curatedKey);
  expect(removed).not.toContain(otherPreference);
  expect(removed).not.toContain("citywalk:locale:v1");
  expect(removed).not.toContain("citywalk:public-content-cache:v1");
});


describe("curated storage integrity", () => {
  it.each(["", "not-json", "null", "{}"])("rejects corrupt stored progress %j instead of resetting it", async raw => {
    const store = memory();
    const storageKey = "citywalk:native:v1:curated:lubeck:historic";
    store.values.set(storageKey, raw);
    let writes = 0;
    const guardedStore = { ...store, setItem: async (key: string, value: string) => { writes += 1; await store.setItem(key, value); } };
    await expect(loadCuratedProgress("lubeck", "historic", guardedStore)).rejects.toThrow("Invalid curated progress");
    await expect(openCuratedProgress("lubeck", "historic", stops, guardedStore)).rejects.toThrow("Invalid curated progress");
    expect(writes).toBe(0);
    expect(store.values.get(storageKey)).toBe(raw);
  });
  it.each([
    { citySlug: "another-city" },
    { tourSlug: "another-tour" },
    { executionState: "corrupt" },
  ])("preserves stored bytes when identity or lifecycle validation fails: %j", async invalid => {
    const store = memory();
    const raw = JSON.stringify({ ...createCuratedProgress("lubeck", "historic", stops, 100), ...invalid });
    const storageKey = "citywalk:native:v1:curated:lubeck:historic";
    store.values.set(storageKey, raw);
    await expect(openCuratedProgress("lubeck", "historic", stops, store)).rejects.toThrow("Invalid curated progress");
    expect(store.values.get(storageKey)).toBe(raw);
  });
  it("returns undefined only for an absent record", async () => {
    expect(await loadCuratedProgress("lubeck", "historic", memory())).toBeUndefined();
  });
});
