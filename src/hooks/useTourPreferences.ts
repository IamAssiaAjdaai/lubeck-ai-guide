"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  DEFAULT_TOUR_PREFERENCES,
  type TourPreferences,
} from "@/lib/tourPreferences";
import {
  getTourPreferencesSnapshot,
  loadTourPreferences,
  subscribeTourPreferences,
} from "@/lib/tourPreferencesStorage";

const SERVER_SNAPSHOT = "";

export function useTourPreferences(
  tourId: string,
): TourPreferences {
  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeTourPreferences(
        tourId,
        listener,
      ),
    [tourId],
  );
  const getSnapshot = useCallback(
    () => getTourPreferencesSnapshot(tourId),
    [tourId],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  return useMemo(
    () =>
      snapshot
        ? loadTourPreferences(tourId)
        : DEFAULT_TOUR_PREFERENCES,
    [snapshot, tourId],
  );
}
