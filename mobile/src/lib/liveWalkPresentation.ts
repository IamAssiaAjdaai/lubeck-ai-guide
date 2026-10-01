import { t } from "@citywalk/i18n";
import type { Point } from "@citywalk/traveler-core/walkPlanner";

import {
  deriveLiveWalkTiming,
  estimateLiveWalkRemainingMinutes,
  formatLiveWalkClock,
  formatLiveWalkDistance,
  formatLiveWalkDuration,
  liveWalkDistanceAndEta,
  type CitywalkLiveActivityProps,
  type LiveWalkDisplayState,
  type LiveWalkTiming,
} from "./liveWalk";
import type { LiveWalkSession } from "./liveWalkStorage";

export type LiveWalkPresentation = Readonly<{
  props: CitywalkLiveActivityProps;
  timing: LiveWalkTiming;
  targetDistanceMeters: number;
  targetEtaMinutes: number;
}>;

export function buildLiveWalkPresentation(
  session: LiveWalkSession,
  position: Point,
  observedAt = Date.now(),
): LiveWalkPresentation | undefined {
  const target = session.takeBack ? session.finish : session.stops[0] ?? session.finish;
  if (!target) return undefined;

  const targetPoint = "point" in target ? target.point : undefined;
  if (!targetPoint) return undefined;

  const { distanceMeters, etaMinutes } = liveWalkDistanceAndEta(
    position,
    targetPoint,
  );
  const remainingMinutes = estimateLiveWalkRemainingMinutes(
    position,
    session.stops,
    session.finish,
  );
  const timing = deriveLiveWalkTiming({
    startedAt: session.startedAt,
    plannedMinutes: session.plannedMinutes,
    observedAt,
    remainingMinutes,
    ...(session.deadline === undefined ? {} : { deadline: session.deadline }),
  });

  let state: LiveWalkDisplayState = "normal";
  if (session.takeBack) state = "take_back";
  else if (
    session.routeUpdatedUntil !== undefined &&
    session.routeUpdatedUntil > observedAt
  ) state = "route_updated";
  if (!session.takeBack && session.proximity.state === "almost_there") {
    state = "almost_there";
  }
  if (session.proximity.state === "arrived") state = "arrived";

  const stateLabel = state === "arrived"
    ? t(session.locale, "liveWalk.arrived")
    : state === "almost_there"
      ? t(session.locale, "liveWalk.almostThere")
      : state === "route_updated"
        ? t(session.locale, "liveWalk.routeUpdated")
        : state === "take_back"
          ? t(session.locale, "liveWalk.backTo")
          : t(session.locale, "liveWalk.next");

  const distanceEta = state === "arrived"
    ? undefined
    : t(session.locale, "liveWalk.distanceEta")
        .replace("{distance}", formatLiveWalkDistance(distanceMeters))
        .replace("{minutes}", String(etaMinutes));

  const scheduleLabel = timing.schedule === "ahead"
    ? t(session.locale, "liveWalk.ahead").replace(
        "{minutes}",
        String(Math.abs(timing.scheduleSlackMinutes ?? 0)),
      )
    : timing.schedule === "behind"
      ? t(session.locale, "liveWalk.behind").replace(
          "{minutes}",
          String(Math.abs(timing.scheduleSlackMinutes ?? 0)),
        )
      : timing.schedule === "on_schedule"
        ? t(session.locale, "liveWalk.onSchedule")
        : undefined;

  const props: CitywalkLiveActivityProps = {
    cityLabel: "CITYWALK · " + session.cityName,
    state,
    stateLabel,
    destination: target.name,
    ...(distanceEta ? { distanceEta } : {}),
    ...(state === "arrived" && "storyReady" in target && target.storyReady
      ? { storyLabel: t(session.locale, "liveWalk.storyReady") }
      : {}),
    progress:
      session.totalStops > 0
        ? Math.max(0, Math.min(1, session.visitedCount / session.totalStops))
        : 1,
    progressLabel: t(session.locale, "liveWalk.stops")
      .replace("{visited}", String(session.visitedCount))
      .replace("{total}", String(session.totalStops)),
    remainingLabel: t(session.locale, "liveWalk.remaining").replace(
      "{time}",
      formatLiveWalkDuration(timing.remainingMinutes),
    ),
    finishLabel: t(session.locale, "liveWalk.finish").replace(
      "{time}",
      formatLiveWalkClock(Date.parse(timing.projectedFinishUtc), session.locale),
    ),
    ...(session.deadline === undefined
      ? {}
      : {
          deadlineLabel: t(session.locale, "liveWalk.backBy").replace(
            "{time}",
            formatLiveWalkClock(session.deadline, session.locale),
          ),
        }),
    ...(scheduleLabel ? { scheduleLabel } : {}),
    compactEta: etaMinutes > 0 ? String(etaMinutes) + "m" : "0m",
  };

  return {
    props,
    timing,
    targetDistanceMeters: distanceMeters,
    targetEtaMinutes: etaMinutes,
  };
}

export function buildLiveWalkDiagnostics(
  session: LiveWalkSession,
  position: Point,
  observedAt = Date.now(),
) {
  const presentation = buildLiveWalkPresentation(session, position, observedAt);
  if (!presentation) return undefined;
  return {
    journeyId: session.journeyId,
    citySlug: session.citySlug,
    enabled: session.enabled,
    takeBack: session.takeBack,
    state: presentation.props.state,
    targetDistanceMeters: Math.round(presentation.targetDistanceMeters),
    targetEtaMinutes: presentation.targetEtaMinutes,
    ...presentation.timing,
  };
}
