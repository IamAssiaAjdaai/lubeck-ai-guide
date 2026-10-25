import { describe, expect, it } from "vitest";
import { createCuratedProgress, curatedResumeIndex, markCuratedStop, parseCuratedProgress } from "@citywalk/traveler-core";
import { loadCuratedProgress, openCuratedProgress, updateCuratedProgress } from "../src/lib/curatedProgressStorage";
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
