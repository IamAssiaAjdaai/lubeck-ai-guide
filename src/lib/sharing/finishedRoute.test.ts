import { describe, expect, it } from "vitest";
import { createFinishedShareRoute } from "./finishedRoute";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
const places = ["first", "second", "third"].map((slug, index) => ({
  slug, category: "see", coordinates: { lat: 53.8 + index * 0.01, lng: 10.6 },
  durationMinutes: 10, duration: "10 min", name: slug,
  shortDescription: slug, requestedLocale: "en", actualLocale: "en",
  contentDirection: "ltr", didFallback: false, tags: [],
})) as DiscoveryPlace[];
const input = {
  citySlug: "test-city",
  stopSlugs: ["second", "first", "third"],
  places,
  settings: {
    minutes: 90, start: { lat: 51.1111, lng: 7.2222 }, walking: "balanced" as const,
    interests: ["history" as const], deadline: 9999999999,
  },
  finish: { lat: 52.2222, lng: 8.3333 },
};
describe("finished public itinerary", () => {
  it("keeps exact route order without exporting sender origin, progress, history or deadline", () => {
    const route = createFinishedShareRoute(input);
    expect(route?.stopSlugs).toEqual(["second", "first", "third"]);
    expect(route?.settings.start).toEqual(places[1].coordinates);
    expect(route?.finish).toBeUndefined();
    const json = JSON.stringify(route);
    expect(json).not.toContain("51.1111");
    expect(json).not.toContain("52.2222");
    expect(json).not.toContain("deadline");
    expect(json).not.toContain("visited");
  });
  it("preserves an explicit public landmark finish", () => {
    const route = createFinishedShareRoute({ ...input, finish: places[2].coordinates });
    expect(route?.finish).toEqual(places[2].coordinates);
  });
  it("refuses missing or ineligible route stops without silently shortening", () => {
    expect(createFinishedShareRoute({ ...input, stopSlugs: ["missing"] })).toBeUndefined();
    expect(createFinishedShareRoute({ ...input, stopSlugs: [] })).toBeUndefined();
    expect(createFinishedShareRoute({ ...input, stopSlugs: ["first", "first"] })).toBeUndefined();
    const closed = places.map((place, i) => i === 1 ? { ...place, status: "closed" as const } : place);
    expect(createFinishedShareRoute({ ...input, places: closed })).toBeUndefined();
  });
});
