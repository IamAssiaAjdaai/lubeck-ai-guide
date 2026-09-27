import { describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Linking: { openURL: vi.fn() }, Platform: { OS: "ios" } }));
import { createStoreReview, publicStoreUrl, REVIEW_COOLDOWN_MS } from "../src/lib/storeReview";
const walk = { id: "completed", startedAt: 10, finishedAt: 20, visited: ["place", "second-place"] };
function setup(available = true, url?: string) {
  const data = new Map<string, string>();
  const requestReview = vi.fn(async () => undefined), openUrl = vi.fn(async () => undefined);
  const native = { isAvailableAsync: vi.fn(async () => available), requestReview };
  const now = vi.fn(() => 1000);
  const store = { getItem: vi.fn(async (key: string) => data.get(key) ?? null), setItem: vi.fn(async (key: string, value: string) => { data.set(key, value); }) };
  const deps = { store: async () => store, native: vi.fn(async () => native), fallbackUrl: () => url, openUrl, now };
  return { data, native, store, deps, now, requestReview, openUrl, review: createStoreReview(deps) };
}
describe("public native review, separate from private trip feedback", () => {
  it("requests native review without opening a URL, even when configured", async () => {
    const s = setup(true, "https://configured.example");
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "requested" });
    expect(s.requestReview).toHaveBeenCalledTimes(1);
    expect(s.openUrl).not.toHaveBeenCalled();
    expect([...s.data.values()][0]).not.toContain("rating");
  });
  it("does not request before finishing or when no place was visited", async () => {
    const s = setup();
    expect(await s.review.afterCompletion({ ...walk, finishedAt: undefined })).toEqual({ status: "ineligible" });
    expect(await s.review.afterCompletion({ ...walk, visited: [] })).toEqual({ status: "ineligible" });
    expect(s.requestReview).not.toHaveBeenCalled();
  });
  it("deduplicates concurrent completion calls and persists attempts across reloads", async () => {
    const s = setup();
    await Promise.all([s.review.afterCompletion(walk), s.review.afterCompletion(walk)]);
    await createStoreReview(s.deps).afterCompletion(walk);
    expect(s.requestReview).toHaveBeenCalledTimes(1);
  });
  it("applies a device cooldown without looking at a private rating", async () => {
    const s = setup(); await s.review.afterCompletion(walk);
    expect(await s.review.afterCompletion({ ...walk, id: "second" })).toEqual({ status: "ineligible" });
    s.now.mockReturnValue(1000 + REVIEW_COOLDOWN_MS);
    expect(await s.review.afterCompletion({ ...walk, id: "second" })).toEqual({ status: "requested" });
  });
  it("remembers older journeys after subsequent eligible requests", async () => {
    const s = setup(); await s.review.afterCompletion(walk);
    s.now.mockReturnValue(1000 + REVIEW_COOLDOWN_MS);
    await s.review.afterCompletion({ ...walk, id: "second" });
    s.now.mockReturnValue(1000 + REVIEW_COOLDOWN_MS * 2);
    expect(await createStoreReview(s.deps).afterCompletion(walk)).toEqual({ status: "ineligible" });
    expect(s.requestReview).toHaveBeenCalledTimes(2);
  });
  it("requires two distinct visited stops, not duplicate IDs or skipped/remaining stops", async () => {
    const s = setup();
    for (const visited of [[], ["one"], ["one", "one"], ["one", ""]]) {
      expect(await s.review.afterCompletion({ ...walk, visited })).toEqual({ status: "ineligible" });
    }
    expect(s.requestReview).not.toHaveBeenCalled();
  });
  it("re-enables after three additional UNIQUE completed walks even before 30 days", async () => {
    const s = setup(); await s.review.afterCompletion(walk);
    for (const id of ["second", "second", "third", "third"]) {
      expect(await s.review.afterCompletion({ ...walk, id })).toEqual({ status: "ineligible" });
    }
    expect(await createStoreReview(s.deps).afterCompletion({ ...walk, id: "fourth" })).toEqual({ status: "requested" });
    expect(s.requestReview).toHaveBeenCalledTimes(2);
  });
  it("counts completed walks separately but still requires two visited stops for a request", async () => {
    const s = setup(); await s.review.afterCompletion(walk);
    for (const id of ["second", "third", "fourth"]) await s.review.afterCompletion({ ...walk, id, visited: [] });
    expect(s.requestReview).toHaveBeenCalledTimes(1);
    expect(await s.review.afterCompletion({ ...walk, id: "fifth" })).toEqual({ status: "requested" });
  });
  it("keeps application cooldown policy configurable", async () => {
    const s = setup(); const review = createStoreReview({ ...s.deps, policy: { additionalWalks: 1, cooldownMs: REVIEW_COOLDOWN_MS } });
    await review.afterCompletion(walk);
    expect(await review.afterCompletion({ ...walk, id: "second" })).toEqual({ status: "requested" });
  });
  it("fails closed on corrupted history", async () => {
    const s = setup(); s.data.set("citywalk:native:public-review:v1", "not-json");
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "unavailable" });
    expect(s.requestReview).not.toHaveBeenCalled();
  });
  it("retains earlier local attempt history when upgrading the policy", async () => {
    const s = setup(); s.data.set("citywalk:native:public-review:v1", JSON.stringify({ journeyId: walk.id, requestedAt: 1000 }));
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "ineligible" });
    expect(await s.review.afterCompletion({ ...walk, id: "second" })).toEqual({ status: "ineligible" });
  });
  it("records completion but cancels a request when leaving during the settling period", async () => {
    const s = setup(); let active = true;
    const review = createStoreReview({ ...s.deps, settle: async () => { active = false; } });
    await review.afterCompletion(walk, () => active);
    expect(s.requestReview).not.toHaveBeenCalled();
    expect(JSON.parse([...s.data.values()][0]).completedIds).toEqual([walk.id]);
  });
  it("silently accepts an OS decision not to show a dialog without URL fallback", async () => {
    const s = setup(true, "https://configured.example");
    await s.review.afterCompletion(walk);
    expect(s.openUrl).not.toHaveBeenCalled();
  });
  it("silently handles native review errors without redirecting", async () => {
    const s = setup(true, "https://configured.example");
    s.requestReview.mockRejectedValueOnce(new Error("native unavailable"));
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "unavailable" });
    expect(s.openUrl).not.toHaveBeenCalled();
  });
  it("offers only a configured fallback when native review is unavailable", async () => {
    const s = setup(false, "https://configured.example");
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "unavailable" });
    expect(s.review.configuredUrl()).toBe("https://configured.example");
    expect(s.openUrl).not.toHaveBeenCalled();
    await s.review.openFallback();
    expect(s.openUrl).toHaveBeenCalledWith("https://configured.example");
  });
  it("hides the fallback when no public listing is configured", async () => {
    const s = setup(false);
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "unavailable" });
    await s.review.openFallback();
    expect(s.openUrl).not.toHaveBeenCalled();
  });
  it("an intentional link opens only its configured URL even if native review becomes available", async () => {
    const s = setup(false, "https://configured.example");
    await s.review.afterCompletion(walk);
    s.native.isAvailableAsync.mockResolvedValue(true);
    await s.review.openFallback();
    expect(s.requestReview).not.toHaveBeenCalled(); expect(s.openUrl).toHaveBeenCalledWith("https://configured.example");
  });
  it("does not prompt after leaving the Finish screen", async () => {
    const s = setup(); await s.review.afterCompletion(walk, () => false);
    expect(s.requestReview).not.toHaveBeenCalled();
  });
  it("does not prompt if attempt history cannot be saved", async () => {
    const s = setup(); s.store.setItem.mockRejectedValueOnce(new Error("storage blocked"));
    expect(await s.review.afterCompletion(walk)).toEqual({ status: "unavailable" });
    expect(s.requestReview).not.toHaveBeenCalled();
  });
});
describe("only explicitly configured public store URLs", () => {
  it("has no guessed default", () => {
    expect(publicStoreUrl("ios")).toBeUndefined(); expect(publicStoreUrl("android")).toBeUndefined();
  });
  it("accepts an explicitly configured confirmed listing (fixture ID only)", () => {
    expect(publicStoreUrl("ios", "https://apps.apple.com/app/id123456?action=write-review")).toContain("id123456");
    expect(publicStoreUrl("android", undefined, "https://play.google.com/store/apps/details?id=com.citywalk.app")).toContain("com.citywalk.app");
  });
  it.each([
    ["ios", "https://apps.apple.com.evil.example/app/id123"],
    ["ios", "https://apps.apple.com/app/no-confirmed-id"],
    ["ios", "http://apps.apple.com/app/id123"],
    ["android", "https://play.google.com/store/apps/details?id=com.citywalk.app.dev"],
    ["android", "javascript:alert(1)"],
  ])("rejects an unsafe or wrong listing for %s", (platform, url) => {
    expect(publicStoreUrl(platform, url, url)).toBeUndefined();
  });
});
