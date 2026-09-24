import { describe, it, expect } from "vitest";
import {
  buildWalk,
  deadlineForToday,
  measureWalk,
  type WalkSettings,
} from "./planner";
import type { TourBuilderPlace } from "@/lib/tourBuilder";
const start = { lat: 53.86, lng: 10.68 };
const places: TourBuilderPlace[] = [
  {
    slug: "a",
    category: "see",
    coordinates: start,
    durationMinutes: 15,
    tags: ["history"],
  },
  {
    slug: "b",
    category: "see",
    coordinates: { lat: 53.865, lng: 10.69 },
    durationMinutes: 20,
    tags: ["nature"],
  },
  {
    slug: "closed",
    category: "see",
    coordinates: start,
    durationMinutes: 1,
    status: "closed",
  },
];
const settings: WalkSettings = {
  minutes: 60,
  start,
  interests: [],
  walking: "long",
};
describe("walk planning", () => {
  it("honors an exact deadline budget and never fabricates places", () => {
    const now = 1000000;
    const route = buildWalk(
      places,
      { ...settings, deadline: now + 18 * 60000 },
      now,
    );
    expect(route.minutes).toBeLessThanOrEqual(18);
    expect(route.places.map((p) => p.slug)).toEqual(["a"]);
  });
  it("reserves the return leg before adding a stop", () => {
    const route = buildWalk(places, {
      ...settings,
      minutes: 40,
      finish: start,
    });
    expect(route.minutes).toBeLessThanOrEqual(40);
    expect(route.finish).toEqual(start);
    expect(route.places.map((p) => p.slug)).not.toContain("closed");
    expect(route.minutes).toBe(measureWalk(route.places, start, start).minutes);
  });
  it("rejects past and invalid times instead of silently using a default", () => {
    const now = new Date(2026, 8, 23, 14, 0);
    expect(deadlineForToday("13:00", now)).toBeUndefined();
    expect(deadlineForToday("29:00", now)).toBeUndefined();
    expect(deadlineForToday("14:30", now)).toBe(now.getTime() + 30 * 60000);
    expect(() => buildWalk(places, { ...settings, minutes: 0 })).toThrow();
  });
  it("uses supported additional interests in the actual ranking", () => {
    expect(
      buildWalk(places, { ...settings, minutes: 35, interests: ["nature"] })
        .places[0].slug,
    ).toBe("b");
  });
  it("returns empty when no eligible place fits", () => {
    expect(buildWalk(places, { ...settings, minutes: 2 }).places).toEqual([]);
    expect(
      buildWalk(places, { ...settings, deadline: 1030000 }, 1000000).places,
    ).toEqual([]);
  });
});
