import type {
  SupportedTourId,
} from "@/lib/tourContext";

const VISITED_STOPS_PREFIX =
  "citywalk:tour:visited";

function getStorageKey(
  tourId: SupportedTourId,
): string {
  return `${VISITED_STOPS_PREFIX}:${tourId}`;
}

export function getVisitedTourStops(
  tourId: SupportedTourId,
): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue =
      window.sessionStorage.getItem(
        getStorageKey(tourId),
      );

    if (!rawValue) {
      return [];
    }

    const value = JSON.parse(rawValue);

    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value.filter(
          (item): item is string =>
            typeof item === "string" &&
            item.length > 0,
        ),
      ),
    );
  } catch {
    return [];
  }
}

export function rememberTourStop(
  tourId: SupportedTourId,
  stopSlug: string,
): string[] {
  const visitedStops =
    getVisitedTourStops(tourId);

  const nextVisitedStops = Array.from(
    new Set([
      ...visitedStops,
      stopSlug,
    ]),
  );

  try {
    window.sessionStorage.setItem(
      getStorageKey(tourId),
      JSON.stringify(nextVisitedStops),
    );
  } catch {
    // CITYWALK must still work when
    // sessionStorage is unavailable.
  }

  return nextVisitedStops;
}