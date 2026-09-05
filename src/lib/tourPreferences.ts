import { HIDDEN_GEM_TAG } from "@/data/places";
import {
  calculateDistanceMeters,
  type GeographicCoordinates,
} from "@/lib/distance";

export const TOUR_INTERESTS = [
  "history",
  "architecture",
  "hidden-gems",
  "family",
] as const;

export const WALKING_PREFERENCES = [
  "standard",
  "less-walking",
] as const;

export type TourInterest =
  (typeof TOUR_INTERESTS)[number];
export type WalkingPreference =
  (typeof WALKING_PREFERENCES)[number];

export type TourPreferences = Readonly<{
  interests: readonly TourInterest[];
  walkingPreference: WalkingPreference;
}>;

export const DEFAULT_TOUR_PREFERENCES = {
  interests: [],
  walkingPreference: "standard",
} as const satisfies TourPreferences;

export const TOUR_INTEREST_TAGS = {
  history: "history",
  architecture: "architecture",
  "hidden-gems": HIDDEN_GEM_TAG,
  family: "family",
} as const satisfies Readonly<
  Record<TourInterest, string>
>;

export type RankablePreferencePlace = Readonly<{
  tags?: readonly string[];
  coordinates: GeographicCoordinates;
}>;

export type TourPreferenceRankingOptions =
  Readonly<{
    origin?: GeographicCoordinates;
  }>;

export function isTourInterest(
  value: unknown,
): value is TourInterest {
  return TOUR_INTERESTS.some(
    (interest) => interest === value,
  );
}

export function isWalkingPreference(
  value: unknown,
): value is WalkingPreference {
  return WALKING_PREFERENCES.some(
    (preference) => preference === value,
  );
}

export function parseTourPreferences(
  value: unknown,
): TourPreferences {
  const rawInterests =
    typeof value === "object" &&
    value !== null &&
    "interests" in value
      ? value.interests
      : undefined;

  if (
    typeof value !== "object" ||
    value === null ||
    !("interests" in value) ||
    !("walkingPreference" in value) ||
    !Array.isArray(rawInterests) ||
    !rawInterests.every(isTourInterest) ||
    !isWalkingPreference(
      value.walkingPreference,
    )
  ) {
    return DEFAULT_TOUR_PREFERENCES;
  }

  return {
    interests: TOUR_INTERESTS.filter(
      (interest) =>
        rawInterests.includes(interest),
    ),
    walkingPreference:
      value.walkingPreference,
  };
}

export function countTourInterestMatches(
  place: RankablePreferencePlace,
  interests: readonly TourInterest[],
): number {
  return interests.reduce(
    (matches, interest) =>
      matches +
      Number(
        place.tags?.includes(
          TOUR_INTEREST_TAGS[interest],
        ) ?? false,
      ),
    0,
  );
}

export function rankPlacesForTourPreferences<
  TPlace extends RankablePreferencePlace,
>(
  places: readonly TPlace[],
  preferences: TourPreferences,
  options: TourPreferenceRankingOptions = {},
): readonly TPlace[] {
  const applyDistance =
    preferences.walkingPreference ===
      "less-walking" &&
    Boolean(options.origin);

  return places
    .map((place, originalIndex) => ({
      place,
      originalIndex,
      interestMatches: countTourInterestMatches(
        place,
        preferences.interests,
      ),
      distanceMeters:
        applyDistance && options.origin
          ? calculateDistanceMeters(
              options.origin,
              place.coordinates,
            )
          : undefined,
    }))
    .sort((first, second) => {
      const matchDifference =
        second.interestMatches -
        first.interestMatches;

      if (matchDifference !== 0) {
        return matchDifference;
      }

      if (applyDistance) {
        const firstDistance =
          first.distanceMeters ??
          Number.POSITIVE_INFINITY;
        const secondDistance =
          second.distanceMeters ??
          Number.POSITIVE_INFINITY;
        const distanceDifference =
          firstDistance - secondDistance;

        if (distanceDifference !== 0) {
          return distanceDifference;
        }
      }

      return (
        first.originalIndex -
        second.originalIndex
      );
    })
    .map(({ place }) => place);
}
