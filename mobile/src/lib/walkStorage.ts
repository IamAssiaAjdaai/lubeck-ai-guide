import {
  isWalkJourney,
  type WalkJourney,
} from "@citywalk/traveler-core/walkJourney";
import { isEligibleTourPlace } from "@citywalk/traveler-core";
import type { PublicPlaceCard } from "./api/contracts";

export type WalkStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
export type SavedPlace = { citySlug: string; slug: string; name: string };
const savedKey = "citywalk:native:v2:saved";
const placesKey = "citywalk:native:v2:places";
const activeKey = (city: string) => `citywalk:native:v2:active:${city}`;
async function defaultStore(): Promise<WalkStore> {
  return (await import("@react-native-async-storage/async-storage")).default;
}
async function read(key: string, store: WalkStore): Promise<unknown> {
  const value = await store.getItem(key);
  try {
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}
// Serialize read-modify-write operations so rapid save/remove taps cannot lose updates.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}
export type CurrentWalk = { journey: WalkJourney; phase: "preview" | "active" };
const listeners = new Map<string, Set<(current: CurrentWalk | undefined) => void>>();
export function subscribeCurrentWalk(city: string, listener: (current: CurrentWalk | undefined) => void) {
  const group = listeners.get(city) ?? new Set();
  listeners.set(city, group); group.add(listener);
  return () => { group.delete(listener); if (!group.size) listeners.delete(city); };
}
function notifyCurrentWalk(city: string, current: CurrentWalk | undefined) { listeners.get(city)?.forEach(listener => listener(current)); }
function uniqueJourney(journey: WalkJourney): WalkJourney {
  const visited = [...new Set(journey.visited)];
  return { ...journey, visited, remaining: [...new Set(journey.remaining)].filter(slug => !visited.includes(slug)) };
}
export async function loadCurrentWalk(city: string, store?: WalkStore): Promise<CurrentWalk | undefined> {
  const value = await read(activeKey(city), store ?? (await defaultStore()));
  if (!isWalkJourney(value) || value.citySlug !== city || value.finishedAt) return;
  const { nativePhase, ...journey } = value as WalkJourney & { nativePhase?: string };
  return { journey: uniqueJourney(journey), phase: nativePhase === "preview" ? "preview" : "active" };
}
export async function loadActiveWalk(city: string, store?: WalkStore) {
  const current = await loadCurrentWalk(city, store);
  return current?.phase === "active" ? current.journey : undefined;
}
async function writeCurrent(current: CurrentWalk, target: WalkStore) {
  if (!isWalkJourney(current.journey)) throw new Error("Invalid journey");
  const journey = uniqueJourney(current.journey);
  await target.setItem(activeKey(journey.citySlug), JSON.stringify(
    current.phase === "preview" ? { ...journey, nativePhase: "preview" } : journey,
  ));
  notifyCurrentWalk(journey.citySlug, journey.finishedAt ? undefined : { ...current, journey });
}
export async function persistCurrentWalk(journey: WalkJourney, phase: CurrentWalk["phase"], store?: WalkStore) {
  return mutate(async () => writeCurrent({ journey, phase }, store ?? await defaultStore()));
}
export async function persistActiveWalk(journey: WalkJourney, store?: WalkStore) {
  return persistCurrentWalk(journey, "active", store);
}

function visitStopStatus(slugs: readonly string[], places: readonly PublicPlaceCard[], contentReady: boolean) {
  if (!contentReady) return "loading";
  const stops = slugs.map(slug => places.find(place => place.slug === slug));
  if (stops.some(place => !place)) return "unresolved";
  if (!stops.length || stops.some(place => !isEligibleTourPlace(place!))) return "empty";
  return "ready";
}
// Preview eligibility is separate from completed/return-only active journeys.
export function walkStartStatus(journey: WalkJourney, places: readonly PublicPlaceCard[], contentReady = true) {
  return visitStopStatus(journey.remaining, places, contentReady);
}
export function walkSaveStatus(journey: WalkJourney, places: readonly PublicPlaceCard[], contentReady = true) {
  return visitStopStatus([...new Set([...journey.visited, ...journey.remaining])], places, contentReady);
}

export async function startCurrentWalk(city: string, id: string, places: readonly PublicPlaceCard[], contentReady = true, store?: WalkStore) {
  return mutate(async () => {
    const target = store ?? await defaultStore();
    const current = await loadCurrentWalk(city, target);
    if (!current || current.journey.id !== id) throw new Error("walk-changed");
    // Idempotent: repeated taps never reset a running timer or write another start.
    if (current.phase === "active") return current;
    const status = walkStartStatus(current.journey, places, contentReady);
    if (status !== "ready") throw new Error(`walk-start-${status}`);
    const next: CurrentWalk = { phase: "active", journey: { ...current.journey, startedAt: Date.now() } };
    await writeCurrent(next, target);
    return next;
  });
}

// Confirmation applies to the exact session reviewed, not a newer edit from
// another screen. Only this city's current slot is cleared; saved data survives.
export async function clearCurrentWalk(city: string, expected: CurrentWalk | undefined, store?: WalkStore) {
  return mutate(async () => {
    const target = store ?? await defaultStore();
    const current = await loadCurrentWalk(city, target);
    if (current?.phase !== expected?.phase || JSON.stringify(current?.journey) !== JSON.stringify(expected?.journey)) throw new Error("walk-changed");
    await target.setItem(activeKey(city), "null");
    notifyCurrentWalk(city, undefined);
  });
}
// Read and transform under the same queue so two screens cannot add duplicates
// or lose each other's membership edits. The caller checks any route constraints.
export async function changeCurrentWalk(
  city: string,
  change: (current: CurrentWalk | undefined) => CurrentWalk,
  store?: WalkStore,
): Promise<CurrentWalk> {
  return mutate(async () => {
    const target = store ?? await defaultStore();
    const next = change(await loadCurrentWalk(city, target));
    if (next.journey.citySlug !== city) throw new Error("Wrong walk city");
    const normalized = { ...next, journey: uniqueJourney(next.journey) };
    await writeCurrent(normalized, target);
    return normalized;
  });
}
export async function loadSavedWalks(
  store?: WalkStore,
): Promise<WalkJourney[]> {
  const value = await read(savedKey, store ?? (await defaultStore()));
  return Array.isArray(value) ? value.filter(isWalkJourney) : [];
}
export async function saveNativeWalk(journey: WalkJourney, places: readonly PublicPlaceCard[], contentReady = true, store?: WalkStore) {
  if (!isWalkJourney(journey)) throw new Error("Invalid journey");
  return mutate(async () => {
    const target = store ?? (await defaultStore());
    const suppliedStatus = walkSaveStatus(journey, places, contentReady);
    if (suppliedStatus !== "ready") throw new Error(`walk-save-${suppliedStatus}`);
    // Read the persisted session under the same queue as membership/removal.
    // Include finished records: loadCurrentWalk intentionally hides those.
    const current = await read(activeKey(journey.citySlug), target);
    if (!isWalkJourney(current) || current.citySlug !== journey.citySlug || current.id !== journey.id) throw new Error("walk-changed");
    const status = walkSaveStatus(current, places, contentReady);
    if (status !== "ready") throw new Error(`walk-save-${status}`);
    const { nativePhase: _phase, ...savedJourney } = current as WalkJourney & { nativePhase?: string };
    const existing = await loadSavedWalks(target);
    await target.setItem(
      savedKey,
      JSON.stringify([
        uniqueJourney(savedJourney),
        ...existing.filter(
          (w) => w.id !== journey.id || w.citySlug !== journey.citySlug,
        ),
      ]),
    );
  });
}
export async function removeNativeWalk(
  city: string,
  id: string,
  store?: WalkStore,
) {
  return mutate(async () => {
    const target = store ?? (await defaultStore());
    const existing = await loadSavedWalks(target);
    await target.setItem(
      savedKey,
      JSON.stringify(
        existing.filter((w) => w.id !== id || w.citySlug !== city),
      ),
    );
  });
}
export async function loadSavedPlaces(
  store?: WalkStore,
): Promise<SavedPlace[]> {
  const value = await read(placesKey, store ?? (await defaultStore()));
  return Array.isArray(value)
    ? value.filter(
        (p) =>
          p &&
          typeof p.citySlug === "string" &&
          typeof p.slug === "string" &&
          typeof p.name === "string",
      )
    : [];
}
export async function toggleSavedPlace(place: SavedPlace, store?: WalkStore) {
  return mutate(async () => {
    const target = store ?? (await defaultStore()),
      existing = await loadSavedPlaces(target);
    const has = existing.some(
      (p) => p.citySlug === place.citySlug && p.slug === place.slug,
    );
    await target.setItem(
      placesKey,
      JSON.stringify(
        has
          ? existing.filter(
              (p) => p.citySlug !== place.citySlug || p.slug !== place.slug,
            )
          : [...existing, place],
      ),
    );
    return !has;
  });
}
export async function saveWalkFeedback(
  id: string,
  key: "rating" | "fit",
  value: string,
  store?: WalkStore,
) {
  await (store ?? (await defaultStore())).setItem(
    `citywalk:native:v2:feedback:${id}:${key}`,
    value,
  );
}
