import { isEligibleTourPlace, type SavedRoute } from "@citywalk/traveler-core";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Point, WalkSettings } from "@/lib/walk/planner";

const same = (a: Point, b: Point) => a.lat === b.lat && a.lng === b.lng;

/**
 * Share a replayable public itinerary, not visited history or personal GPS.
 * Start at the first published stop, never at the sender's live/custom origin.
 * Keep an optional finish only when it matches a published eligible place.
 */
export function createFinishedShareRoute({
  citySlug, stopSlugs, places, settings, finish,
}: {
  citySlug: string;
  stopSlugs: readonly string[];
  places: readonly DiscoveryPlace[];
  settings: WalkSettings;
  finish?: Point;
}): SavedRoute | undefined {
  if (!/^[a-z0-9-]{1,100}$/.test(citySlug) || !stopSlugs.length || stopSlugs.length > 30 ||
      new Set(stopSlugs).size !== stopSlugs.length) return;
  const publicPlaces = places.filter(isEligibleTourPlace);
  const lookup = new Map(publicPlaces.map(place => [place.slug, place] as const));
  const selected = stopSlugs.map(slug => lookup.get(slug));
  if (selected.some(place => !place)) return;
  const start = selected[0]!.coordinates;
  const publicFinish = finish && publicPlaces.some(place => same(place.coordinates, finish))
    ? { lat: finish.lat, lng: finish.lng } : undefined;
  return {
    citySlug,
    stopSlugs: [...stopSlugs],
    settings: {
      minutes: settings.minutes,
      start: { lat: start.lat, lng: start.lng },
      interests: [...settings.interests],
      walking: settings.walking,
      ...(settings.categories ? { categories: [...settings.categories] } : {}),
      ...(publicFinish ? { finish: publicFinish } : {}),
    },
    ...(publicFinish ? { finish: publicFinish } : {}),
  };
}
