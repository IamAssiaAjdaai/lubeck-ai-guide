import { describe, expect, it } from "vitest";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import { createFinishedShareRoute } from "./finishedRoute";
import { toPublicWalk } from "./publicWalk";

const places = ["holstentor", "rathaus", "marienkirche"].map((slug, i) => ({
  slug, name: slug, category: "see",
  coordinates: { lat: 53.86 + i * 0.001, lng: 10.68 },
  durationMinutes: 10, duration: "10 min", shortDescription: slug,
  tags: ["history"], requestedLocale: "en", actualLocale: "en",
  contentDirection: "ltr", didFallback: false,
})) as DiscoveryPlace[];

describe("Finish Walk → public Guest Preview contract", () => {
  it("preserves sender's exact confirmed stop order while keeping private GPS and progress out", () => {
    const finished = createFinishedShareRoute({
      citySlug: "lubeck",
      stopSlugs: ["rathaus", "holstentor", "marienkirche"],
      places,
      settings: {
        minutes: 90, start: { lat: 51.111, lng: 7.222 },
        interests: ["history"], walking: "balanced", deadline: Date.now() + 600000,
      },
      finish: { lat: 51.333, lng: 7.444 },
    });
    expect(finished).toBeDefined();
    const publicSnapshot = toPublicWalk(finished);
    expect(publicSnapshot?.version).toBe(1);
    expect(publicSnapshot?.route.stopSlugs).toEqual(["rathaus", "holstentor", "marienkirche"]);
    expect(publicSnapshot?.route.settings.start).toEqual(places[1].coordinates);
    const json = JSON.stringify(publicSnapshot);
    expect(json).not.toContain("51.111");
    expect(json).not.toContain("51.333");
    expect(json).not.toContain("deadline");
    expect(json).not.toContain("visited");
    expect(json).not.toContain("ownerId");
  });
  it("does not build a shareable payload if an original stop was removed from public content", () => {
    const finished = createFinishedShareRoute({
      citySlug: "lubeck",
      stopSlugs: ["holstentor", "removed-stop"],
      places,
      settings: { minutes: 60, start: places[0].coordinates, interests: [], walking: "balanced" },
    });
    expect(finished).toBeUndefined();
    expect(toPublicWalk(finished)).toBeNull();
  });
});
