import type { PublicPlace } from "./api/contracts";

export const TOUR_INTERESTS = ["history", "architecture", "hidden-gems", "family"] as const;
export const WALKING_PREFERENCES = ["standard", "less-walking"] as const;
export const TOUR_TIME_BUDGETS = [60, 90, 120, 180] as const;

export type TourInterest = (typeof TOUR_INTERESTS)[number];
export type WalkingPreference = (typeof WALKING_PREFERENCES)[number];
export type TourTimeBudget = (typeof TOUR_TIME_BUDGETS)[number];
export type NativeTourPreferences = Readonly<{
  interests: readonly TourInterest[];
  walkingPreference: WalkingPreference;
}>;

export type NativeTourStop = Readonly<{
  place: PublicPlace;
  legDistanceMeters: number;
  legWalkingMinutes: number;
}>;

export type NativeTourResult = Readonly<{
  stops: readonly NativeTourStop[];
  totalVisitMinutes: number;
  totalWalkingMinutes: number;
  totalMinutes: number;
  totalDistanceMeters: number;
}>;

const INTEREST_TAGS = {
  history: "history",
  architecture: "architecture",
  "hidden-gems": "hidden-gem",
  family: "family",
} as const satisfies Readonly<Record<TourInterest, string>>;

const EARTH_RADIUS_METERS = 6_371_008.8;
const WALKING_SPEED_KMH = 4.8;

export const DEFAULT_NATIVE_TOUR_PREFERENCES: NativeTourPreferences = {
  interests: [],
  walkingPreference: "standard",
};

export function rankNativePlaces(
  places: readonly PublicPlace[],
  preferences: NativeTourPreferences,
  origin: PublicPlace["coordinates"],
): readonly PublicPlace[] {
  return places
    .map((place, originalIndex) => ({
      place,
      originalIndex,
      matches: countMatches(place, preferences.interests),
      distance: preferences.walkingPreference === "less-walking"
        ? calculateDistanceMeters(origin, place.coordinates)
        : 0,
    }))
    .sort((first, second) =>
      second.matches - first.matches ||
      first.distance - second.distance ||
      first.originalIndex - second.originalIndex)
    .map(({ place }) => place);
}

export function buildNativePersonalizedTour(input: Readonly<{
  places: readonly PublicPlace[];
  preferences: NativeTourPreferences;
  timeBudgetMinutes: TourTimeBudget;
  origin: PublicPlace["coordinates"];
}>): NativeTourResult {
  const remaining = input.places.flatMap((place, originalIndex) =>
    isEligible(place) ? [{ place, originalIndex }] : []);
  const stops: NativeTourStop[] = [];
  let current = input.origin;
  let totalVisitMinutes = 0;
  let totalWalkingMinutes = 0;
  let totalDistanceMeters = 0;

  while (remaining.length > 0) {
    const candidates = remaining.flatMap(({ place, originalIndex }) => {
      const legDistanceMeters = calculateDistanceMeters(current, place.coordinates);
      const legWalkingMinutes = estimateWalkingMinutes(legDistanceMeters);
      const incrementalMinutes = place.durationMinutes + legWalkingMinutes;
      if (totalVisitMinutes + totalWalkingMinutes + incrementalMinutes > input.timeBudgetMinutes) {
        return [];
      }
      return [{
        place,
        originalIndex,
        matches: countMatches(place, input.preferences.interests),
        legDistanceMeters,
        legWalkingMinutes,
      }];
    });
    const highestMatches = candidates.reduce(
      (highest, candidate) => Math.max(highest, candidate.matches),
      0,
    );
    const comparable = input.preferences.walkingPreference === "less-walking"
      ? candidates.filter(({ matches }) => matches >= Math.max(0, highestMatches - 1))
      : candidates;
    comparable.sort((first, second) => {
      const interestDifference = second.matches - first.matches;
      const distanceDifference = first.legDistanceMeters - second.legDistanceMeters;
      return input.preferences.walkingPreference === "less-walking"
        ? distanceDifference || interestDifference || first.originalIndex - second.originalIndex
        : interestDifference || distanceDifference || first.originalIndex - second.originalIndex;
    });
    const selected = comparable[0];
    if (!selected) break;

    stops.push({
      place: selected.place,
      legDistanceMeters: selected.legDistanceMeters,
      legWalkingMinutes: selected.legWalkingMinutes,
    });
    totalVisitMinutes += selected.place.durationMinutes;
    totalWalkingMinutes += selected.legWalkingMinutes;
    totalDistanceMeters += selected.legDistanceMeters;
    current = selected.place.coordinates;
    remaining.splice(remaining.findIndex(({ originalIndex }) =>
      originalIndex === selected.originalIndex), 1);
  }

  return {
    stops,
    totalVisitMinutes,
    totalWalkingMinutes,
    totalMinutes: totalVisitMinutes + totalWalkingMinutes,
    totalDistanceMeters,
  };
}

export function formatNativeDistance(distanceMeters: number, locale: string): string {
  if (distanceMeters < 1000) {
    const meters = distanceMeters === 0 ? 0 : Math.max(10, Math.round(distanceMeters / 10) * 10);
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "meter",
      unitDisplay: "short",
      maximumFractionDigits: 0,
    }).format(meters);
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "kilometer",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(distanceMeters / 1000);
}

function isEligible(place: PublicPlace): boolean {
  return place.durationMinutes > 0 &&
    !["closed", "renovation", "seasonal"].includes(place.status ?? "unknown");
}

function countMatches(place: PublicPlace, interests: readonly TourInterest[]): number {
  return interests.reduce((total, interest) =>
    total + Number(place.tags?.includes(INTEREST_TAGS[interest]) ?? false), 0);
}

function calculateDistanceMeters(
  origin: PublicPlace["coordinates"],
  destination: PublicPlace["coordinates"],
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destination.lat - origin.lat);
  const longitudeDelta = radians(destination.lng - origin.lng);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(
    Math.sqrt(Math.min(1, Math.max(0, haversine))),
    Math.sqrt(1 - Math.min(1, Math.max(0, haversine))),
  );
}

function estimateWalkingMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round((distanceMeters / 1000 / WALKING_SPEED_KMH) * 60));
}
