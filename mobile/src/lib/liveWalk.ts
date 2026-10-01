import {
  calculateDistanceMeters,
  estimateWalkingMinutes,
} from "@citywalk/traveler-core";
import type { Point } from "@citywalk/traveler-core/walkPlanner";

export const LIVE_WALK_MIN_MOVEMENT_METERS = 25;
export const LIVE_WALK_MIN_UPDATE_MS = 20_000;
export const LIVE_WALK_STATIONARY_REFRESH_MS = 60_000;
export const LIVE_WALK_MAX_LOCATION_AGE_MS = 2 * 60_000;
export const LIVE_WALK_MAX_ACCURACY_METERS = 150;
export const LIVE_WALK_ALMOST_THERE_METERS = 200;
export const LIVE_WALK_ARRIVAL_METERS = 55;
export const LIVE_WALK_ARRIVAL_EXIT_METERS = 90;
export const LIVE_WALK_ARRIVAL_SAMPLES = 2;

export type LiveWalkDisplayState =
  | "normal"
  | "almost_there"
  | "arrived"
  | "route_updated"
  | "take_back";

export type LiveWalkProximityState = "normal" | "almost_there" | "arrived";

export type LiveWalkProximity = Readonly<{
  state: LiveWalkProximityState;
  arrivalSamples: number;
}>;

export type LiveWalkRouteStop = Readonly<{
  slug: string;
  name: string;
  point: Point;
  durationMinutes: number;
  storyReady: boolean;
}>;

export type LiveWalkFinish = Readonly<{
  name: string;
  point: Point;
}>;

export type LiveWalkTiming = Readonly<{
  baseline: "duration_budget" | "explicit_deadline";
  startedAtUtc: string;
  observedAtUtc: string;
  plannedMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  budgetEndUtc: string;
  deadlineUtc: string | null;
  projectedFinishUtc: string;
  baselineSlackMinutes: number;
  scheduleSlackMinutes?: number;
  schedule: "ahead" | "on_schedule" | "behind" | null;
}>;

export type CitywalkLiveActivityProps = Readonly<{
  cityLabel: string;
  state: LiveWalkDisplayState;
  stateLabel: string;
  destination: string;
  distanceEta?: string;
  storyLabel?: string;
  progress: number;
  progressLabel: string;
  remainingLabel: string;
  finishLabel: string;
  deadlineLabel?: string;
  scheduleLabel?: string;
  compactEta: string;
}>;

export function formatLiveWalkDistance(meters: number): string {
  const safe = Math.max(0, Number.isFinite(meters) ? meters : 0);
  if (safe < 1000) return Math.round(safe) + " m";
  return (safe / 1000).toFixed(1).replace(/\.0$/, "") + " km";
}

export function formatLiveWalkDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  if (safe < 60) return safe + " min";
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  return remainder ? hours + " h " + remainder + " min" : hours + " h";
}

export function formatLiveWalkClock(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function estimateLiveWalkRemainingMinutes(
  origin: Point,
  stops: readonly LiveWalkRouteStop[],
  finish?: LiveWalkFinish,
): number {
  let current = origin;
  let total = 0;

  for (const stop of stops) {
    const meters = calculateDistanceMeters(current, stop.point);
    if (meters === undefined) continue;
    total += estimateWalkingMinutes(meters) ?? 0;
    total += Math.max(0, stop.durationMinutes);
    current = stop.point;
  }

  if (finish) {
    const meters = calculateDistanceMeters(current, finish.point);
    if (meters !== undefined) total += estimateWalkingMinutes(meters) ?? 0;
  }

  return Math.max(0, Math.round(total));
}

export function deriveLiveWalkTiming(input: Readonly<{
  startedAt: number;
  plannedMinutes: number;
  observedAt: number;
  remainingMinutes: number;
  deadline?: number;
}>): LiveWalkTiming {
  const plannedMinutes = Math.max(1, Math.round(input.plannedMinutes));
  const remainingMinutes = Math.max(0, Math.round(input.remainingMinutes));
  const budgetEnd = input.startedAt + plannedMinutes * 60_000;
  const projectedFinish = input.observedAt + remainingMinutes * 60_000;
  const baselineEnd = input.deadline ?? budgetEnd;
  const baselineSlackMinutes = Math.round(
    (baselineEnd - projectedFinish) / 60_000,
  );
  const scheduleSlackMinutes = input.deadline === undefined
    ? undefined
    : Math.round((input.deadline - projectedFinish) / 60_000);
  const schedule = scheduleSlackMinutes === undefined
    ? null
    : scheduleSlackMinutes > 5
      ? "ahead"
      : scheduleSlackMinutes < -5
        ? "behind"
        : "on_schedule";

  return {
    baseline: input.deadline === undefined
      ? "duration_budget"
      : "explicit_deadline",
    startedAtUtc: new Date(input.startedAt).toISOString(),
    observedAtUtc: new Date(input.observedAt).toISOString(),
    plannedMinutes,
    elapsedMinutes: (input.observedAt - input.startedAt) / 60_000,
    remainingMinutes,
    budgetEndUtc: new Date(budgetEnd).toISOString(),
    deadlineUtc: input.deadline === undefined
      ? null
      : new Date(input.deadline).toISOString(),
    projectedFinishUtc: new Date(projectedFinish).toISOString(),
    baselineSlackMinutes,
    ...(scheduleSlackMinutes === undefined ? {} : { scheduleSlackMinutes }),
    schedule,
  };
}

export function updateLiveWalkProximity(
  distanceMeters: number,
  previous: LiveWalkProximity = { state: "normal", arrivalSamples: 0 },
): LiveWalkProximity {
  const distance = Math.max(0, distanceMeters);

  if (
    previous.state === "arrived" &&
    distance <= LIVE_WALK_ARRIVAL_EXIT_METERS
  ) {
    return previous;
  }

  const arrivalSamples = distance <= LIVE_WALK_ARRIVAL_METERS
    ? previous.arrivalSamples + 1
    : distance > LIVE_WALK_ARRIVAL_EXIT_METERS
      ? 0
      : previous.arrivalSamples;

  if (arrivalSamples >= LIVE_WALK_ARRIVAL_SAMPLES) {
    return { state: "arrived", arrivalSamples };
  }

  return {
    state: distance <= LIVE_WALK_ALMOST_THERE_METERS
      ? "almost_there"
      : "normal",
    arrivalSamples,
  };
}

export function isLiveWalkLocationUsable(input: Readonly<{
  timestamp: number;
  accuracy?: number | null;
  now?: number;
}>): boolean {
  const now = input.now ?? Date.now();
  const age = Math.max(0, now - input.timestamp);
  const accuracy = input.accuracy;
  return age <= LIVE_WALK_MAX_LOCATION_AGE_MS &&
    (accuracy == null ||
      (Number.isFinite(accuracy) &&
        accuracy >= 0 &&
        accuracy <= LIVE_WALK_MAX_ACCURACY_METERS));
}

export function shouldPublishLiveWalkLocation(input: Readonly<{
  previous?: Readonly<{ point: Point; at: number }>;
  next: Point;
  now: number;
  stateChanged?: boolean;
}>): boolean {
  if (input.stateChanged || !input.previous) return true;

  const elapsed = input.now - input.previous.at;
  if (elapsed >= LIVE_WALK_STATIONARY_REFRESH_MS) return true;
  if (elapsed < LIVE_WALK_MIN_UPDATE_MS) return false;

  const movement = calculateDistanceMeters(input.previous.point, input.next) ?? 0;
  return movement >= LIVE_WALK_MIN_MOVEMENT_METERS;
}

export function liveWalkDistanceAndEta(
  origin: Point,
  target: Point,
): Readonly<{ distanceMeters: number; etaMinutes: number }> {
  const distanceMeters = calculateDistanceMeters(origin, target) ?? 0;
  const etaMinutes = Math.max(
    0,
    Math.round(estimateWalkingMinutes(distanceMeters) ?? 0),
  );
  return { distanceMeters, etaMinutes };
}
