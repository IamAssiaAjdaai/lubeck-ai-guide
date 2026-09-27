import { describe, expect, it } from "vitest";
import { savedRouteFromJourney, savedRouteIdentity, parseSavedRoute } from "./savedWalk";
import type { WalkJourney } from "./walkJourney";
const journey: WalkJourney = { id: "local", citySlug: "lubeck", settings: { minutes: 60, start: { lat: 53, lng: 10 }, walking: "balanced", interests: ["history"], deadline: 123 }, remaining: ["holstentor"], visited: [], position: { lat: 54, lng: 11 }, startedAt: 1, historyDistance: 10 };
describe("account route projection", () => {
  it("shares stable identity independent of session, locale or visit progress", () => {
    const completed: WalkJourney = { ...journey, id: "new", visited: ["holstentor"], remaining: [], finishedAt: 2 };
    expect(savedRouteIdentity(journey)).toBe(savedRouteIdentity(completed));
    expect(savedRouteIdentity({ ...journey, finish: { lat: 53, lng: 11 } })).not.toBe(savedRouteIdentity(journey));
  });
  it("removes unknown/sensitive progress fields and keeps completed itinerary", () => {
    const route = savedRouteFromJourney({ ...journey, visited: journey.remaining, remaining: [], finishedAt: 2, token: "test-sensitive", locale: "de" })!;
    expect(route.stopSlugs).toEqual(["holstentor"]); expect(route.settings.deadline).toBeUndefined();
    expect(Object.keys(route).sort()).toEqual(["citySlug", "finish", "settings", "stopSlugs"]);
    expect(JSON.stringify(route)).not.toContain("test-sensitive"); expect(route).not.toHaveProperty("position");
    expect(parseSavedRoute(route)).toEqual(route);
  });
  it("rejects empty/malformed payloads before persistence", () => {
    expect(savedRouteFromJourney({ ...journey, remaining: [] })).toBeUndefined();
    expect(parseSavedRoute({ citySlug: "lubeck", stopSlugs: ["holstentor"] })).toBeUndefined();
    expect(savedRouteFromJourney({ ...journey, finish: { lat: 999, lng: 0 } })).toBeUndefined();
  });
});
