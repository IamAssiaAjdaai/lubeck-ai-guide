import { expect, it } from "vitest";
import { measureWalk } from "@citywalk/traveler-core/walkPlanner";
import { publishedRouteTiming } from "../src/lib/publishedRouteTiming";

it("flags the observed 45-minute estimate as shorter than its 120-minute stop visits without inventing a replacement", () => {
  const result = publishedRouteTiming({ estimatedDurationMinutes: 45, stops: [30, 30, 20, 30, 10].map((visitDurationMinutes, position) => ({ placeSlug: `stop-${position}`, position, visitDurationMinutes })) });
  expect(result).toEqual({ visitMinutes: 120, publishedMinutes: 45, conflictsWithVisits: true });
  expect(result).not.toHaveProperty("walkingMinutes");
  expect(result).not.toHaveProperty("totalMinutes");
});
it("keeps the same visit/experience distinction as the existing trip builder", () => {
  const places = [{slug:"one",category:"see" as const,coordinates:{lat:53.8,lng:10.7},durationMinutes:20}, {slug:"two",category:"see" as const,coordinates:{lat:53.81,lng:10.7},durationMinutes:10}];
  const route = measureWalk(places, places[0].coordinates);
  const timing = publishedRouteTiming({ stops: places.map((place, position) => ({placeSlug:place.slug,position,visitDurationMinutes:place.durationMinutes})) });
  expect(timing.visitMinutes).toBe(route.visitMinutes);
  expect(route.minutes).toBe(route.visitMinutes + route.walkingMinutes);
  expect(route.minutes).toBeGreaterThan(timing.visitMinutes!);
});
it("does not turn missing visit estimates into zero minutes or an asserted total", () => {
  expect(publishedRouteTiming({estimatedDurationMinutes:45,stops:[{placeSlug:"one",position:1,visitDurationMinutes:30},{placeSlug:"two",position:2}]})).toEqual({visitMinutes:undefined,publishedMinutes:45,conflictsWithVisits:false});
  expect(publishedRouteTiming({stops:[]})).toEqual({visitMinutes:undefined,publishedMinutes:undefined,conflictsWithVisits:false});
});
it("does not assign walking-only scope to an estimate that exceeds the visits", () => {
  const result=publishedRouteTiming({estimatedDurationMinutes:100,stops:[{placeSlug:"one",position:1,visitDurationMinutes:30}]});
  expect(result).toEqual({visitMinutes:30,publishedMinutes:100,conflictsWithVisits:false});
  expect(result).not.toHaveProperty("walkingMinutes");
});
