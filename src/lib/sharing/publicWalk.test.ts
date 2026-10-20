import { describe, expect, it } from "vitest";
import { toPublicWalk } from "./publicWalk";

const route = {
  citySlug: "luebeck",
  stopSlugs: ["holstentor", "rathaus"],
  settings: {
    minutes: 90,
    start: { lat: 53.866, lng: 10.684 },
    interests: ["history"],
    walking: "balanced",
    deadline: Date.now() + 900000,
  },
  ownerId: "private-user-id",
  historyDistance: 900,
  visited: ["holstentor"],
};

describe("public walk snapshot", () => {
  it("keeps only ordered re-playable route data", () => {
    const result = toPublicWalk(route);
    expect(result?.route.stopSlugs).toEqual(["holstentor", "rathaus"]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("private-user-id");
    expect(serialized).not.toContain("historyDistance");
    expect(serialized).not.toContain("visited");
    expect(serialized).not.toContain("deadline");
  });
  it("withholds precise start and finish even when decorated with private data", () => {
    const result = toPublicWalk({ ...route, finish: { lat: 53.871234, lng: 10.691234 } });
    expect(result?.route.settings).not.toHaveProperty("start");
    expect(result?.route.settings).not.toHaveProperty("finish");
    expect(result?.route).not.toHaveProperty("finish");
    expect(JSON.stringify(result)).not.toMatch(/53\.866|53\.871234|10\.691234/);
  });
  it("rejects invalid and empty public routes", () => {
    expect(toPublicWalk({ ...route, stopSlugs: [] })).toBeNull();
    expect(toPublicWalk({ ...route, stopSlugs: ["../../secret"] })).toBeNull();
    expect(toPublicWalk(null)).toBeNull();
  });
});
