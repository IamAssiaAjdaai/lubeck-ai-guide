import { describe, expect, it, vi } from "vitest";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import {
  fetchNativeSharedWalk, nativeFinishedShareRoute, parseNativeSharedWalk,
  sharedWalkToNativeJourney,
} from "../src/lib/sharedWalk";

const stops = ["rathaus", "holstentor", "marienkirche"].map((slug, i) => ({
  slug,
  category: "see" as const,
  coordinates: { lat: 53.85 + i * 0.001, lng: 10.68 },
  durationMinutes: 10,
  requestedLocale: "en", resolvedLocale: "en", didFallback: false,
  content: { name: slug, shortDescription: slug },
  media: [],
  tags: ["history"],
})) satisfies PublicPlaceCard[];

const publicRoute = {
  citySlug: "lubeck",
  stopSlugs: ["holstentor", "rathaus", "marienkirche"],
  settings: {
    minutes: 90, start: stops[1].coordinates, interests: ["history"], walking: "balanced",
  },
};
const shared = parseNativeSharedWalk({ version: 1, route: publicRoute })!;
const id = "11111111-1111-4111-8111-111111111111";

describe("native app-first shared walk", () => {
  it("parses a versioned public route without progress/identity", () => {
    const result = parseNativeSharedWalk({ version: 1, route: {
      ...publicRoute, ownerId: "private", visited: ["secret"], deadline: 1790000000000,
    } });
    expect(result?.route.stopSlugs).toEqual(publicRoute.stopSlugs);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("deadline");
  });

  it("rejects duplicate stops, extra-long routes and unknown versions", () => {
    expect(parseNativeSharedWalk({ version: 2, route: publicRoute })).toBeUndefined();
    expect(parseNativeSharedWalk({ version: 1, route: { ...publicRoute, stopSlugs: ["rathaus", "rathaus"] } })).toBeUndefined();
    expect(parseNativeSharedWalk({ version: 1, route: { ...publicRoute, stopSlugs: Array.from({ length: 31 }, (_, i) => "p" + i) } })).toBeUndefined();
  });

  it("loads the share without authentication cookies", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ version: 1, route: publicRoute }), {
      status: 200,
    })) as unknown as typeof fetch;
    const result = await fetchNativeSharedWalk(id, "https://getcitywalk.com", fetchImpl);
    expect(result.route.stopSlugs).toEqual(publicRoute.stopSlugs);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toBe("https://getcitywalk.com/api/shared-walks/" + id);
    expect(options.credentials).toBe("omit");
    expect(options.cache).toBe("no-store");
  });

  it("refuses invalid share IDs before making a request", async () => {
    const fn = vi.fn();
    await expect(fetchNativeSharedWalk("../auth", "https://getcitywalk.com", fn as typeof fetch)).rejects.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });

  it("creates an exact ordered local preview with zero copied history", () => {
    const result = sharedWalkToNativeJourney(shared, stops, "native-replay", 1234);
    expect(result?.remaining).toEqual(["holstentor", "rathaus", "marienkirche"]);
    expect(result?.shareStopSlugs).toEqual(["holstentor", "rathaus", "marienkirche"]);
    expect(result?.visited).toEqual([]);
    expect(result?.historyDistance).toBe(0);
    expect(result?.position).toEqual(stops[1].coordinates);
    expect(result?.startedAt).toBe(1234);
  });

  it("fails closed for removed stops, private origins, or wrong public content", () => {
    expect(sharedWalkToNativeJourney(shared, stops.slice(0, 2), "id")).toBeUndefined();
    const privateStart = parseNativeSharedWalk({ version: 1, route: {
      ...publicRoute, settings: { ...publicRoute.settings, start: { lat: 51.12, lng: 7.43 } },
    } })!;
    expect(sharedWalkToNativeJourney(privateStart, stops, "id")).toBeUndefined();
  });

  it("native Finish Walk excludes sender GPS and preserves planned order", () => {
    const input = sharedWalkToNativeJourney(shared, stops, "session")!;
    input.position = { lat: 51.111, lng: 7.222 };
    input.historyDistance = 8000;
    input.visited = ["holstentor"];
    input.remaining = [];
    const route = nativeFinishedShareRoute(input, publicRoute.stopSlugs, stops);
    expect(route?.stopSlugs).toEqual(publicRoute.stopSlugs);
    expect(route?.settings.start).toEqual(stops[1].coordinates);
    expect(JSON.stringify(route)).not.toContain("51.111");
    expect(JSON.stringify(route)).not.toContain("historyDistance");
    expect(JSON.stringify(route)).not.toContain("visited");
  });
});
