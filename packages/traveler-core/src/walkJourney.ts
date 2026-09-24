import { calculateDistanceMeters } from "./distance";
import { isEligibleTourPlace, type TourBuilderPlace } from "./tourBuilder";
import {
  buildWalk,
  measureWalk,
  type Point,
  type WalkSettings,
} from "./walkPlanner";

export type WalkJourney = {
  id: string;
  citySlug: string;
  settings: WalkSettings;
  remaining: string[];
  visited: string[];
  position: Point;
  finish?: Point;
  historyDistance: number;
  startedAt: number;
  finishedAt?: number;
};
export function remainingWalkBudget(
  settings: WalkSettings,
  startedAt: number,
  now = Date.now(),
) {
  return Math.max(
    0,
    Math.floor(
      ((settings.deadline ?? startedAt + settings.minutes * 60000) - now) /
        60000,
    ),
  );
}
export function proposeShorterWalk<T extends TourBuilderPlace>(
  places: T[],
  settings: WalkSettings,
  origin: Point,
  finish?: Point,
  now = Date.now(),
) {
  const remaining = measureWalk(places, origin, finish);
  const budget = Math.max(
    1,
    Math.min(
      Math.floor(remaining.minutes * 0.65),
      settings.deadline
        ? Math.floor((settings.deadline - now) / 60000)
        : Infinity,
    ),
  );
  return buildWalk(
    places,
    {
      ...settings,
      start: origin,
      finish,
      minutes: budget,
      deadline: undefined,
    },
    now,
  );
}
export function proposeAddedStop<T extends TourBuilderPlace>(
  places: T[],
  candidate: T,
  visited: readonly string[],
  settings: WalkSettings,
  origin: Point,
  finish: Point | undefined,
  startedAt: number,
  now = Date.now(),
) {
  if (
    !isEligibleTourPlace(candidate) ||
    visited.includes(candidate.slug) ||
    places.some((p) => p.slug === candidate.slug)
  )
    return;
  const route = measureWalk([...places, candidate], origin, finish);
  return route.minutes <= remainingWalkBudget(settings, startedAt, now)
    ? route
    : undefined;
}
export function advanceWalk(
  journey: WalkJourney,
  place: TourBuilderPlace,
  markVisited: boolean,
): WalkJourney {
  if (journey.remaining[0] !== place.slug) return journey;
  return {
    ...journey,
    remaining: journey.remaining.slice(1),
    visited: markVisited ? [...journey.visited, place.slug] : journey.visited,
    position: markVisited ? place.coordinates : journey.position,
    historyDistance:
      journey.historyDistance +
      (markVisited
        ? (calculateDistanceMeters(journey.position, place.coordinates) ?? 0)
        : 0),
  };
}
export function isWalkSettings(value: unknown): value is WalkSettings {
  if (!value || typeof value !== "object") return false;
  const s = value as WalkSettings;
  return (
    Number.isFinite(s.minutes) &&
    s.minutes > 0 &&
    s.minutes <= 1440 &&
    isWalkPoint(s.start) &&
    (!s.finish || isWalkPoint(s.finish)) &&
    (s.deadline === undefined || Number.isFinite(s.deadline)) &&
    ["easy", "balanced", "long"].includes(s.walking) &&
    Array.isArray(s.interests) &&
    s.interests.every((k) =>
      [
        "history",
        "architecture",
        "hidden-gems",
        "nature",
        "food",
        "culture",
        "family",
      ].includes(k),
    ) &&
    (s.categories === undefined ||
      (Array.isArray(s.categories) &&
        s.categories.length <= 50 &&
        s.categories.every((k) => typeof k === "string" && k.length <= 100)))
  );
}
export function isWalkPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const value = p as Point;
  return (
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180
  );
}
export function isWalkJourney(value: unknown): value is WalkJourney {
  if (!value || typeof value !== "object") return false;
  const j = value as WalkJourney;
  return (
    typeof j.id === "string" &&
    typeof j.citySlug === "string" &&
    isWalkSettings(j.settings) &&
    isWalkPoint(j.position) &&
    (!j.finish || isWalkPoint(j.finish)) &&
    Number.isFinite(j.startedAt) &&
    Number.isFinite(j.historyDistance) &&
    j.historyDistance >= 0 &&
    (j.finishedAt === undefined || Number.isFinite(j.finishedAt)) &&
    [j.remaining, j.visited].every(
      (a) =>
        Array.isArray(a) &&
        a.length <= 100 &&
        a.every(
          (s) => typeof s === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s),
        ),
    )
  );
}
