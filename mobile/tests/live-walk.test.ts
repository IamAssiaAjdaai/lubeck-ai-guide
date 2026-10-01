import { describe, expect, it } from "vitest";

import {
  LIVE_WALK_ARRIVAL_SAMPLES,
  deriveLiveWalkTiming,
  formatLiveWalkDistance,
  isLiveWalkLocationUsable,
  shouldPublishLiveWalkLocation,
  updateLiveWalkProximity,
} from "../src/lib/liveWalk";

describe("Live Walk execution semantics", () => {
  it("formats domain meters explicitly and never lets Intl convert them to miles", () => {
    expect(formatLiveWalkDistance(620)).toBe("620 m");
    expect(formatLiveWalkDistance(999)).toBe("999 m");
    expect(formatLiveWalkDistance(1000)).toBe("1 km");
    expect(formatLiveWalkDistance(2200)).toBe("2.2 km");
  });

  it("preserves the physical duration-budget evidence without presenting it as schedule lateness", () => {
    const timing = deriveLiveWalkTiming({
      startedAt: Date.parse("2026-09-29T10:45:17.208Z"),
      plannedMinutes: 240,
      observedAt: Date.parse("2026-09-29T15:45:53.767Z"),
      remainingMinutes: 130,
    });

    expect(timing).toMatchObject({
      baseline: "duration_budget",
      deadlineUtc: null,
      remainingMinutes: 130,
      projectedFinishUtc: "2026-09-29T17:55:53.767Z",
      baselineSlackMinutes: -191,
      schedule: null,
    });
    expect(timing.scheduleSlackMinutes).toBeUndefined();
    expect(timing.elapsedMinutes).toBeCloseTo(300.6093, 3);
  });

  it("uses ahead/on-schedule/behind only for a real explicit deadline", () => {
    const observedAt = Date.parse("2026-09-29T15:45:00.000Z");
    const timing = deriveLiveWalkTiming({
      startedAt: Date.parse("2026-09-29T14:00:00.000Z"),
      plannedMinutes: 240,
      observedAt,
      remainingMinutes: 60,
      deadline: observedAt + 52 * 60_000,
    });

    expect(timing.baseline).toBe("explicit_deadline");
    expect(timing.schedule).toBe("behind");
    expect(timing.scheduleSlackMinutes).toBe(-8);
  });

  it("debounces arrival and uses hysteresis before leaving arrived", () => {
    let proximity = updateLiveWalkProximity(180);
    expect(proximity.state).toBe("almost_there");

    proximity = updateLiveWalkProximity(45, proximity);
    expect(proximity.state).not.toBe("arrived");
    expect(proximity.arrivalSamples).toBe(LIVE_WALK_ARRIVAL_SAMPLES - 1);

    proximity = updateLiveWalkProximity(42, proximity);
    expect(proximity.state).toBe("arrived");

    proximity = updateLiveWalkProximity(75, proximity);
    expect(proximity.state).toBe("arrived");

    proximity = updateLiveWalkProximity(110, proximity);
    expect(proximity.state).toBe("almost_there");
  });

  it("publishes only meaningful GPS changes under the 25m/20s battery policy", () => {
    const previous = {
      point: { lat: 53.865, lng: 10.68 },
      at: 1_000_000,
    };

    expect(shouldPublishLiveWalkLocation({
      previous,
      next: { lat: 53.86501, lng: 10.68 },
      now: previous.at + 25_000,
    })).toBe(false);

    expect(shouldPublishLiveWalkLocation({
      previous,
      next: { lat: 53.8654, lng: 10.68 },
      now: previous.at + 10_000,
    })).toBe(false);

    expect(shouldPublishLiveWalkLocation({
      previous,
      next: { lat: 53.8654, lng: 10.68 },
      now: previous.at + 21_000,
    })).toBe(true);

    expect(shouldPublishLiveWalkLocation({
      previous,
      next: previous.point,
      now: previous.at + 60_000,
    })).toBe(true);

    expect(shouldPublishLiveWalkLocation({
      previous,
      next: previous.point,
      now: previous.at + 1_000,
      stateChanged: true,
    })).toBe(true);
  });

  it("rejects stale or low-quality location fixes", () => {
    const now = 2_000_000;
    expect(isLiveWalkLocationUsable({
      timestamp: now - 10_000,
      accuracy: 40,
      now,
    })).toBe(true);
    expect(isLiveWalkLocationUsable({
      timestamp: now - 3 * 60_000,
      accuracy: 40,
      now,
    })).toBe(false);
    expect(isLiveWalkLocationUsable({
      timestamp: now - 10_000,
      accuracy: 300,
      now,
    })).toBe(false);
  });
});
