import { proposeAddedStop } from "@citywalk/traveler-core/walkJourney";
import { isEligibleTourPlace } from "@citywalk/traveler-core";
import type { PublicPlaceCard } from "./api/contracts";
import { createMobileTripId } from "./tripNavigation";
import { changeCurrentWalk, type CurrentWalk, type WalkStore } from "./walkStorage";

export function isInWalk(current: CurrentWalk | undefined, slug: string): boolean {
  return Boolean(current && [...current.journey.visited, ...current.journey.remaining].includes(slug));
}
export async function addPlaceToCurrentWalk(city: string, slug: string, places: readonly PublicPlaceCard[], store?: WalkStore) {
  return changeCurrentWalk(city, current => {
    if (isInWalk(current, slug)) return current!;
    const candidate = places.find(place => place.slug === slug);
    if (!candidate || !isEligibleTourPlace(candidate)) throw new Error("walk-ineligible");
    if (!current) {
      if (candidate.durationMinutes > 120) throw new Error("walk-budget");
      return { phase: "preview", journey: {
        id: createMobileTripId("walk"), citySlug: city, remaining: [slug], visited: [],
        settings: { minutes: 120, interests: ["history", "architecture"], walking: "balanced", start: candidate.coordinates },
        position: candidate.coordinates, startedAt: Date.now(), historyDistance: 0,
      } };
    }
    const journey = current.journey;
    const remaining = journey.remaining.map(id => places.find(place => place.slug === id));
    if (remaining.some(place => !place)) throw new Error("walk-content-unavailable");
    const route = proposeAddedStop(remaining as PublicPlaceCard[], candidate, journey.visited,
      journey.settings, journey.position, journey.finish,
      current.phase === "preview" ? Date.now() : journey.startedAt);
    if (!route) throw new Error("walk-budget");
    return { ...current, journey: { ...journey, remaining: route.places.map(place => place.slug) } };
  }, store);
}
export async function removePlaceFromCurrentWalk(city: string, slug: string, store?: WalkStore) {
  return changeCurrentWalk(city, current => {
    if (!current) throw new Error("walk-missing");
    return { ...current, journey: { ...current.journey,
      remaining: current.journey.remaining.filter(id => id !== slug),
      visited: current.journey.visited.filter(id => id !== slug),
    } };
  }, store);
}
