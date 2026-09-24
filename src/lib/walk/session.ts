import { readSavedWalks } from "./storage";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import { isEligibleTourPlace } from "@/lib/tourBuilder";
import { measureWalk, type Point, type WalkSettings } from "./planner";
export type JourneySession = {
  citySlug: string;
  cityName: string;
  generatedAt: number;
  settings: WalkSettings;
  remaining: string[];
  visited: string[];
  position: Point;
  historyDistance: number;
  startedAt: number;
  finish?: Point;
};
const validPoint = (value: unknown): value is Point =>
  !!value &&
  typeof value === "object" &&
  "lat" in value &&
  "lng" in value &&
  typeof value.lat === "number" &&
  typeof value.lng === "number" &&
  Number.isFinite(value.lat) &&
  Number.isFinite(value.lng) &&
  Math.abs(value.lat) <= 90 &&
  Math.abs(value.lng) <= 180;
export function readJourney(
  citySlug: string,
  places: readonly DiscoveryPlace[],
): JourneySession | undefined {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("citywalk:v2:active") ?? "null",
    );
    if (
      !value ||
      value.citySlug !== citySlug ||
      typeof value.cityName !== "string" ||
      !Number.isFinite(value.generatedAt) ||
      !Number.isFinite(value.startedAt) ||
      !Number.isFinite(value.historyDistance) ||
      !validPoint(value.position) ||
      !value.settings ||
      !validPoint(value.settings.start) ||
      (value.finish && !validPoint(value.finish)) ||
      (value.settings.finish && !validPoint(value.settings.finish))
    )
      return;
    if (
      !Number.isFinite(value.settings.minutes) ||
      value.settings.minutes <= 0 ||
      value.settings.minutes > 1440 ||
      (value.settings.deadline && !Number.isFinite(value.settings.deadline)) ||
      !["easy", "balanced", "long"].includes(value.settings.walking) ||
      !Array.isArray(value.settings.interests) ||
      !value.settings.interests.every(
        (key: unknown) =>
          typeof key === "string" &&
          [
            "history",
            "architecture",
            "hidden-gems",
            "nature",
            "food",
            "culture",
            "family",
          ].includes(key),
      )
    )
      return;
    if (
      !Array.isArray(value.remaining) ||
      !Array.isArray(value.visited) ||
      ![...value.remaining, ...value.visited].every(
        (slug: unknown) =>
          typeof slug === "string" &&
          places.some((place) => place.slug === slug),
      ) ||
      !value.remaining.every((slug: string) =>
        isEligibleTourPlace(places.find((place) => place.slug === slug)!),
      )
    )
      return;
    return value as JourneySession;
  } catch {
    return;
  }
}
export function restoredRoute(
  session: JourneySession,
  places: readonly DiscoveryPlace[],
) {
  return measureWalk(
    session.remaining.map((slug) =>
      places.find((place) => place.slug === slug)!,
    ),
    session.position,
    session.finish,
  );
}

export function readSavedRoute(
  citySlug: string,
  places: readonly DiscoveryPlace[],
) {
  const id = new URLSearchParams(window.location.search).get("walk");
  const saved = readSavedWalks().find(
    (walk) => walk.id === id && walk.citySlug === citySlug,
  );
  if (
    !saved?.settings ||
    !validPoint(saved.settings.start) ||
    (saved.settings.finish && !validPoint(saved.settings.finish)) ||
    !Number.isFinite(saved.settings.minutes) ||
    !Array.isArray(saved.settings.interests) ||
    !saved.settings.interests.every((key) =>
      [
        "history",
        "architecture",
        "hidden-gems",
        "nature",
        "food",
        "culture",
        "family",
      ].includes(key),
    ) ||
    !["easy", "balanced", "long"].includes(saved.settings.walking)
  )
    return;
  const selected = saved.placeSlugs.flatMap(
    (slug) =>
      places.find(
        (place) => place.slug === slug && isEligibleTourPlace(place),
      ) ?? [],
  );
  if (!selected.length) return;
  // A saved walk is a reusable route; yesterday's deadline is not reused.
  return {
    route: measureWalk(selected, saved.settings.start, saved.settings.finish),
    settings: { ...saved.settings, deadline: undefined },
    generatedAt: Date.now(),
  };
}
