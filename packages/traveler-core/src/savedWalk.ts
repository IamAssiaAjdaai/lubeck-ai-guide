import { isWalkJourney, type WalkJourney } from "./walkJourney";
import type { WalkSettings, Point } from "./walkPlanner";

export function savedRouteIdentity(journey: Pick<WalkJourney, "citySlug" | "visited" | "remaining" | "finish">) {
  return JSON.stringify([journey.citySlug, [...new Set([...journey.visited, ...journey.remaining])],
    journey.finish ? [journey.finish.lat, journey.finish.lng] : null]);
}
export type SavedRoute = { citySlug: string; stopSlugs: string[]; settings: WalkSettings; finish?: Point };
export type AccountSavedWalk = { id: string; route: SavedRoute; createdAt: string; updatedAt: string };
const point = (p: Point): Point => ({ lat: p.lat, lng: p.lng });
// Explicit projection: never upload progress, current GPS, session IDs, deadline or unknown fields.
export function savedRouteFromJourney(value: unknown): SavedRoute | undefined {
  if (!isWalkJourney(value)) return;
  const stopSlugs = [...new Set([...value.visited, ...value.remaining])];
  if (!/^[a-z0-9-]{1,100}$/.test(value.citySlug) || !stopSlugs.length || stopSlugs.length > 100 ||
      stopSlugs.some(slug => !/^[a-z0-9-]{1,150}$/.test(slug))) return;
  const finish = value.finish ? point(value.finish) : undefined;
  return { citySlug: value.citySlug, stopSlugs, finish, settings: {
    minutes: value.settings.minutes, start: point(value.settings.start), finish,
    interests: [...value.settings.interests], walking: value.settings.walking,
    ...(value.settings.categories ? { categories: value.settings.categories.filter(c => typeof c === "string" && c.length <= 100).slice(0, 20) } : {}),
  } };
}
export function accountSavedJourney(record: AccountSavedWalk): WalkJourney {
  return { id: record.id, citySlug: record.route.citySlug, settings: record.route.settings,
    finish: record.route.finish, remaining: [...record.route.stopSlugs], visited: [],
    position: record.route.settings.start, historyDistance: 0, startedAt: 0 };
}
export function parseSavedRoute(value: unknown): SavedRoute | undefined {
  if (!value || typeof value !== "object") return;
  const r = value as SavedRoute;
  return savedRouteFromJourney({ id: "validate", citySlug: r.citySlug, settings: r.settings,
    finish: r.finish, remaining: r.stopSlugs, visited: [], position: r.settings?.start, historyDistance: 0, startedAt: 0 });
}
