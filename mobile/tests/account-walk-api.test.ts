import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
const mocks = vi.hoisted(() => ({ data: new Map<string, string>(), session: vi.fn(), fetch: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => mocks.data.get(key) ?? null,
  setItem: async (key: string, value: string) => { mocks.data.set(key, value); },
} }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { getSession: mocks.session } }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { fetchAuthenticated: mocks.fetch } }));
import { loadCurrentWalk, persistCurrentWalk, loadSavedWalks } from "../src/lib/walkStorage";
import { accountWalkState, loadAccountWalkForOpen, removeAccountWalk, saveAccountWalk, subscribeAccountWalks } from "../src/lib/accountWalks";
const point = { lat: 53.86, lng: 10.68 };
const journey: WalkJourney = { id: "current", citySlug: "lubeck", remaining: ["holstentor"], visited: [], position: point, historyDistance: 0, startedAt: 1, settings: { minutes: 60, walking: "balanced", interests: ["history"], start: point } };
const places = [{ slug: "holstentor", category: "see", coordinates: point, durationMinutes: 10, requestedLocale: "en", resolvedLocale: "en", didFallback: false, media: [], content: { name: "Holstentor", shortDescription: "Gate" } }] as PublicPlaceCard[];
const record = { id: "account-record", route: { citySlug: "lubeck", stopSlugs: ["holstentor"], settings: journey.settings }, createdAt: "2026-09-27T00:00:00Z", updatedAt: "2026-09-27T00:00:00Z" };
beforeEach(async () => {
  vi.resetAllMocks(); mocks.data.clear(); mocks.session.mockResolvedValue({ data: { user: { id: "owner" } } });
  await persistCurrentWalk(journey, "preview");
  mocks.data.set("citywalk:native:v2:saved", JSON.stringify([{ ...journey, id: "historical" }]));
  mocks.data.set("citywalk:native:v2:places", "[]");
});
afterEach(() => vi.clearAllMocks());
describe("native account API boundaries", () => {
  it("guest or changed account cannot call persistence or manufacture local success", async () => {
    const before = new Map(mocks.data);
    for (const data of [null, { user: { id: "different-owner" } }]) {
      mocks.session.mockResolvedValueOnce({ data });
      await expect(saveAccountWalk(journey, places, true, "owner")).rejects.toThrow("account-required");
    }
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.data).toEqual(before);
  });
  it.each([401, 403, 503])("HTTP %s leaves current, historical and favorite data intact and permits retry", async status => {
    const before = new Map(mocks.data), notified = vi.fn();
    const stop = subscribeAccountWalks(notified);
    try {
      mocks.fetch.mockResolvedValueOnce(Response.json({ error: "Unavailable" }, { status }));
      await expect(saveAccountWalk(journey, places, true, "owner")).rejects.toThrow();
      expect(mocks.data).toEqual(before); expect(notified).not.toHaveBeenCalled();
      expect(accountWalkState(journey, [], "owner").status).toBe("unsaved");
      mocks.fetch.mockResolvedValueOnce(Response.json({ walk: record }));
      await saveAccountWalk(journey, places, true, "owner");
      expect(notified).toHaveBeenCalledOnce();
      expect((await loadCurrentWalk("lubeck"))?.journey).toMatchObject({ id: "current", accountSavedWalkId: record.id, accountSavedUserId: "owner" });
      expect(await loadSavedWalks()).toEqual([{ ...journey, id: "historical" }]);
      expect(mocks.data.get("citywalk:native:v2:places")).toBe(before.get("citywalk:native:v2:places"));
    } finally { stop(); }
  });
  it("network failure does not emit a mutation or change local records", async () => {
    const before = new Map(mocks.data), notified = vi.fn(), stop = subscribeAccountWalks(notified);
    try {
      mocks.fetch.mockRejectedValueOnce(new Error("Network unavailable"));
      await expect(saveAccountWalk(journey, places, true, "owner")).rejects.toThrow();
      expect(mocks.data).toEqual(before); expect(notified).not.toHaveBeenCalled();
    } finally { stop(); }
  });
  it("reopen, update and remove retain the server record identity and expected owner header", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ walks: [record] }));
    const opened = await loadAccountWalkForOpen(record.id, "lubeck");
    expect(opened).toMatchObject({ accountSavedWalkId: record.id, accountSavedUserId: "owner" });
    await persistCurrentWalk({ ...opened, id: "reopened", finish: point }, "preview");
    mocks.fetch.mockResolvedValueOnce(Response.json({ walks: [record] })).mockResolvedValueOnce(Response.json({ walk: { ...record, route: { ...record.route, finish: point } } }));
    await saveAccountWalk({ ...opened, id: "reopened" }, places, true, "owner");
    const post = mocks.fetch.mock.calls.find(([, init]) => init.method === "POST")![1];
    expect(post.headers["X-Citywalk-Account"]).toBe("owner");
    expect(JSON.parse(post.body)).toMatchObject({ id: record.id, route: { finish: point } });
    mocks.fetch.mockResolvedValueOnce(Response.json({ removed: true }));
    await removeAccountWalk("owner", record.id);
    const last = mocks.fetch.mock.lastCall![1];
    expect(last.method).toBe("DELETE"); expect(JSON.parse(last.body)).toEqual({ id: record.id });
    expect((await loadSavedWalks())[0].id).toBe("historical");
  });
});
