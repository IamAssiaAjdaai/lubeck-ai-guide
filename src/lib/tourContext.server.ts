import "server-only";

import {
  getLubeckTourLookFor,
  lubeckHistoricTourGuide,
} from "@/data/tours/lubeckHistoricTour";
import {
  resolvePublicLocalization,
  type PublicCitySnapshot,
  type PublicTour,
} from "@/lib/content/publicRepository.server";
import type { Locale } from "@/lib/i18n";
import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
  type ResolvedTourContext,
  type TourContextInput,
  type TourStopContext,
} from "@/lib/tourContext";

const LUBECK_HISTORIC_TOUR_SLUG = "historic-center-walk";

export class InvalidTourContextError extends Error {
  readonly status = 400;

  constructor(message = "Invalid tour context.") {
    super(message);
    this.name = "InvalidTourContextError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTourContextInput(input: unknown): TourContextInput {
  if (!isRecord(input)) throw new InvalidTourContextError();

  if (
    input.version !== TOUR_CONTEXT_VERSION ||
    typeof input.tourId !== "string" ||
    !input.tourId.trim() ||
    typeof input.currentStop !== "string" ||
    !Array.isArray(input.visitedStops) ||
    !input.visitedStops.every((item) => typeof item === "string")
  ) {
    throw new InvalidTourContextError();
  }

  return {
    version: TOUR_CONTEXT_VERSION,
    tourId: input.tourId,
    currentStop: input.currentStop,
    visitedStops: input.visitedStops,
  };
}

function resolvePublishedTour(
  snapshot: PublicCitySnapshot,
  tourId: string,
): PublicTour | undefined {
  const exact = snapshot.tours.find((tour) => tour.slug === tourId);
  if (exact) return exact;

  if (
    snapshot.city.slug === "lubeck" &&
    tourId === LUBECK_HISTORIC_TOUR_ID
  ) {
    return snapshot.tours.find(
      (tour) => tour.slug === LUBECK_HISTORIC_TOUR_SLUG,
    );
  }

  return undefined;
}

function toTourStopContext(
  snapshot: PublicCitySnapshot,
  slug: string,
  locale: Locale,
): TourStopContext {
  const place = snapshot.places.find((candidate) => candidate.slug === slug);
  const content = place
    ? resolvePublicLocalization(place.content, locale)
    : undefined;

  if (!place || !content) {
    throw new InvalidTourContextError(`Unknown tour stop: ${slug}`);
  }

  return { slug: place.slug, name: content.content.name };
}

export function resolveTourContext({
  input,
  locale,
  expectedCurrentStop,
  snapshot,
}: {
  input: unknown;
  locale: Locale;
  expectedCurrentStop: string;
  snapshot: PublicCitySnapshot;
}): ResolvedTourContext | null {
  if (input === undefined || input === null) return null;

  const parsed = parseTourContextInput(input);
  if (parsed.currentStop !== expectedCurrentStop) {
    throw new InvalidTourContextError(
      "Tour context does not match the current place.",
    );
  }

  const tour = resolvePublishedTour(snapshot, parsed.tourId);
  if (!tour) throw new InvalidTourContextError("Unknown published tour.");

  const canonicalSlugs = [...tour.stops]
    .sort((first, second) => first.position - second.position)
    .map((stop) => stop.placeSlug);
  const validSlugSet = new Set(canonicalSlugs);

  if (!validSlugSet.has(parsed.currentStop)) {
    throw new InvalidTourContextError("Current stop is not part of this tour.");
  }

  const normalizedVisited = Array.from(new Set(parsed.visitedStops)).filter(
    (slug) => slug !== parsed.currentStop,
  );
  for (const slug of normalizedVisited) {
    if (!validSlugSet.has(slug)) {
      throw new InvalidTourContextError(`Unknown visited stop: ${slug}`);
    }
  }

  const visitedSlugs = canonicalSlugs.filter((slug) =>
    normalizedVisited.includes(slug)
  );
  const currentIndex = canonicalSlugs.indexOf(parsed.currentStop);
  const remainingSlugs = canonicalSlugs.filter(
    (slug) => slug !== parsed.currentStop && !visitedSlugs.includes(slug),
  );
  const nextSlug = canonicalSlugs
    .slice(currentIndex + 1)
    .find((slug) => !visitedSlugs.includes(slug)) ?? null;
  const isCanonicalLubeckTour =
    snapshot.city.slug === "lubeck" &&
    tour.slug === LUBECK_HISTORIC_TOUR_SLUG;

  return {
    tourId: parsed.tourId,
    currentStop: toTourStopContext(snapshot, parsed.currentStop, locale),
    currentStopNumber: currentIndex + 1,
    totalStops: canonicalSlugs.length,
    visitedStops: visitedSlugs.map((slug) =>
      toTourStopContext(snapshot, slug, locale)
    ),
    remainingStops: remainingSlugs.map((slug) =>
      toTourStopContext(snapshot, slug, locale)
    ),
    nextStop: nextSlug
      ? toTourStopContext(snapshot, nextSlug, locale)
      : null,
    narrative: isCanonicalLubeckTour
      ? lubeckHistoricTourGuide.narrative
      : "",
    lookFor: isCanonicalLubeckTour
      ? getLubeckTourLookFor(parsed.currentStop)
      : [],
  };
}
