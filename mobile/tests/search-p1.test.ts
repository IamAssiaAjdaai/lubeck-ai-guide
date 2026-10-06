import { describe, expect, it } from "vitest";

import exploreSource from "../src/app/city/[citySlug]/explore.tsx?raw";
import searchSource from "../src/app/city/[citySlug]/search.tsx?raw";
import {
  clearRecentSearches,
  loadRecentSearches,
  MAX_RECENT_SEARCHES,
  recordRecentSearch,
} from "../src/lib/searchHistory";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    async getItem(key: string) {
      return values.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("Search P1 flow", () => {
  it("opens a dedicated Search screen from Explore and keeps root tabs off Search", () => {
    expect(exploreSource).toContain('pathname: "/city/[citySlug]/search"');
    expect(searchSource).toContain("<Screen navigation={false}");
    expect(searchSource).toContain("autoFocus");
    expect(searchSource).toContain('pathname: "/city/[citySlug]/place/[placeSlug]"');
  });

  it("renders recent and suggestion/result states from the city place payload", () => {
    expect(searchSource).toContain("loadRecentSearches");
    expect(searchSource).toContain("recordRecentSearch");
    expect(searchSource).toContain("copy.recent");
    expect(searchSource).toContain("copy.suggestions");
    expect(searchSource).toContain("copy.results");
    expect(searchSource).toContain("nativePlaceName");
  });

  it("deduplicates and caps recent places per city", async () => {
    const store = memoryStore();
    for (const slug of ["one", "two", "three", "four", "five", "six", "three"]) {
      await recordRecentSearch("lubeck", slug, store);
    }
    expect(await loadRecentSearches("lubeck", store)).toEqual([
      "three",
      "six",
      "five",
      "four",
      "two",
    ]);
    expect((await loadRecentSearches("lubeck", store)).length).toBe(
      MAX_RECENT_SEARCHES,
    );
    await clearRecentSearches("lubeck", store);
    expect(await loadRecentSearches("lubeck", store)).toEqual([]);
  });
});
