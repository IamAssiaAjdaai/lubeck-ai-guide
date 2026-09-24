import type { PublicPlaceCard } from "./api/contracts";
import {
  buildPersonalizedTour,
  formatDistance,
  rankPlacesForTourPreferences,
  type TourPreferences,
} from "@citywalk/traveler-core";

export {
  DEFAULT_TOUR_PREFERENCES as DEFAULT_NATIVE_TOUR_PREFERENCES,
  TOUR_INTERESTS,
  TOUR_TIME_BUDGETS,
  WALKING_PREFERENCES,
} from "@citywalk/traveler-core";
export type {
  TourInterest,
  TourTimeBudget,
  WalkingPreference,
} from "@citywalk/traveler-core";

export type NativeTourPreferences = TourPreferences;
export type NativeTourStop = Readonly<{
  place: PublicPlaceCard;
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

export function rankNativePlaces(
  places: readonly PublicPlaceCard[],
  preferences: NativeTourPreferences,
  origin: PublicPlaceCard["coordinates"],
): readonly PublicPlaceCard[] {
  return rankPlacesForTourPreferences(places, preferences, { origin });
}

export function buildNativePersonalizedTour(input: Readonly<{
  places: readonly PublicPlaceCard[];
  preferences: NativeTourPreferences;
  timeBudgetMinutes: unknown;
  origin: PublicPlaceCard["coordinates"];
}>): NativeTourResult {
  return buildPersonalizedTour(input);
}

export function formatNativeDistance(distanceMeters: number, locale: string): string {
  return formatDistance(distanceMeters, locale) ?? "";
}
