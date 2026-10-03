import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TRAVELER_STYLE,
  travelerStyleStorageKey,
  loadTravelerStyle,
  saveTravelerStyle,
} from "../src/lib/travelerStyle";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
  };
}

describe("native traveler style", () => {
  it("uses stable defaults for guests and accounts without saved preferences", async () => {
    const store = memoryStore();
    await expect(loadTravelerStyle(undefined, store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
    await expect(loadTravelerStyle("user-1", store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
  });

  it("validates and round-trips defaults for the active CITYWALK user", async () => {
    const store = memoryStore();
    const style = {
      interests: ["food", "hidden-gems"] as const,
      walking: "easy" as const,
      minutes: 90 as const,
    };
    const canonical = {
      interests: ["hidden-gems", "food"] as const,
      walking: "easy" as const,
      minutes: 90 as const,
    };
    await expect(saveTravelerStyle("user-1", style, store)).resolves.toEqual(canonical);
    expect(store.setItem).toHaveBeenCalledWith(travelerStyleStorageKey("user-1"), expect.any(String));
    await expect(loadTravelerStyle("user-1", store)).resolves.toEqual(canonical);
  });

  it("derives a distinct storage namespace for every CITYWALK account", () => {
    expect(travelerStyleStorageKey("user-1")).not.toBe(travelerStyleStorageKey("user-2"));
    expect(travelerStyleStorageKey("user-1")).toContain("user-1");
  });

  it("never leaks one account's travel style into another account on the same device", async () => {
    const store = memoryStore();
    await saveTravelerStyle("user-1", {
      interests: ["nature"],
      walking: "long",
      minutes: 180,
    }, store);

    await expect(loadTravelerStyle("user-2", store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
    await expect(loadTravelerStyle(undefined, store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
  });

  it("refuses to save account preferences without an authenticated owner", async () => {
    const store = memoryStore();
    await expect(
      saveTravelerStyle(undefined, DEFAULT_TRAVELER_STYLE, store),
    ).rejects.toThrow("Account required");
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it("fails closed to defaults for malformed stored values", async () => {
    const key = travelerStyleStorageKey("user-1");
    const store = memoryStore();
    await store.setItem(
      key,
      JSON.stringify({
        version: 1,
        interests: ["unknown"],
        walking: "fast",
        minutes: 999,
      }),
    );
    await expect(loadTravelerStyle("user-1", store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
  });
});
