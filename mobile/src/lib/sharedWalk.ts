import { isEligibleTourPlace, parseSavedRoute, type SavedRoute } from "@citywalk/traveler-core";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "./api/contracts";

export const SHARE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NativeSharedWalk = Readonly<{ version: 1; route: SavedRoute }>;

export function parseNativeSharedWalk(value: unknown): NativeSharedWalk | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const data = value as { version?: unknown; route?: unknown };
  if (data.version !== 1) return;
  const route = parseSavedRoute(data.route);
  if (!route || route.stopSlugs.length < 1 || route.stopSlugs.length > 30 ||
      new Set(route.stopSlugs).size !== route.stopSlugs.length) return;
  return { version: 1, route };
}

/** Anonymous GET: no session cookie or device identifier leaves the phone. */
export async function fetchNativeSharedWalk(
  id: string, origin: string, fetchImpl: typeof fetch = fetch, signal?: AbortSignal,
): Promise<NativeSharedWalk> {
  if (!SHARE_ID.test(id)) throw new Error("Invalid share ID");
  const response = await fetchImpl(new URL("/api/shared-walks/" + id, origin), {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Shared walk unavailable");
  const result = parseNativeSharedWalk(await response.json());
  if (!result) throw new Error("Invalid shared walk response");
  return result;
}

const same = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  a.lat === b.lat && a.lng === b.lng;

/**
 * Never run the itinerary planner for a received share: preserve every stop
 * exactly and fail closed when the public content changed.
 */
export function sharedWalkToNativeJourney(
  shared: NativeSharedWalk, places: readonly PublicPlaceCard[], id: string, startedAt = Date.now(),
): WalkJourney | undefined {
  const route = shared.route;
  const eligible = new Map(places.filter(isEligibleTourPlace).map(place => [place.slug, place]));
  const first = eligible.get(route.stopSlugs[0]);
  if (!first || !same(first.coordinates, route.settings.start) ||
      route.stopSlugs.some(slug => !eligible.has(slug))) return;
  if (route.finish && ![...eligible.values()].some(p => same(p.coordinates, route.finish!))) return;
  return {
    id,
    citySlug: route.citySlug,
    settings: {
      minutes: route.settings.minutes,
      start: { ...first.coordinates },
      walking: route.settings.walking,
      interests: [...route.settings.interests],
      ...(route.settings.categories ? { categories: [...route.settings.categories] } : {}),
      ...(route.finish ? { finish: { ...route.finish } } : {}),
    },
    remaining: [...route.stopSlugs],
    visited: [],
    position: { ...first.coordinates },
    ...(route.finish ? { finish: { ...route.finish } } : {}),
    historyDistance: 0,
    startedAt,
  };
}

/** Native Finish Walk link must use a public origin and original planned order. */
export function nativeFinishedShareRoute(
  journey: WalkJourney, stopSlugs: readonly string[], places: readonly PublicPlaceCard[],
): SavedRoute | undefined {
  if (!stopSlugs.length || stopSlugs.length > 30 ||
      new Set(stopSlugs).size !== stopSlugs.length) return;
  const eligible = new Map(places.filter(isEligibleTourPlace).map(place => [place.slug, place]));
  const first = eligible.get(stopSlugs[0]);
  if (!first || stopSlugs.some(slug => !eligible.has(slug))) return;
  const finish = journey.finish && [...eligible.values()].some(p => same(p.coordinates, journey.finish!))
    ? { ...journey.finish } : undefined;
  return {
    citySlug: journey.citySlug,
    stopSlugs: [...stopSlugs],
    settings: {
      minutes: journey.settings.minutes,
      start: { ...first.coordinates },
      interests: [...journey.settings.interests],
      walking: journey.settings.walking,
      ...(journey.settings.categories ? { categories: [...journey.settings.categories] } : {}),
      ...(finish ? { finish } : {}),
    },
    ...(finish ? { finish } : {}),
  };
}
