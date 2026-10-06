export const SEARCH_HISTORY_STORAGE_KEY = "citywalk:search-history:v1";
export const MAX_RECENT_SEARCHES = 5;

type SearchHistoryStore = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

type SearchHistory = Record<string, string[]>;

export async function loadRecentSearches(
  citySlug: string,
  store?: SearchHistoryStore,
): Promise<readonly string[]> {
  if (!isSlug(citySlug)) return [];
  const target = store ?? await getDefaultStore();
  try {
    const raw = await target.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isSearchHistory(parsed)) return [];
    return parsed[citySlug]?.slice(0, MAX_RECENT_SEARCHES) ?? [];
  } catch {
    return [];
  }
}

export async function recordRecentSearch(
  citySlug: string,
  placeSlug: string,
  store?: SearchHistoryStore,
): Promise<void> {
  if (!isSlug(citySlug) || !isSlug(placeSlug)) return;
  const target = store ?? await getDefaultStore();
  let history: SearchHistory = {};
  try {
    const raw = await target.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSearchHistory(parsed)) history = parsed;
    }
  } catch {
    history = {};
  }
  const existing = history[citySlug] ?? [];
  const next = [placeSlug, ...existing.filter((slug) => slug !== placeSlug)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  await target.setItem(
    SEARCH_HISTORY_STORAGE_KEY,
    JSON.stringify({ ...history, [citySlug]: next }),
  );
}

export async function clearRecentSearches(
  citySlug: string,
  store?: SearchHistoryStore,
): Promise<void> {
  if (!isSlug(citySlug)) return;
  const target = store ?? await getDefaultStore();
  let history: SearchHistory = {};
  try {
    const raw = await target.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSearchHistory(parsed)) history = parsed;
    }
  } catch {
    history = {};
  }
  const { [citySlug]: _removed, ...rest } = history;
  await target.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(rest));
}

async function getDefaultStore(): Promise<SearchHistoryStore> {
  return (await import("@react-native-async-storage/async-storage")).default;
}

function isSearchHistory(value: unknown): value is SearchHistory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([citySlug, entries]) =>
      isSlug(citySlug) &&
      Array.isArray(entries) &&
      entries.every((entry) => typeof entry === "string" && isSlug(entry)),
  );
}

function isSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
