import {
  isWalkJourney,
  type WalkJourney,
} from "@citywalk/traveler-core/walkJourney";

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
export async function loadActiveWalk(city: string, store?: WalkStore) {
  const value = await read(activeKey(city), store ?? (await defaultStore()));
  return isWalkJourney(value) && value.citySlug === city && !value.finishedAt
    ? value
    : undefined;
}
export async function persistActiveWalk(
  journey: WalkJourney,
  store?: WalkStore,
) {
  if (!isWalkJourney(journey)) throw new Error("Invalid journey");
  await mutate(async () =>
    (store ?? (await defaultStore())).setItem(
      activeKey(journey.citySlug),
      JSON.stringify(journey),
    ),
  );
}
export async function loadSavedWalks(
  store?: WalkStore,
): Promise<WalkJourney[]> {
  const value = await read(savedKey, store ?? (await defaultStore()));
  return Array.isArray(value) ? value.filter(isWalkJourney) : [];
}
export async function saveNativeWalk(journey: WalkJourney, store?: WalkStore) {
  if (!isWalkJourney(journey)) throw new Error("Invalid journey");
  return mutate(async () => {
    const target = store ?? (await defaultStore());
    const existing = await loadSavedWalks(target);
    await target.setItem(
      savedKey,
      JSON.stringify([
        journey,
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
