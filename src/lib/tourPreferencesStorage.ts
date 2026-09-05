import {
  DEFAULT_TOUR_PREFERENCES,
  parseTourPreferences,
  type TourPreferences,
} from "@/lib/tourPreferences";

const TOUR_PREFERENCES_STORAGE_PREFIX =
  "citywalk:tour:preferences";
export const TOUR_PREFERENCES_STORAGE_VERSION = 1;

export function getTourPreferencesStorageKey(
  tourId: string,
): string {
  return `${TOUR_PREFERENCES_STORAGE_PREFIX}:${tourId}`;
}

export function loadTourPreferences(
  tourId: string,
): TourPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_TOUR_PREFERENCES;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      getTourPreferencesStorageKey(tourId),
    );

    if (!rawValue) {
      return DEFAULT_TOUR_PREFERENCES;
    }

    const storedValue: unknown =
      JSON.parse(rawValue);

    if (
      typeof storedValue !== "object" ||
      storedValue === null ||
      !("version" in storedValue) ||
      storedValue.version !==
        TOUR_PREFERENCES_STORAGE_VERSION ||
      !("preferences" in storedValue)
    ) {
      return DEFAULT_TOUR_PREFERENCES;
    }

    return parseTourPreferences(
      storedValue.preferences,
    );
  } catch {
    return DEFAULT_TOUR_PREFERENCES;
  }
}

export function saveTourPreferences(
  tourId: string,
  preferences: TourPreferences,
): TourPreferences {
  const validatedPreferences =
    parseTourPreferences(preferences);

  try {
    window.sessionStorage.setItem(
      getTourPreferencesStorageKey(tourId),
      JSON.stringify({
        version:
          TOUR_PREFERENCES_STORAGE_VERSION,
        preferences: validatedPreferences,
      }),
    );
  } catch {
    // Preferences remain usable in memory when
    // sessionStorage is unavailable.
  }

  return validatedPreferences;
}

export function clearTourPreferences(
  tourId: string,
): void {
  try {
    window.sessionStorage.removeItem(
      getTourPreferencesStorageKey(tourId),
    );
  } catch {
    // Reset remains usable in memory when
    // sessionStorage is unavailable.
  }
}
