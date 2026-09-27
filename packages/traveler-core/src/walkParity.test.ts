import { describe, expect, it } from "vitest";
import {
  buildWalk,
  buildWalkSteps,
  deadlineForToday,
  measureWalk,
  type WalkSettings,
} from "./walkPlanner";
import {
  advanceWalk,
  isWalkJourney,
  proposeAddedStop,
  proposeShorterWalk,
  remainingWalkBudget,
  type WalkJourney,
} from "./walkJourney";
import {
  buildWalkGuideContext,
  resolveWalkGuideContext,
} from "./walkGuideContext";
import { walkCopy, walkCategoryLabel } from "./walkCopy";
import { cityLaunches, isCityLaunched } from "./cityAvailability";
import type { TourBuilderPlace } from "./tourBuilder";
const start = { lat: 53.865, lng: 10.68 };
const places: TourBuilderPlace[] = Array.from({ length: 8 }, (_, i) => ({
  slug: `stop-${i}`,
  category: "see",
  coordinates: { lat: start.lat + i * 0.0003, lng: start.lng },
  durationMinutes: 20,
  tags: i === 7 ? ["local-craft"] : ["history"],
}));
const settings: WalkSettings = {
  minutes: 120,
  start,
  finish: start,
  walking: "balanced",
  interests: ["history"],
};
const journey: WalkJourney = {
  id: "walk-one",
  citySlug: "city",
  settings,
  remaining: places.slice(0, 3).map((p) => p.slug),
  visited: [],
  position: start,
  finish: start,
  historyDistance: 0,
  startedAt: 1000000,
};
describe("shared V2 cross-platform rules", () => {
  it.each([60, 120, 180, 240])(
    "fits the %s minute duration including the finish leg",
    (minutes) => {
      const route = buildWalk(places, { ...settings, minutes });
      expect(route.minutes).toBeLessThanOrEqual(minutes);
      expect(route.finish).toEqual(start);
      expect(route.places.length).toBeGreaterThan(0);
    },
  );
  it("uses the remaining deadline budget and excludes closed content", () => {
    const now = 1000000;
    const route = buildWalk(
      [...places, { ...places[0], slug: "closed", status: "closed" }],
      { ...settings, deadline: now + 45 * 60000 },
      now,
    );
    expect(route.minutes).toBeLessThanOrEqual(45);
    expect(route.places.some((p) => p.slug === "closed")).toBe(false);
  });
  it("uses city-specific categories in canonical ranking", () => {
    const route = buildWalk(places, {
      ...settings,
      minutes: 30,
      interests: [],
      categories: ["local-craft"],
    });
    expect(route.places[0].slug).toBe("stop-7");
  });
  it("builds a shorter proposal without mutating the itinerary", () => {
    const before = structuredClone(places);
    const proposed = proposeShorterWalk(places, settings, start, start);
    expect(proposed.minutes).toBeLessThan(
      measureWalk(places, start, start).minutes,
    );
    expect(places).toEqual(before);
  });
  it("does not add duplicate, visited, closed or over-budget stops", () => {
    expect(
      proposeAddedStop(
        [places[0]],
        places[0],
        [],
        settings,
        start,
        start,
        0,
        0,
      ),
    ).toBeUndefined();
    expect(
      proposeAddedStop(
        [],
        places[0],
        [places[0].slug],
        settings,
        start,
        start,
        0,
        0,
      ),
    ).toBeUndefined();
    expect(
      proposeAddedStop(
        [],
        { ...places[0], status: "closed" },
        [],
        settings,
        start,
        start,
        0,
        0,
      ),
    ).toBeUndefined();
    expect(
      proposeAddedStop(
        [],
        places[0],
        [],
        settings,
        start,
        start,
        0,
        119 * 60000,
      ),
    ).toBeUndefined();
    expect(
      proposeAddedStop([], places[0], [], settings, start, start, 0, 0)?.places,
    ).toEqual([places[0]]);
  });
  it("keeps skipped stops out of visited history and ignores stale advance actions", () => {
    expect(advanceWalk(journey, places[1], true)).toBe(journey);
    const next = advanceWalk(journey, places[0], false);
    expect(next.remaining).toEqual(["stop-1", "stop-2"]);
    expect(next.visited).toEqual([]);
    expect(journey.remaining).toHaveLength(3);
    expect(advanceWalk(journey, places[0], true).visited).toEqual(["stop-0"]);
  });
  it("counts elapsed time against duration and deadline budgets", () => {
    expect(remainingWalkBudget(settings, 0, 30 * 60000)).toBe(90);
    expect(
      remainingWalkBudget({ ...settings, deadline: 40 * 60000 }, 0, 30 * 60000),
    ).toBe(10);
    expect(remainingWalkBudget(settings, 0, 150 * 60000)).toBe(0);
  });
  it("rejects corrupt persisted state and accepts legitimate sessions", () => {
    expect(isWalkJourney(journey)).toBe(true);
    expect(isWalkJourney({ ...journey, position: { lat: 300, lng: 0 } })).toBe(
      false,
    );
    expect(
      isWalkJourney({
        ...journey,
        settings: { ...settings, categories: [null] },
      }),
    ).toBe(false);
    expect(isWalkJourney({ ...journey, remaining: [1] })).toBe(false);
  });
  it("constructs the same guide context that the server validates", () => {
    const context = buildWalkGuideContext({
      visited: [places[0]],
      remaining: [places[1]],
      settings,
      minutesRemaining: 42,
      finish: start,
    });
    expect(resolveWalkGuideContext(context, places, "stop-1")).toEqual(context);
    expect(resolveWalkGuideContext(context, places, "stop-0")).toBeUndefined();
    expect(
      resolveWalkGuideContext(
        { ...context, remaining: ["draft"] },
        places,
        "draft",
      ),
    ).toBeUndefined();
  });
  it("requires a future, valid return time", () => {
    const now = new Date(2026, 8, 24, 12, 0);
    expect(deadlineForToday("12:00", now)).toBeUndefined();
    expect(deadlineForToday("25:00", now)).toBeUndefined();
    expect(deadlineForToday("١٣:٠٠", now)).toBe(now.getTime() + 3600000);
    expect(deadlineForToday("13:00", now)).toBe(now.getTime() + 3600000);
  });
  it("shares complete translated keys and launch statuses", () => {
    for (const locale of ["de", "ar"])
      expect(Object.keys(walkCopy(locale)).sort()).toEqual(
        Object.keys(walkCopy("en")).sort(),
      );
    expect(walkCopy("ar").build).not.toBe(walkCopy("en").build);
    expect(walkCategoryLabel("waterfront", "de")).toBe("Am Wasser");
    expect(walkCategoryLabel("waterfront", "ar")).toBe("الواجهة المائية");
    expect(walkCategoryLabel("new-city-tag", "en")).toBe("new city tag");
    expect(isCityLaunched("hamburg")).toBe(false);
    expect(cityLaunches.hamburg.status).toBe("coming_soon");
  });
});


describe("observable planner work units", () => {
  it.each(["easy", "balanced", "long"] as const)("keeps %s routes identical to synchronous planning", (walking) => {
    const input = { ...settings, walking };
    const steps = buildWalkSteps(places, input, 1000000);
    const observed = [];
    let result = steps.next();
    while (!result.done) { observed.push(result.value); result = steps.next(); }
    expect(observed).toEqual(["matching", "checking", "fitting", "choosing"]);
    expect(result.value).toEqual(buildWalk(places, input, 1000000));
  });
  it("never reports later stages after an invalid time budget", () => {
    const steps = buildWalkSteps(places, { ...settings, minutes: -1 });
    expect(steps.next().value).toBe("matching");
    expect(() => steps.next()).toThrow("Invalid time budget");
  });
});
