import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Point } from "@citywalk/traveler-core/walkPlanner";

import type {
  LiveWalkFinish,
  LiveWalkProximity,
  LiveWalkRouteStop,
} from "./liveWalk";

export const LIVE_WALK_STORAGE_KEY = "citywalk:live-walk:v1";
const VERSION = 1;

export type LiveWalkSession = Readonly<{
  version: typeof VERSION;
  enabled: boolean;
  journeyId: string;
  citySlug: string;
  cityName: string;
  locale: string;
  plannedMinutes: number;
  startedAt: number;
  deadline?: number;
  visitedCount: number;
  totalStops: number;
  stops: readonly LiveWalkRouteStop[];
  finish?: LiveWalkFinish;
  takeBack: boolean;
  routeSignature: string;
  routeUpdatedUntil?: number;
  proximity: LiveWalkProximity;
  lastPublished?: Readonly<{ point: Point; at: number }>;
}>;

type Store = Pick<
  typeof AsyncStorage,
  "getItem" | "setItem" | "removeItem"
>;

export function liveWalkRouteSignature(input: Readonly<{
  stops: readonly LiveWalkRouteStop[];
  finish?: LiveWalkFinish;
  takeBack: boolean;
}>): string {
  return JSON.stringify({
    stops: input.stops.map((stop) => stop.slug),
    finish: input.finish
      ? [input.finish.name, input.finish.point.lat, input.finish.point.lng]
      : null,
    takeBack: input.takeBack,
  });
}

export async function loadLiveWalkSession(
  store: Store = AsyncStorage,
): Promise<LiveWalkSession | undefined> {
  try {
    const raw = await store.getItem(LIVE_WALK_STORAGE_KEY);
    if (!raw) return undefined;
    return parseLiveWalkSession(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export async function saveLiveWalkSession(
  session: LiveWalkSession,
  store: Store = AsyncStorage,
): Promise<void> {
  await store.setItem(LIVE_WALK_STORAGE_KEY, JSON.stringify(session));
}

export async function clearLiveWalkSession(
  store: Store = AsyncStorage,
): Promise<void> {
  await store.removeItem(LIVE_WALK_STORAGE_KEY);
}

export async function syncLiveWalkSession(
  input: Omit<
    LiveWalkSession,
    | "version"
    | "enabled"
    | "routeSignature"
    | "routeUpdatedUntil"
    | "proximity"
    | "lastPublished"
  >,
  store: Store = AsyncStorage,
  now = Date.now(),
): Promise<LiveWalkSession> {
  const previous = await loadLiveWalkSession(store);
  const routeSignature = liveWalkRouteSignature(input);
  const sameJourney = previous?.journeyId === input.journeyId;
  const routeChanged = Boolean(
    sameJourney &&
      previous &&
      previous.routeSignature !== routeSignature,
  );

  const session: LiveWalkSession = {
    version: VERSION,
    ...input,
    enabled: sameJourney ? previous?.enabled ?? false : false,
    routeSignature,
    ...(routeChanged
      ? { routeUpdatedUntil: now + 60_000 }
      : sameJourney && previous?.routeUpdatedUntil
        ? { routeUpdatedUntil: previous.routeUpdatedUntil }
        : {}),
    proximity: sameJourney
      ? previous?.proximity ?? { state: "normal", arrivalSamples: 0 }
      : { state: "normal", arrivalSamples: 0 },
    ...(sameJourney && previous?.lastPublished
      ? { lastPublished: previous.lastPublished }
      : {}),
  };

  await saveLiveWalkSession(session, store);
  return session;
}

export async function setLiveWalkEnabled(
  enabled: boolean,
  store: Store = AsyncStorage,
): Promise<LiveWalkSession | undefined> {
  const session = await loadLiveWalkSession(store);
  if (!session) return undefined;
  const next = { ...session, enabled };
  await saveLiveWalkSession(next, store);
  return next;
}

export async function updateLiveWalkRuntime(
  input: Readonly<{
    proximity: LiveWalkProximity;
    lastPublished: Readonly<{ point: Point; at: number }>;
  }>,
  store: Store = AsyncStorage,
): Promise<LiveWalkSession | undefined> {
  const session = await loadLiveWalkSession(store);
  if (!session) return undefined;
  const next = {
    ...session,
    proximity: input.proximity,
    lastPublished: input.lastPublished,
  };
  await saveLiveWalkSession(next, store);
  return next;
}

function parseLiveWalkSession(value: unknown): LiveWalkSession | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const session = value as Partial<LiveWalkSession>;
  if (
    session.version !== VERSION ||
    typeof session.enabled !== "boolean" ||
    typeof session.journeyId !== "string" ||
    !session.journeyId ||
    typeof session.citySlug !== "string" ||
    typeof session.cityName !== "string" ||
    typeof session.locale !== "string" ||
    !Number.isFinite(session.plannedMinutes) ||
    !Number.isFinite(session.startedAt) ||
    !Number.isSafeInteger(session.visitedCount) ||
    !Number.isSafeInteger(session.totalStops) ||
    !Array.isArray(session.stops) ||
    typeof session.takeBack !== "boolean" ||
    typeof session.routeSignature !== "string" ||
    !session.proximity ||
    !isProximity(session.proximity)
  ) return;

  if (
    session.deadline !== undefined &&
    !Number.isFinite(session.deadline)
  ) return;
  if (
    session.routeUpdatedUntil !== undefined &&
    !Number.isFinite(session.routeUpdatedUntil)
  ) return;
  if (!session.stops.every(isStop)) return;
  if (session.finish && !isFinish(session.finish)) return;
  if (session.lastPublished && !isLastPublished(session.lastPublished)) return;

  return session as LiveWalkSession;
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const point = value as Point;
  return Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180;
}

function isStop(value: unknown): value is LiveWalkRouteStop {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const stop = value as LiveWalkRouteStop;
  return typeof stop.slug === "string" &&
    typeof stop.name === "string" &&
    isPoint(stop.point) &&
    Number.isFinite(stop.durationMinutes) &&
    stop.durationMinutes >= 0 &&
    typeof stop.storyReady === "boolean";
}

function isFinish(value: unknown): value is LiveWalkFinish {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const finish = value as LiveWalkFinish;
  return typeof finish.name === "string" && isPoint(finish.point);
}

function isProximity(value: unknown): value is LiveWalkProximity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proximity = value as LiveWalkProximity;
  return (
    proximity.state === "normal" ||
    proximity.state === "almost_there" ||
    proximity.state === "arrived"
  ) &&
    Number.isSafeInteger(proximity.arrivalSamples) &&
    proximity.arrivalSamples >= 0;
}

function isLastPublished(
  value: unknown,
): value is NonNullable<LiveWalkSession["lastPublished"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const published = value as NonNullable<LiveWalkSession["lastPublished"]>;
  return isPoint(published.point) && Number.isFinite(published.at);
}
