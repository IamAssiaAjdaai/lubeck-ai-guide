import type {
  PlaceCategory,
  PlaceCoordinates,
  PlaceStatus,
} from "@/data/places";
import {
  calculateDistanceMeters,
  estimateWalkingMinutes,
} from "@/lib/distance";
import {
  countTourInterestMatches,
  parseTourPreferences,
  type TourPreferences,
} from "@/lib/tourPreferences";

export const TOUR_TIME_BUDGETS = [
  60,
  90,
  120,
  180,
] as const;

export type TourTimeBudget =
  (typeof TOUR_TIME_BUDGETS)[number];

export const DEFAULT_TOUR_TIME_BUDGET =
  90 satisfies TourTimeBudget;

export type TourBuilderPlace = Readonly<{
  slug: string;
  category: PlaceCategory;
  coordinates: PlaceCoordinates;
  durationMinutes: number;
  tags?: readonly string[];
  status?: PlaceStatus;
  statusVerifiedAt?: string;
  visitNoteValidUntil?: string;
}>;

export type PersonalizedTourStop<
  TPlace extends TourBuilderPlace,
> = Readonly<{
  place: TPlace;
  legDistanceMeters: number;
  legWalkingMinutes: number;
  interestMatches: number;
}>;

export type PersonalizedTourResult<
  TPlace extends TourBuilderPlace,
> = Readonly<{
  stops: readonly PersonalizedTourStop<TPlace>[];
  timeBudgetMinutes: TourTimeBudget;
  totalVisitMinutes: number;
  totalWalkingMinutes: number;
  totalMinutes: number;
  totalDistanceMeters: number;
}>;

export type BuildPersonalizedTourInput<
  TPlace extends TourBuilderPlace,
> = Readonly<{
  places: readonly TPlace[];
  preferences: TourPreferences | unknown;
  timeBudgetMinutes: TourTimeBudget | unknown;
  origin: PlaceCoordinates;
}>;

export function isTourTimeBudget(
  value: unknown,
): value is TourTimeBudget {
  return TOUR_TIME_BUDGETS.some(
    (budget) => budget === value,
  );
}

export function parseTourTimeBudget(
  value: unknown,
): TourTimeBudget {
  return isTourTimeBudget(value)
    ? value
    : DEFAULT_TOUR_TIME_BUDGET;
}

export function isEligibleTourPlace(
  place: TourBuilderPlace,
): boolean {
  if (
    !Number.isFinite(place.durationMinutes) ||
    place.durationMinutes <= 0
  ) {
    return false;
  }

  // Seasonal places remain excluded until the
  // data model can provide a verified current-open
  // signal for the requested visit date.
  return ![
    "closed",
    "renovation",
    "seasonal",
  ].includes(place.status ?? "unknown");
}

type Candidate<TPlace extends TourBuilderPlace> =
  Readonly<{
    place: TPlace;
    originalIndex: number;
    interestMatches: number;
    legDistanceMeters: number;
    legWalkingMinutes: number;
    incrementalMinutes: number;
  }>;

function compareCandidates<
  TPlace extends TourBuilderPlace,
>(
  first: Candidate<TPlace>,
  second: Candidate<TPlace>,
  preferences: TourPreferences,
): number {
  const interestDifference =
    second.interestMatches -
    first.interestMatches;
  const distanceDifference =
    first.legDistanceMeters -
    second.legDistanceMeters;

  if (
    preferences.walkingPreference ===
    "less-walking"
  ) {
    if (distanceDifference !== 0) {
      return distanceDifference;
    }

    if (interestDifference !== 0) {
      return interestDifference;
    }
  } else {
    if (interestDifference !== 0) {
      return interestDifference;
    }

    if (distanceDifference !== 0) {
      return distanceDifference;
    }
  }

  return (
    first.originalIndex - second.originalIndex
  );
}

export function buildPersonalizedTour<
  TPlace extends TourBuilderPlace,
>({
  places,
  preferences: rawPreferences,
  timeBudgetMinutes: rawTimeBudget,
  origin,
}: BuildPersonalizedTourInput<TPlace>): PersonalizedTourResult<TPlace> {
  const preferences =
    parseTourPreferences(rawPreferences);
  const timeBudgetMinutes =
    parseTourTimeBudget(rawTimeBudget);
  const remaining = places.flatMap(
    (place, originalIndex) =>
      isEligibleTourPlace(place)
        ? [{ place, originalIndex }]
        : [],
  );
  const stops: PersonalizedTourStop<TPlace>[] = [];
  let currentPosition = origin;
  let totalVisitMinutes = 0;
  let totalWalkingMinutes = 0;
  let totalDistanceMeters = 0;

  while (remaining.length > 0) {
    const candidates = remaining
      .flatMap(({ place, originalIndex }) => {
        const legDistanceMeters =
          calculateDistanceMeters(
            currentPosition,
            place.coordinates,
          );

        if (legDistanceMeters === undefined) {
          return [];
        }

        const legWalkingMinutes =
          estimateWalkingMinutes(
            legDistanceMeters,
          );

        if (legWalkingMinutes === undefined) {
          return [];
        }

        const incrementalMinutes =
          legWalkingMinutes +
          place.durationMinutes;

        if (
          totalVisitMinutes +
            totalWalkingMinutes +
            incrementalMinutes >
          timeBudgetMinutes
        ) {
          return [];
        }

        return [
          {
            place,
            originalIndex,
            interestMatches:
              countTourInterestMatches(
                place,
                preferences.interests,
              ),
            legDistanceMeters,
            legWalkingMinutes,
            incrementalMinutes,
          },
        ];
      });
    const highestInterestMatches =
      candidates.reduce(
        (highest, candidate) =>
          Math.max(
            highest,
            candidate.interestMatches,
          ),
        0,
      );
    const comparableCandidates =
      preferences.walkingPreference ===
      "less-walking"
        // One fewer matching interest remains
        // comparable; larger relevance gaps stay
        // authoritative over compactness.
        ? candidates.filter(
            (candidate) =>
              candidate.interestMatches >=
              Math.max(
                0,
                highestInterestMatches - 1,
              ),
          )
        : candidates;
    const rankedCandidates =
      comparableCandidates.sort((first, second) =>
        compareCandidates(
          first,
          second,
          preferences,
        ),
      );

    const selected = rankedCandidates[0];

    if (!selected) {
      break;
    }

    stops.push({
      place: selected.place,
      legDistanceMeters:
        selected.legDistanceMeters,
      legWalkingMinutes:
        selected.legWalkingMinutes,
      interestMatches:
        selected.interestMatches,
    });
    totalVisitMinutes +=
      selected.place.durationMinutes;
    totalWalkingMinutes +=
      selected.legWalkingMinutes;
    totalDistanceMeters +=
      selected.legDistanceMeters;
    currentPosition =
      selected.place.coordinates;

    const selectedIndex =
      remaining.findIndex(
        ({ originalIndex }) =>
          originalIndex ===
          selected.originalIndex,
      );
    remaining.splice(selectedIndex, 1);
  }

  return {
    stops,
    timeBudgetMinutes,
    totalVisitMinutes,
    totalWalkingMinutes,
    totalMinutes:
      totalVisitMinutes + totalWalkingMinutes,
    totalDistanceMeters,
  };
}
