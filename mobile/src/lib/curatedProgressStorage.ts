import { createCuratedProgress, markCuratedStop, parseCuratedProgress, type CuratedProgress } from "@citywalk/traveler-core";
import type { WalkStore } from "./walkStorage";
const key = (city: string, tour: string) => `citywalk:native:v1:curated:${city}:${tour}`;
const defaultStore = async (): Promise<WalkStore> => (await import("@react-native-async-storage/async-storage")).default;
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(work: () => Promise<T>) { const result = queue.then(work, work); queue = result.catch(() => undefined); return result; }
export async function loadCuratedProgress(city: string, tour: string, store?: WalkStore) {
  const raw = await (store ?? await defaultStore()).getItem(key(city, tour));
  let value: unknown; try { value = raw ? JSON.parse(raw) : undefined; } catch { return; }
  const progress = parseCuratedProgress(value);
  return progress?.citySlug === city && progress.tourSlug === tour ? progress : undefined;
}
export function openCuratedProgress(city: string, tour: string, stops: readonly string[], store?: WalkStore) {
  return mutate(async () => {
    const fresh = createCuratedProgress(city, tour, stops), target = store ?? await defaultStore();
    const previous = await loadCuratedProgress(city, tour, target);
    if (previous) {
      if (JSON.stringify(previous.stopSlugs) !== JSON.stringify(stops)) throw Error("Curated tour changed");
      return previous;
    }
    await target.setItem(key(city, tour), JSON.stringify(fresh)); return fresh;
  });
}
export function updateCuratedProgress(expected: CuratedProgress, index: number, status: "visited" | "skipped", store?: WalkStore) {
  return mutate(async () => {
    const target = store ?? await defaultStore();
    const current = await loadCuratedProgress(expected.citySlug, expected.tourSlug, target);
    if (!current || JSON.stringify(current) !== JSON.stringify(expected)) throw Error("Curated progress changed");
    const next = markCuratedStop(current, index, status);
    await target.setItem(key(next.citySlug, next.tourSlug), JSON.stringify(next)); return next;
  });
}
