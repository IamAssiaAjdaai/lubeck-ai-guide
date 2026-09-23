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
export function readSavedWalks(): SavedWalk[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
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
        [walk, ...readSavedWalks().filter((item) => item.id !== walk.id)].slice(
          0,
          50,
        ),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
