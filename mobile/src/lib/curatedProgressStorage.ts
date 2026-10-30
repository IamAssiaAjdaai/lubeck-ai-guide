import { createCuratedProgress, markCuratedStop, parseCuratedProgress, setCuratedExecutionState, type CuratedExecutionState, type CuratedProgress } from "@citywalk/traveler-core";
import type { WalkStore } from "./walkStorage";
export const CURATED_PROGRESS_STORAGE_PREFIX = "citywalk:native:v1:curated:";
const key = (city: string, tour: string) => `${CURATED_PROGRESS_STORAGE_PREFIX}${city}:${tour}`;
const defaultStore = async (): Promise<WalkStore> => (await import("@react-native-async-storage/async-storage")).default;
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(work: () => Promise<T>) { const result = queue.then(work, work); queue = result.catch(() => undefined); return result; }
export async function loadCuratedProgress(city: string, tour: string, store?: WalkStore) {
  const raw = await (store ?? await defaultStore()).getItem(key(city, tour));
  if (raw === null) return undefined;
  let value: unknown; try { value = JSON.parse(raw); } catch { throw Error("Invalid curated progress"); }
  const progress = parseCuratedProgress(value);
  if (!progress || progress.citySlug !== city || progress.tourSlug !== tour) throw Error("Invalid curated progress");
  return progress;
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
    if (!current || JSON.stringify(current) !== JSON.stringify(parseCuratedProgress(expected))) throw Error("Curated progress changed");
    const next = markCuratedStop(current, index, status);
    await target.setItem(key(next.citySlug, next.tourSlug), JSON.stringify(next)); return next;
  });
}

/** Compare against the reviewed record under the same queue as stop progression. */
export function changeCuratedExecutionState(expected: CuratedProgress, state: CuratedExecutionState, store?: WalkStore) {
  return mutate(async () => {
    const target = store ?? await defaultStore();
    const current = await loadCuratedProgress(expected.citySlug, expected.tourSlug, target);
    if (!current || JSON.stringify(current) !== JSON.stringify(parseCuratedProgress(expected))) throw Error("Curated progress changed");
    const next = setCuratedExecutionState(current, state);
    await target.setItem(key(next.citySlug, next.tourSlug), JSON.stringify(next)); return next;
  });
}
