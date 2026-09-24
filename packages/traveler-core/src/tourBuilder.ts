import {
  calculateDistanceMeters,
  estimateWalkingMinutes,
  type GeographicCoordinates,
} from "./distance";
import {
  countTourInterestMatches,
  parseTourPreferences,
  type TourPreferences,
} from "./tourPreferences";

export const TOUR_TIME_BUDGETS = [60, 90, 120, 180] as const;
export type TourTimeBudget = (typeof TOUR_TIME_BUDGETS)[number];
export const DEFAULT_TOUR_TIME_BUDGET = 90 satisfies TourTimeBudget;

export type TourBuilderPlace = Readonly<{
  slug: string;
  category: "see" | "eat" | "fun";
  coordinates: GeographicCoordinates;
  durationMinutes: number;
  tags?: readonly string[];
  status?: "open" | "closed" | "renovation" | "seasonal" | "unknown";
  statusVerifiedAt?: string;
  visitNoteValidUntil?: string;
}>;

export type PersonalizedTourStop<TPlace extends TourBuilderPlace> = Readonly<{
  place: TPlace;
  legDistanceMeters: number;
  legWalkingMinutes: number;
  interestMatches: number;
}>;

export type PersonalizedTourResult<TPlace extends TourBuilderPlace> = Readonly<{
  stops: readonly PersonalizedTourStop<TPlace>[];
  timeBudgetMinutes: TourTimeBudget;
  totalVisitMinutes: number;
  totalWalkingMinutes: number;
  totalMinutes: number;
  totalDistanceMeters: number;
}>;

export type BuildPersonalizedTourInput<TPlace extends TourBuilderPlace> = Readonly<{
  places: readonly TPlace[];
  preferences: TourPreferences | unknown;
  timeBudgetMinutes: TourTimeBudget | unknown;
  origin: GeographicCoordinates;
  /** Exact planner budget; legacy preset callers remain compatible. */
  planningBudgetMinutes?: number;
  finish?: GeographicCoordinates;
  additionalInterestTags?: readonly string[];
}>;

export function isTourTimeBudget(value: unknown): value is TourTimeBudget {
  return TOUR_TIME_BUDGETS.some((budget) => budget === value);
}

export function parseTourTimeBudget(value: unknown): TourTimeBudget {
  return isTourTimeBudget(value) ? value : DEFAULT_TOUR_TIME_BUDGET;
}

export function isEligibleTourPlace(place: TourBuilderPlace): boolean {
  return Number.isFinite(place.durationMinutes) &&
    place.durationMinutes > 0 &&
    !["closed", "renovation", "seasonal"].includes(place.status ?? "unknown");
}

export function buildPersonalizedTour<TPlace extends TourBuilderPlace>(
  input: BuildPersonalizedTourInput<TPlace>,
): PersonalizedTourResult<TPlace> {
  const preferences = parseTourPreferences(input.preferences);
  const timeBudgetMinutes = parseTourTimeBudget(input.timeBudgetMinutes);
  const budget = input.planningBudgetMinutes === undefined ? timeBudgetMinutes : input.planningBudgetMinutes;
  if (!Number.isFinite(budget) || budget <= 0 || budget > 1440) throw new Error("Invalid planning budget");
  const remaining = input.places.flatMap((place, originalIndex) =>
    isEligibleTourPlace(place) ? [{ place, originalIndex }] : []);
  const stops: PersonalizedTourStop<TPlace>[] = [];
  let current = input.origin;
  let totalVisitMinutes = 0;
  let totalWalkingMinutes = 0;
  let totalDistanceMeters = 0;

  while (remaining.length > 0) {
    const candidates = remaining.flatMap(({ place, originalIndex }) => {
      const legDistanceMeters = calculateDistanceMeters(current, place.coordinates);
      if (legDistanceMeters === undefined) return [];
      const legWalkingMinutes = estimateWalkingMinutes(legDistanceMeters);
      if (legWalkingMinutes === undefined) return [];
      const finishDistance = input.finish ? calculateDistanceMeters(place.coordinates, input.finish) : 0;
      if (finishDistance === undefined) return [];
      const finishMinutes = input.finish ? estimateWalkingMinutes(finishDistance) ?? 0 : 0;
      if (
        totalVisitMinutes + totalWalkingMinutes +
          place.durationMinutes + legWalkingMinutes + finishMinutes > budget
      ) return [];
      return [{
        place,
        originalIndex,
        matches: countTourInterestMatches(place, preferences.interests) + (input.additionalInterestTags ?? []).reduce((score, tag) => score + Number(place.tags?.includes(tag) ?? false), 0),
        legDistanceMeters,
        legWalkingMinutes,
      }];
    });
    const highestMatches = candidates.reduce(
      (highest, candidate) => Math.max(highest, candidate.matches),
      0,
    );
    const comparable = preferences.walkingPreference === "less-walking"
      ? candidates.filter(({ matches }) => matches >= Math.max(0, highestMatches - 1))
      : candidates;
    comparable.sort((first, second) => {
      const interestDifference = second.matches - first.matches;
      const distanceDifference = first.legDistanceMeters - second.legDistanceMeters;
      return preferences.walkingPreference === "less-walking"
        ? distanceDifference || interestDifference || first.originalIndex - second.originalIndex
        : interestDifference || distanceDifference || first.originalIndex - second.originalIndex;
    });
    const selected = comparable[0];
    if (!selected) break;
    stops.push({
      place: selected.place,
      legDistanceMeters: selected.legDistanceMeters,
      legWalkingMinutes: selected.legWalkingMinutes,
      interestMatches: selected.matches,
    });
    totalVisitMinutes += selected.place.durationMinutes;
    totalWalkingMinutes += selected.legWalkingMinutes;
    totalDistanceMeters += selected.legDistanceMeters;
    current = selected.place.coordinates;
    remaining.splice(
      remaining.findIndex(({ originalIndex }) => originalIndex === selected.originalIndex),
      1,
    );
  }

  return {
    stops,
    timeBudgetMinutes,
    totalVisitMinutes,
    totalWalkingMinutes,
    totalMinutes: totalVisitMinutes + totalWalkingMinutes,
    totalDistanceMeters,
  };
}
