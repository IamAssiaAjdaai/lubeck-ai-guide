import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TRAVELER_STYLE,
  TRAVELER_STYLE_STORAGE_KEY,
  loadTravelerStyle,
  saveTravelerStyle,
} from "../src/lib/travelerStyle";

describe("native traveler style", () => {
  it("uses stable launch defaults when no preference exists", async () => {
    const store = { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn() };
    await expect(loadTravelerStyle(store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
  });

  it("validates and round-trips traveler defaults", async () => {
    let raw: string | null = null;
    const store = {
      getItem: vi.fn(async () => raw),
      setItem: vi.fn(async (_key: string, value: string) => { raw = value; }),
    };
    const style = { interests: ["food", "hidden-gems"] as const, walking: "easy" as const, minutes: 90 as const };
    const canonical = { interests: ["hidden-gems", "food"] as const, walking: "easy" as const, minutes: 90 as const };
    await expect(saveTravelerStyle(style, store)).resolves.toEqual(canonical);
    expect(store.setItem).toHaveBeenCalledWith(TRAVELER_STYLE_STORAGE_KEY, expect.any(String));
    await expect(loadTravelerStyle(store)).resolves.toEqual(canonical);
  });

  it("fails closed to defaults for malformed stored values", async () => {
    const store = {
      getItem: vi.fn().mockResolvedValue(JSON.stringify({ version: 1, interests: ["unknown"], walking: "fast", minutes: 999 })),
      setItem: vi.fn(),
    };
    await expect(loadTravelerStyle(store)).resolves.toEqual(DEFAULT_TRAVELER_STYLE);
  });
});
