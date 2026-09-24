import { calculateDistanceMeters, estimateWalkingMinutes } from "./distance";
import { buildPersonalizedTour, type TourBuilderPlace } from "./tourBuilder";
import type { TourPreferences } from "./tourPreferences";
export type Point = { lat: number; lng: number };
export const interestTags = {
  history: ["history"],
  architecture: ["architecture"],
  "hidden-gems": ["hidden-gem"],
  nature: ["nature", "park", "garden"],
  food: ["food", "cafe", "restaurant", "local-food"],
  culture: ["culture", "museum", "art"],
  family: ["family"],
} as const;
export type Interest = keyof typeof interestTags;
export type WalkSettings = {
  minutes: number;
  deadline?: number;
  start: Point;
  finish?: Point;
  interests: Interest[];
  categories?: string[];
  walking: "easy" | "balanced" | "long";
};
export type WalkRoute<T extends TourBuilderPlace> = {
  places: T[];
  distance: number;
  walkingMinutes: number;
  visitMinutes: number;
  minutes: number;
  finish: Point | undefined;
};
export function interestScore(place: TourBuilderPlace, interests: Interest[]) {
  return interests.reduce(
    (score, key) =>
      score +
      Number(interestTags[key].some((tag) => place.tags?.includes(tag))),
    0,
  );
}
export function measureWalk<T extends TourBuilderPlace>(
  places: T[],
  start: Point,
  finish?: Point,
): WalkRoute<T> {
  let current = start,
    distance = 0,
    walkingMinutes = 0,
    visitMinutes = 0;
  for (const point of [
    ...places.map((place) => place.coordinates),
    ...(finish ? [finish] : []),
  ]) {
    const leg = calculateDistanceMeters(current, point);
    if (leg === undefined) throw new Error("Invalid route coordinates");
    distance += leg;
    walkingMinutes += estimateWalkingMinutes(leg) ?? 0;
    current = point;
  }
  for (const place of places) visitMinutes += place.durationMinutes;
  return {
    places,
    distance,
    walkingMinutes,
    visitMinutes,
    minutes: visitMinutes + walkingMinutes,
    finish,
  };
}
export function buildWalk<T extends TourBuilderPlace>(
  places: readonly T[],
  settings: WalkSettings,
  now = Date.now(),
): WalkRoute<T> {
  const budget = settings.deadline
    ? Math.floor((settings.deadline - now) / 60000)
    : settings.minutes;
  if (budget === 0 && settings.deadline && settings.deadline > now)
    return measureWalk([], settings.start, settings.finish);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 1440)
    throw new Error("Invalid time budget");
  const legacyInterests = settings.interests.filter(
    (key): key is TourPreferences["interests"][number] =>
      ["history", "architecture", "hidden-gems", "family"].includes(key),
  );
  // Reuse the canonical eligibility and ranking algorithm; allow an exact budget
  // and reserve the finish leg before accepting each candidate.
  const ordered = [...places].sort(
    (a, b) =>
      interestScore(b, settings.interests) -
      interestScore(a, settings.interests),
  );
  const result = buildPersonalizedTour({
    places: ordered,
    preferences: {
      interests: legacyInterests,
      walkingPreference:
        settings.walking === "easy" ? "less-walking" : "standard",
    },
    timeBudgetMinutes: 180,
    planningBudgetMinutes: budget,
    origin: settings.start,
    finish: settings.finish,
    additionalInterestTags: [
      ...(settings.categories ?? []),
      ...settings.interests
        .filter((key) => !legacyInterests.some((interest) => interest === key))
        .flatMap((key) => [...interestTags[key]]),
    ],
  });
  let selected = result.stops.map((stop) => stop.place);
  if (settings.walking === "easy") {
    // A shorter walking cap is a real preference, not just a visual toggle.
    while (
      selected.length &&
      measureWalk(selected, settings.start, settings.finish).walkingMinutes >
        Math.min(35, budget / 3)
    )
      selected = selected.slice(0, -1);
  } else if (settings.walking === "balanced") {
    while (
      selected.length &&
      measureWalk(selected, settings.start, settings.finish).walkingMinutes >
        budget / 2
    )
      selected = selected.slice(0, -1);
  }
  return measureWalk(selected, settings.start, settings.finish);
}
export function deadlineForToday(
  value: string,
  now = new Date(),
): number | undefined {
  // Native Arabic keyboards may enter Arabic-Indic digits; browser time inputs
  // already normalize them. Accept the same clock value on every platform.
  value = value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)));
  if (!/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return undefined;
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return target.getTime() > now.getTime() ? target.getTime() : undefined;
}
