import type {
  NativeTourPreferences,
  NativeTourResult,
  TourTimeBudget,
} from "./tourPlanning";
import { createMobileTripId } from "./tripNavigation";

export const LOCAL_TRIP_STORAGE_VERSION = 2;
export const LOCAL_TRIPS_STORAGE_KEY = `citywalk:local-trips:v${LOCAL_TRIP_STORAGE_VERSION}`;

export type LocalSavedTrip = Readonly<{
  version: typeof LOCAL_TRIP_STORAGE_VERSION;
  id: string;
  citySlug: string;
  timeBudgetMinutes: TourTimeBudget;
  stopSlugs: readonly string[];
  preferences: NativeTourPreferences;
  totalVisitMinutes: number;
  totalMinutes: number;
  totalWalkingMinutes: number;
  totalDistanceMeters: number;
  savedAt: string;
}>;

type TripStore = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

type SaveOptions = Readonly<{
  store?: TripStore;
  createId?: () => string;
  now?: () => Date;
}>;

export async function saveLocalTrip(
  input: Readonly<{
    citySlug: string;
    timeBudgetMinutes: TourTimeBudget;
    preferences: NativeTourPreferences;
    result: NativeTourResult;
  }>,
  options: SaveOptions = {},
): Promise<LocalSavedTrip> {
  const store = options.store ?? await getDefaultStore();
  const existing = await loadLocalTrips(store);
  const trip: LocalSavedTrip = {
    version: LOCAL_TRIP_STORAGE_VERSION,
    id: (options.createId ?? (() => createMobileTripId("saved")))(),
    citySlug: input.citySlug,
    timeBudgetMinutes: input.timeBudgetMinutes,
    stopSlugs: input.result.stops.map(({ place }) => place.slug),
    preferences: input.preferences,
    totalVisitMinutes: input.result.totalVisitMinutes,
    totalMinutes: input.result.totalMinutes,
    totalWalkingMinutes: input.result.totalWalkingMinutes,
    totalDistanceMeters: Math.round(input.result.totalDistanceMeters),
    savedAt: (options.now ?? (() => new Date()))().toISOString(),
  };
  if (!isLocalSavedTrip(trip)) throw new Error("Invalid local trip.");
  await store.setItem(LOCAL_TRIPS_STORAGE_KEY, JSON.stringify([trip, ...existing]));
  return trip;
}

export async function loadLocalTrips(store?: TripStore): Promise<readonly LocalSavedTrip[]> {
  const targetStore = store ?? await getDefaultStore();
  let serialized: string | null;
  try {
    serialized = await targetStore.getItem(LOCAL_TRIPS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter(isLocalSavedTrip);
  } catch {
    return [];
  }
}

export const saveLocalTripDraft = saveLocalTrip;

async function getDefaultStore(): Promise<TripStore> {
  return (await import("@react-native-async-storage/async-storage")).default;
}

function isLocalSavedTrip(value: unknown): value is LocalSavedTrip {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const trip = value as Record<string, unknown>;
  const preferences = trip.preferences as Record<string, unknown> | undefined;
  return (
    trip.version === LOCAL_TRIP_STORAGE_VERSION &&
    typeof trip.id === "string" && trip.id.length > 0 &&
    typeof trip.citySlug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trip.citySlug) &&
    Array.isArray(trip.stopSlugs) && trip.stopSlugs.length > 0 &&
    trip.stopSlugs.every((slug) => typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) &&
    (trip.timeBudgetMinutes === 60 || trip.timeBudgetMinutes === 90 || trip.timeBudgetMinutes === 120 || trip.timeBudgetMinutes === 180) &&
    Boolean(preferences) &&
    Array.isArray(preferences?.interests) &&
    preferences.interests.every((interest) => interest === "history" || interest === "architecture" || interest === "hidden-gems" || interest === "family") &&
    (preferences.walkingPreference === "standard" || preferences.walkingPreference === "less-walking") &&
    isNonNegativeNumber(trip.totalVisitMinutes) &&
    isNonNegativeNumber(trip.totalMinutes) &&
    isNonNegativeNumber(trip.totalWalkingMinutes) &&
    isNonNegativeNumber(trip.totalDistanceMeters) &&
    typeof trip.savedAt === "string" && !Number.isNaN(Date.parse(trip.savedAt))
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
