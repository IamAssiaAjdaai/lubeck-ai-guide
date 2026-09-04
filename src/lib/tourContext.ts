export const TOUR_CONTEXT_VERSION = 1 as const;

export const LUBECK_HISTORIC_TOUR_ID =
  "lubeck_historic_center" as const;

export type SupportedTourId =
  typeof LUBECK_HISTORIC_TOUR_ID;

/**
 * Minimal context sent from the browser.
 *
 * Important:
 * The browser only sends identifiers/state.
 * It never sends trusted historical content,
 * narrative text, or GPS coordinates.
 */
export type TourContextInput = Readonly<{
  version: typeof TOUR_CONTEXT_VERSION;
  tourId: SupportedTourId;
  currentStop: string;
  visitedStops: readonly string[];
}>;

/**
 * Trusted stop data reconstructed on the server.
 */
export type TourStopContext = Readonly<{
  slug: string;
  name: string;
}>;

/**
 * Full trusted context used when building
 * the AI prompt.
 */
export type ResolvedTourContext = Readonly<{
  tourId: SupportedTourId;

  currentStop: TourStopContext;

  currentStopNumber: number;
  totalStops: number;

  visitedStops: readonly TourStopContext[];
  remainingStops: readonly TourStopContext[];

  nextStop: TourStopContext | null;

  narrative: string;

  lookFor: readonly string[];
}>;

export function createTourContextInput({
  tourId,
  currentStop,
  visitedStops,
}: {
  tourId: SupportedTourId;
  currentStop: string;
  visitedStops: readonly string[];
}): TourContextInput {
  const uniqueVisitedStops = Array.from(
    new Set(
      visitedStops
        .map((slug) => slug.trim())
        .filter(
          (slug) =>
            slug.length > 0 &&
            slug !== currentStop,
        ),
    ),
  );

  return {
    version: TOUR_CONTEXT_VERSION,
    tourId,
    currentStop,
    visitedStops: uniqueVisitedStops,
  };
}