import {
  lubeckLandmarks,
} from "@/data/places";

import type {
  Locale,
} from "@/lib/i18n";

import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
  type ResolvedTourContext,
  type TourContextInput,
  type TourStopContext,
} from "@/lib/tourContext";

import {
  getLubeckTourLookFor,
  lubeckHistoricTourGuide,
} from "@/data/tours/lubeckHistoricTour";

export class InvalidTourContextError extends Error {
  readonly status = 400;

  constructor(message = "Invalid tour context.") {
    super(message);
    this.name = "InvalidTourContextError";
  }
}



function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseTourContextInput(
  input: unknown,
): TourContextInput {
  if (!isRecord(input)) {
    throw new InvalidTourContextError();
  }

  if (
    input.version !==
      TOUR_CONTEXT_VERSION ||
    input.tourId !==
      LUBECK_HISTORIC_TOUR_ID ||
    typeof input.currentStop !==
      "string" ||
    !Array.isArray(
      input.visitedStops,
    ) ||
    !input.visitedStops.every(
      (item) =>
        typeof item === "string",
    )
  ) {
    throw new InvalidTourContextError();
  }

  return {
    version:
      TOUR_CONTEXT_VERSION,

    tourId:
      LUBECK_HISTORIC_TOUR_ID,

    currentStop:
      input.currentStop,

    visitedStops:
      input.visitedStops,
  };
}

function toTourStopContext(
  slug: string,
  locale: Locale,
): TourStopContext {
  const place =
    lubeckLandmarks.find(
      (item) =>
        item.slug === slug,
    );

  if (!place) {
    throw new InvalidTourContextError(
      `Unknown tour stop: ${slug}`,
    );
  }

  return {
    slug: place.slug,
    name:
      place.content[locale].name,
  };
}

export function resolveTourContext({
  input,
  locale,
  expectedCurrentStop,
}: {
  input: unknown;
  locale: Locale;
  expectedCurrentStop: string;
}): ResolvedTourContext | null {
  /*
   * Tour context remains optional so
   * existing AI requests keep working.
   */
  if (
    input === undefined ||
    input === null
  ) {
    return null;
  }

  const parsed =
    parseTourContextInput(input);

  /*
   * Prevent the browser from claiming
   * that the visitor is at another
   * landmark than the request itself.
   */
  if (
    parsed.currentStop !==
    expectedCurrentStop
  ) {
    throw new InvalidTourContextError(
      "Tour context does not match the current landmark.",
    );
  }

  const canonicalSlugs =
    lubeckLandmarks.map(
      (place) => place.slug,
    );

  const validSlugSet =
    new Set(canonicalSlugs);

  if (
    !validSlugSet.has(
      parsed.currentStop,
    )
  ) {
    throw new InvalidTourContextError(
      "Current stop is not part of this tour.",
    );
  }

  const normalizedVisited =
    Array.from(
      new Set(
        parsed.visitedStops,
      ),
    ).filter(
      (slug) =>
        slug !==
        parsed.currentStop,
    );

  for (
    const slug of normalizedVisited
  ) {
    if (!validSlugSet.has(slug)) {
      throw new InvalidTourContextError(
        `Unknown visited stop: ${slug}`,
      );
    }
  }

  /*
   * Keep visited places in the
   * canonical tour order instead of
   * trusting client-provided order.
   */
  const visitedSlugs =
    canonicalSlugs.filter(
      (slug) =>
        normalizedVisited.includes(
          slug,
        ),
    );

  const currentIndex =
    canonicalSlugs.indexOf(
      parsed.currentStop,
    );

  const remainingSlugs =
    canonicalSlugs.filter(
      (slug) =>
        slug !==
          parsed.currentStop &&
        !visitedSlugs.includes(slug),
    );

  /*
   * "Next" means the first unvisited
   * stop after the current position
   * in the official tour order.
   */
  const nextSlug =
    canonicalSlugs
      .slice(currentIndex + 1)
      .find(
        (slug) =>
          !visitedSlugs.includes(
            slug,
          ),
      ) ?? null;

  return {
    tourId:
      LUBECK_HISTORIC_TOUR_ID,

    currentStop:
      toTourStopContext(
        parsed.currentStop,
        locale,
      ),

    currentStopNumber:
      currentIndex + 1,

    totalStops:
      canonicalSlugs.length,

    visitedStops:
      visitedSlugs.map(
        (slug) =>
          toTourStopContext(
            slug,
            locale,
          ),
      ),

    remainingStops:
      remainingSlugs.map(
        (slug) =>
          toTourStopContext(
            slug,
            locale,
          ),
      ),

    nextStop:
      nextSlug
        ? toTourStopContext(
            nextSlug,
            locale,
          )
        : null,

    narrative:
      lubeckHistoricTourGuide.narrative,

    /*
     * Phase 4 will add only
     * explicitly verified cues.
     */
    lookFor:
      getLubeckTourLookFor(
        parsed.currentStop,
      ),
  };
}