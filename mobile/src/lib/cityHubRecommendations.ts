import { interestScore, type Interest } from "@citywalk/traveler-core/walkPlanner";
import type { PublicPlaceCard, PublicTour } from "./api/contracts";

/** Rank published tours using the planner's canonical interest tags. No synthetic tours or metadata. */
export function cityHubRecommendations(tours: readonly PublicTour[], places: readonly PublicPlaceCard[], interests: readonly Interest[] = []): readonly PublicTour[] {
  if (!interests.length) return tours;
  const score = (tour: PublicTour) => places
    .filter(place => tour.stops.some(stop => stop.placeSlug === place.slug))
    .reduce((total, place) => total + interestScore(place, [...interests]), 0);
  return [...tours].sort((a, b) => score(b) - score(a));
}
