import type { TourBuilderPlace } from "./tourBuilder";
import { isEligibleTourPlace } from "./tourBuilder";
import { interestTags, type Interest, type Point } from "./walkPlanner";
export type WalkGuideContext = {
  visited: string[];
  remaining: string[];
  interests: Interest[];
  categories?: string[];
  walking: "easy" | "balanced" | "long";
  minutesRemaining: number;
  deadline?: number;
  start: Point;
  finish?: Point;
};
/** Traveler navigation metadata only. Never source evidence or authorization. */
export function resolveWalkGuideContext(
  input: unknown,
  places: readonly TourBuilderPlace[],
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
    (value.categories !== undefined &&
      (!Array.isArray(value.categories) ||
        value.categories.length > 50 ||
        !value.categories.every(
          (tag) =>
            typeof tag === "string" &&
            places.some((p) => p.tags?.includes(tag)),
        ))) ||
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
    ...(value.categories?.length
      ? { categories: [...new Set(value.categories)] }
      : {}),
    walking: value.walking!,
    minutesRemaining: Math.round(value.minutesRemaining),
    deadline: value.deadline,
    start: { lat: value.start!.lat, lng: value.start!.lng },
    ...(value.finish
      ? { finish: { lat: value.finish.lat, lng: value.finish.lng } }
      : {}),
  };
}

/** Used by all clients; city and current stop travel in the guide request envelope. */
export function buildWalkGuideContext(input: {
  visited: readonly { slug: string }[];
  remaining: readonly { slug: string }[];
  settings: import("./walkPlanner").WalkSettings;
  minutesRemaining: number;
  finish?: Point;
}): WalkGuideContext {
  return {
    visited: input.visited.map(({ slug }) => slug),
    remaining: input.remaining.map(({ slug }) => slug),
    interests: [...input.settings.interests],
    ...(input.settings.categories?.length
      ? { categories: [...input.settings.categories] }
      : {}),
    walking: input.settings.walking,
    minutesRemaining: Math.max(
      0,
      Math.min(1440, Math.round(input.minutesRemaining)),
    ),
    deadline: input.settings.deadline,
    start: input.settings.start,
    finish: input.finish,
  };
}
