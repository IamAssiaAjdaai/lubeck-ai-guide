import type {
  NativeTourPreferences,
  NativeTourResult,
  TourTimeBudget,
} from "./tourPlanning";

export const LOCAL_TRIP_STORAGE_VERSION = 1;

export type LocalTripDraft = Readonly<{
  version: typeof LOCAL_TRIP_STORAGE_VERSION;
  citySlug: string;
  timeBudgetMinutes: TourTimeBudget;
  stopSlugs: readonly string[];
  preferences: NativeTourPreferences;
  totalMinutes: number;
  totalWalkingMinutes: number;
  totalDistanceMeters: number;
  savedAt: string;
}>;

type SecureTripStore = Readonly<{
  setItemAsync(key: string, value: string): Promise<void>;
}>;

export async function saveLocalTripDraft(
  input: Readonly<{
    citySlug: string;
    timeBudgetMinutes: TourTimeBudget;
    preferences: NativeTourPreferences;
    result: NativeTourResult;
  }>,
  store?: SecureTripStore,
): Promise<LocalTripDraft> {
  const draft: LocalTripDraft = {
    version: LOCAL_TRIP_STORAGE_VERSION,
    citySlug: input.citySlug,
    timeBudgetMinutes: input.timeBudgetMinutes,
    stopSlugs: input.result.stops.map(({ place }) => place.slug),
    preferences: input.preferences,
    totalMinutes: input.result.totalMinutes,
    totalWalkingMinutes: input.result.totalWalkingMinutes,
    totalDistanceMeters: Math.round(input.result.totalDistanceMeters),
    savedAt: new Date().toISOString(),
  };
  const targetStore = store ?? await import("expo-secure-store");
  await targetStore.setItemAsync(`citywalk:local-trip:${input.citySlug}`, JSON.stringify(draft));
  return draft;
}
