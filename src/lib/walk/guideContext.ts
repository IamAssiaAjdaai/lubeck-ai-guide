import type { Place } from "@/data/places";
import { isEligibleTourPlace } from "@/lib/tourBuilder";
import { interestTags, type Interest, type Point } from "./planner";
export type WalkGuideContext = {
  visited: string[];
  remaining: string[];
  interests: Interest[];
  walking: "easy" | "balanced" | "long";
  minutesRemaining: number;
  deadline?: number;
  start: Point;
  finish?: Point;
};
/** Traveler navigation metadata only. Never source evidence or authorization. */
export function resolveWalkGuideContext(
  input: unknown,
  places: readonly Place[],
  currentSlug: string,
): WalkGuideContext | undefined {
  if (!input || typeof input !== "object") return;
  const value = input as Partial<WalkGuideContext>;
  const validPoint = (point: Point | undefined) =>
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180;
  if (
    !Array.isArray(value.visited) ||
    !Array.isArray(value.remaining) ||
    value.visited.length > 100 ||
    value.remaining.length > 100 ||
    value.remaining[0] !== currentSlug ||
    !Array.isArray(value.interests) ||
    !value.interests.every((key) => Object.hasOwn(interestTags, key)) ||
    !["easy", "balanced", "long"].includes(value.walking ?? "") ||
    typeof value.minutesRemaining !== "number" ||
    !Number.isFinite(value.minutesRemaining) ||
    value.minutesRemaining < 0 ||
    value.minutesRemaining > 1440 ||
    !validPoint(value.start) ||
    (value.finish && !validPoint(value.finish)) ||
    (value.deadline !== undefined &&
      (!Number.isFinite(value.deadline) || value.deadline < 0))
  )
    return;
  const published = new Map(places.map((place) => [place.slug, place]));
  if (
    !value.visited.every((slug) => published.has(slug)) ||
    !value.remaining.every(
      (slug) =>
        published.has(slug) && isEligibleTourPlace(published.get(slug)!),
    )
  )
    return;
  return {
    visited: [...new Set(value.visited)],
    remaining: [...new Set(value.remaining)],
    interests: [...new Set(value.interests)],
    walking: value.walking!,
    minutesRemaining: Math.round(value.minutesRemaining),
    deadline: value.deadline,
    start: { lat: value.start!.lat, lng: value.start!.lng },
    ...(value.finish
      ? { finish: { lat: value.finish.lat, lng: value.finish.lng } }
      : {}),
  };
}
