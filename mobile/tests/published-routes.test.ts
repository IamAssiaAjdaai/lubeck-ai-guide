import { describe, expect, it } from "vitest";
import type { PublicPlaceCard, PublicTour } from "../src/lib/api/contracts";
import { filterPublishedRoutes, publishedRoutePresentation, routeTimeBudgets } from "../src/lib/publishedRoutes";
import { TOUR_TIME_BUDGETS } from "@citywalk/traveler-core";
function tour(minutes?: number): PublicTour { return { slug: `route-${minutes ?? "unknown"}`, requestedLocale: "en", resolvedLocale: "en", didFallback: false, estimatedDurationMinutes: minutes, content: { title: "Published route" }, stops: [{ placeSlug: "holstentor", position: 1 }], media: [] }; }
const place: PublicPlaceCard = { slug: "holstentor", requestedLocale: "en", resolvedLocale: "en", didFallback: false, category: "see", coordinates: { lat: 53, lng: 10 }, durationMinutes: 30, content: { name: "Holstentor", shortDescription: "Published place" }, tags: ["history", "architecture"], image: "/unverified.jpg", media: [] };
describe("published routes use existing data contracts", () => {
  it("uses only canonical builder time budgets", () => { for (const minutes of routeTimeBudgets) expect(TOUR_TIME_BUDGETS).toContain(minutes); });
  it("filters actual duration inclusively, excludes unknown timings only under a budget and restores All", () => {
    const routes = [tour(45), tour(60), tour(120), tour()];
    expect(filterPublishedRoutes(routes, 60)).toEqual(routes.slice(0, 2));
    expect(filterPublishedRoutes(routes, 120)).toEqual(routes.slice(0, 3));
    expect(filterPublishedRoutes(routes)).toBe(routes);
  });
  it("derives only published stop tags and never borrows another city’s bundled photo", () => {
    const route = tour(45);
    expect(publishedRoutePresentation("lubeck", route, [place])).toMatchObject({ themes: ["history", "architecture"], stops: [place] });
    expect(publishedRoutePresentation("another-city", route, [place]).photo).toBeUndefined();
    expect(publishedRoutePresentation("lubeck", route, [place]).photo?.credit?.licenseName).toBe("CC BY-SA 3.0 DE");
  });
  it("prefers a real route image and does not label it as a particular stop", () => {
    const route = { ...tour(45), media: [{ assetKey: "approved", kind: "image" as const, purpose: "hero" as const, url: "/api/media/approved", mimeType: "image/jpeg", attribution: { text: "Author · license" } }] };
    const result = publishedRoutePresentation("lubeck", route, [place]);
    expect(result.photo).toEqual({ uri: "/api/media/approved", attribution: { text: "Author · license" } });
    expect(result.photoPlace).toBeUndefined();
  });
});
