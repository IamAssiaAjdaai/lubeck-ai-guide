import type { WalkSettings } from "./planner";
export type SavedWalk = {
  id: string;
  citySlug: string;
  cityName: string;
  placeSlugs: string[];
  minutes: number;
  distance: number;
  savedAt: number;
  settings?: WalkSettings;
};
const key = "citywalk:v2:saved";
const changeEvent = "citywalk:saved-walks-changed";
export function getSavedWalksSnapshot(): string {
  try { return localStorage.getItem(key) ?? "[]"; } catch { return "[]"; }
}
export function subscribeSavedWalks(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, notify);
  };
}
export function readSavedWalks(serialized = getSavedWalksSnapshot()): SavedWalk[] {
  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value)
      ? value.filter(
          (item): item is SavedWalk =>
            item &&
            typeof item.id === "string" &&
            typeof item.citySlug === "string" &&
            /^[a-z0-9-]+$/.test(item.citySlug) &&
            typeof item.cityName === "string" &&
            Array.isArray(item.placeSlugs) &&
            item.placeSlugs.every(
              (slug: unknown) => typeof slug === "string",
            ) &&
            Number.isFinite(item.minutes) &&
            Number.isFinite(item.distance) &&
            Number.isFinite(item.savedAt),
        )
      : [];
  } catch {
    return [];
  }
}
export function saveWalk(walk: SavedWalk) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        [walk, ...readSavedWalks().filter((item) => item.id !== walk.id || item.citySlug !== walk.citySlug)].slice(
          0,
          50,
        ),
      ),
    );
    window.dispatchEvent(new Event(changeEvent));
    return true;
  } catch {
    return false;
  }
}

export function removeSavedWalk(id: string, citySlug: string): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(readSavedWalks().filter(
      (walk) => walk.id !== id || walk.citySlug !== citySlug,
    )));
    window.dispatchEvent(new Event(changeEvent));
    return true;
  } catch { return false; }
}
