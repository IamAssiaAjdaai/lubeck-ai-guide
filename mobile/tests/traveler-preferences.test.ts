import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRAVELER_PREFERENCES,
  TRAVELER_PREFERENCES_STORAGE_KEY,
  loadTravelerPreferences,
  parseTravelerPreferences,
  saveTravelerPreferences,
} from "../src/lib/travelerPreferences";

function memoryStore(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: async (key: string) =>
      key === TRAVELER_PREFERENCES_STORAGE_KEY ? value : null,
    setItem: async (key: string, next: string) => {
      if (key === TRAVELER_PREFERENCES_STORAGE_KEY) value = next;
    },
    read: () => value,
  };
}

describe("traveler preferences", () => {
  it("keeps the established CITYWALK planning defaults when no profile preference exists", async () => {
    expect(await loadTravelerPreferences("user-1", memoryStore())).toEqual(
      DEFAULT_TRAVELER_PREFERENCES,
    );
  });

  it("validates interests, walking style and duration before saving", async () => {
    const store = memoryStore();
    const saved = await saveTravelerPreferences(
      "user-1",
      {
        interests: ["food", "history", "food"],
        walking: "easy",
        typicalMinutes: 180,
      },
      store,
    );
    expect(saved).toEqual({
      interests: ["food", "history"],
      walking: "easy",
      typicalMinutes: 180,
    });
    expect(await loadTravelerPreferences("user-1", store)).toEqual(saved);
  });

  it("never leaks one signed-in user's preferences into another account", async () => {
    const store = memoryStore();
    await saveTravelerPreferences(
      "user-1",
      { interests: ["nature"], walking: "long", typicalMinutes: 180 },
      store,
    );
    expect(await loadTravelerPreferences("user-2", store)).toEqual(
      DEFAULT_TRAVELER_PREFERENCES,
    );
  });

  it("rejects malformed stored values without inventing preferences", () => {
    expect(
      parseTravelerPreferences({
        interests: ["history", "not-a-real-interest"],
        walking: "teleport",
        typicalMinutes: 999,
      }),
    ).toEqual({
      interests: ["history"],
      walking: "balanced",
      typicalMinutes: 120,
    });
  });
});
