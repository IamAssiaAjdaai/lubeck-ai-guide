import { describe, expect, it } from "vitest";
import { buildWalk, type WalkSettings } from "./walkPlanner";
import type { TourBuilderPlace } from "./tourBuilder";

const places: TourBuilderPlace[] = [
  { slug: "alpha", category: "see", coordinates: { lat: 53.865, lng: 10.686 }, durationMinutes: 10, tags: ["history"] },
  { slug: "beta", category: "see", coordinates: { lat: 53.866, lng: 10.687 }, durationMinutes: 10, tags: ["architecture"] },
  { slug: "gamma", category: "see", coordinates: { lat: 53.867, lng: 10.688 }, durationMinutes: 10, tags: ["history"] },
];
const settings: WalkSettings = {
  minutes: 120, start: { lat: 53.865, lng: 10.686 },
  interests: ["history"], walking: "long",
};
describe("explicit personalized-walk place selections", () => {
  it("retains exactly the user's picks across preference regeneration", () => {
    for (const walking of ["long", "balanced", "easy"] as const) {
      const route = buildWalk(places, { ...settings, walking, selectedPlaceSlugs: ["beta", "gamma"] });
      expect(new Set(route.places.map(place => place.slug))).toEqual(new Set(["beta", "gamma"]));
      expect(route.places).toHaveLength(2);
    }
  });
  it("rejects duplicate, unknown and empty selections without falling back to other places", () => {
    for (const selectedPlaceSlugs of [[], ["alpha", "alpha"], ["missing"]]) {
      expect(() => buildWalk(places, { ...settings, selectedPlaceSlugs })).toThrow();
    }
  });
  it("fails visibly if a selected place cannot fit, rather than silently dropping it", () => {
    expect(() => buildWalk(places, {
      ...settings, minutes: 1, selectedPlaceSlugs: ["alpha", "beta"],
    })).toThrow(/Selected places/);
    const unavailable = places.map(place => place.slug === "beta" ? { ...place, status: "closed" as const } : place);
    expect(() => buildWalk(unavailable, { ...settings, selectedPlaceSlugs: ["beta"] })).toThrow(/Selected places/);
  });
  it("preserves existing unselected planning", () => {
    expect(buildWalk(places, settings).places.length).toBeGreaterThan(0);
  });
});
