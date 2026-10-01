import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import type { Point } from "@citywalk/traveler-core/walkPlanner";

import {
  isLiveWalkLocationUsable,
  liveWalkDistanceAndEta,
  shouldPublishLiveWalkLocation,
  updateLiveWalkProximity,
} from "./liveWalk";
import {
  clearLiveWalkSession,
  loadLiveWalkSession,
  saveLiveWalkSession,
  setLiveWalkEnabled,
  type LiveWalkSession,
} from "./liveWalkStorage";
import { buildLiveWalkPresentation } from "./liveWalkPresentation";
import {
  endCitywalkLiveActivity,
  upsertCitywalkLiveActivity,
} from "./liveWalkActivity";

export const LIVE_WALK_LOCATION_TASK = "citywalk-live-walk-location-v1";

if (!TaskManager.isTaskDefined(LIVE_WALK_LOCATION_TASK)) {
  TaskManager.defineTask(LIVE_WALK_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as { locations?: Location.LocationObject[] }).locations;
    const latest = locations?.[locations.length - 1];
    if (!latest) return;
    await publishLocationObject(latest);
  });
}

export type LiveWalkEnableResult =
  | "enabled"
  | "denied"
  | "unavailable";

export async function enableCitywalkLiveWalk(): Promise<LiveWalkEnableResult> {
  if (Platform.OS !== "ios") return "unavailable";

  const session = await loadLiveWalkSession();
  if (!session || !(session.takeBack ? session.finish : session.stops[0])) {
    return "unavailable";
  }

  try {
    if (!await TaskManager.isAvailableAsync()) return "unavailable";
    if (!await Location.hasServicesEnabledAsync()) return "unavailable";

    let foreground = await Location.getForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      foreground = await Location.requestForegroundPermissionsAsync();
    }
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      return "denied";
    }

    let background = await Location.getBackgroundPermissionsAsync();
    if (background.status !== Location.PermissionStatus.GRANTED) {
      background = await Location.requestBackgroundPermissionsAsync();
    }
    if (background.status !== Location.PermissionStatus.GRANTED) {
      return "denied";
    }

    await setLiveWalkEnabled(true);

    if (!await TaskManager.isTaskRegisteredAsync(LIVE_WALK_LOCATION_TASK)) {
      await Location.startLocationUpdatesAsync(LIVE_WALK_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 20_000,
        deferredUpdatesDistance: 25,
        deferredUpdatesInterval: 20_000,
        pausesUpdatesAutomatically: true,
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: false,
      });
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await publishLocationObject(current, true);
    } catch {
      // The registered task can provide the first fresh fix after this screen closes.
    }

    return "enabled";
  } catch {
    try {
      if (await TaskManager.isTaskRegisteredAsync(LIVE_WALK_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(LIVE_WALK_LOCATION_TASK);
      }
    } catch {
      // Best-effort rollback.
    }
    await setLiveWalkEnabled(false).catch(() => undefined);
    await endCitywalkLiveActivity();
    return "unavailable";
  }
}

export async function disableCitywalkLiveWalk(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(LIVE_WALK_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LIVE_WALK_LOCATION_TASK);
    }
  } catch {
    // Stop ActivityKit below even if the platform task already disappeared.
  }
  await setLiveWalkEnabled(false).catch(() => undefined);
  await endCitywalkLiveActivity();
}

export async function completeCitywalkLiveWalk(): Promise<void> {
  await disableCitywalkLiveWalk();
  await clearLiveWalkSession().catch(() => undefined);
}

export async function publishForegroundLiveWalkLocation(
  point: Point,
  input: Readonly<{
    timestamp?: number;
    accuracy?: number | null;
    force?: boolean;
  }> = {},
): Promise<void> {
  const timestamp = input.timestamp ?? Date.now();
  if (!isLiveWalkLocationUsable({
    timestamp,
    accuracy: input.accuracy,
    now: Date.now(),
  })) return;

  const session = await loadLiveWalkSession();
  if (!session?.enabled) return;
  await publishPoint(session, point, timestamp, input.force ?? false);
}

export async function refreshCitywalkLiveActivity(
  fallbackPoint?: Point,
): Promise<boolean> {
  const session = await loadLiveWalkSession();
  if (!session?.enabled) return false;
  const point = session.lastPublished?.point ?? fallbackPoint;
  if (!point) return false;
  const presentation = buildLiveWalkPresentation(session, point);
  if (!presentation) return false;
  return upsertCitywalkLiveActivity(
    presentation.props,
    "citywalk://city/" + session.citySlug + "/walk",
  );
}

export async function getLiveWalkRuntimeStatus() {
  const session = await loadLiveWalkSession();
  const foreground = await Location.getForegroundPermissionsAsync()
    .catch(() => undefined);
  const background = await Location.getBackgroundPermissionsAsync()
    .catch(() => undefined);
  const taskManagerAvailable = await TaskManager.isAvailableAsync()
    .catch(() => false);
  const taskRegistered = await TaskManager.isTaskRegisteredAsync(
    LIVE_WALK_LOCATION_TASK,
  ).catch(() => false);

  return {
    platform: Platform.OS,
    taskManagerAvailable,
    locationModuleAvailable: true,
    liveActivitySupported: Platform.OS === "ios",
    backgroundLocationSupported: Platform.OS === "ios",
    foregroundPermission: foreground?.status ?? "unknown",
    backgroundPermission: background?.status ?? "unknown",
    taskRegistered,
    status: session?.enabled ? "enabled" : "disabled",
    journeyEligible: Boolean(
      session && (session.takeBack ? session.finish : session.stops[0]),
    ),
    featureEnabled: session?.enabled ?? false,
  };
}

async function publishLocationObject(
  location: Location.LocationObject,
  force = false,
): Promise<void> {
  if (!isLiveWalkLocationUsable({
    timestamp: location.timestamp,
    accuracy: location.coords.accuracy,
    now: Date.now(),
  })) return;

  const session = await loadLiveWalkSession();
  if (!session?.enabled) return;
  await publishPoint(
    session,
    { lat: location.coords.latitude, lng: location.coords.longitude },
    location.timestamp,
    force,
  );
}

async function publishPoint(
  session: LiveWalkSession,
  point: Point,
  timestamp: number,
  force: boolean,
): Promise<void> {
  const target = session.takeBack ? session.finish : session.stops[0];
  if (!target) return;
  const { distanceMeters } = liveWalkDistanceAndEta(point, target.point);
  const proximity = updateLiveWalkProximity(
    distanceMeters,
    session.proximity,
  );
  const stateChanged = proximity.state !== session.proximity.state;

  if (
    !force &&
    !shouldPublishLiveWalkLocation({
      previous: session.lastPublished,
      next: point,
      now: timestamp,
      stateChanged,
    })
  ) return;

  const nextSession: LiveWalkSession = {
    ...session,
    proximity,
    lastPublished: { point, at: timestamp },
  };
  await saveLiveWalkSession(nextSession);

  const presentation = buildLiveWalkPresentation(
    nextSession,
    point,
    timestamp,
  );
  if (!presentation) return;

  await upsertCitywalkLiveActivity(
    presentation.props,
    "citywalk://city/" + session.citySlug + "/walk",
  );
}
