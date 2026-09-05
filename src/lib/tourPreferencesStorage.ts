import {
  DEFAULT_TOUR_PREFERENCES,
  parseTourPreferences,
  type TourPreferences,
} from "@/lib/tourPreferences";

const TOUR_PREFERENCES_STORAGE_PREFIX =
  "citywalk:tour:preferences";
const TOUR_PREFERENCES_CHANGED_EVENT =
  "citywalk:tour-preferences-changed";
export const TOUR_PREFERENCES_STORAGE_VERSION = 1;

const memorySnapshots = new Map<string, string>();

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
    const rawValue = getTourPreferencesSnapshot(
      tourId,
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

function dispatchPreferenceChange(
  tourId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      TOUR_PREFERENCES_CHANGED_EVENT,
      { detail: { tourId } },
    ),
  );
}

export function getTourPreferencesSnapshot(
  tourId: string,
): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      getTourPreferencesStorageKey(tourId),
    );

    if (rawValue === null) {
      memorySnapshots.delete(tourId);
      return "";
    }

    return rawValue;
  } catch {
    return memorySnapshots.get(tourId) ?? "";
  }
}

export function subscribeTourPreferences(
  tourId: string,
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handlePreferenceChange = (
    event: Event,
  ) => {
    if (
      event instanceof CustomEvent &&
      event.detail?.tourId === tourId
    ) {
      listener();
    }
  };

  window.addEventListener(
    TOUR_PREFERENCES_CHANGED_EVENT,
    handlePreferenceChange,
  );

  return () =>
    window.removeEventListener(
      TOUR_PREFERENCES_CHANGED_EVENT,
      handlePreferenceChange,
    );
}

export function saveTourPreferences(
  tourId: string,
  preferences: TourPreferences,
): TourPreferences {
  const validatedPreferences =
    parseTourPreferences(preferences);
  const serializedPreferences = JSON.stringify({
    version: TOUR_PREFERENCES_STORAGE_VERSION,
    preferences: validatedPreferences,
  });

  try {
    window.sessionStorage.setItem(
      getTourPreferencesStorageKey(tourId),
      serializedPreferences,
    );
    memorySnapshots.delete(tourId);
  } catch {
    // Preferences remain usable in memory when
    // sessionStorage is unavailable.
    memorySnapshots.set(
      tourId,
      serializedPreferences,
    );
  }

  dispatchPreferenceChange(tourId);

  return validatedPreferences;
}

export function clearTourPreferences(
  tourId: string,
): void {
  memorySnapshots.delete(tourId);

  try {
    window.sessionStorage.removeItem(
      getTourPreferencesStorageKey(tourId),
    );
  } catch {
    // Reset remains usable in memory when
    // sessionStorage is unavailable.
  }

  dispatchPreferenceChange(tourId);
}
