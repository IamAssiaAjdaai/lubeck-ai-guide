import { describe, expect, it } from "vitest";
import { cityHubRecommendations } from "../src/lib/cityHubRecommendations";
import type { PublicPlaceCard, PublicTour } from "../src/lib/api/contracts";
import hub from "../src/app/city/[citySlug]/index.tsx?raw";
import hero from "../src/components/CityHubHero.tsx?raw";
const content = { requestedLocale: "en", resolvedLocale: "en", didFallback: false, media: [] };
const places: PublicPlaceCard[] = [
  { ...content, slug: "museum", content: { name: "Museum", shortDescription: "Museum fixture" }, category: "see", durationMinutes: 20, coordinates: { lat: 1, lng: 1 }, tags: ["museum", "history"] },
  { ...content, slug: "cafe", content: { name: "Cafe", shortDescription: "Cafe fixture" }, category: "eat", durationMinutes: 20, coordinates: { lat: 1, lng: 1 }, tags: ["cafe"] },
];
const tours: PublicTour[] = [
  { ...content, slug: "history", content: { title: "History" }, stops: [{ placeSlug: "museum", position: 0 }] },
  { ...content, slug: "food", content: { title: "Food" }, stops: [{ placeSlug: "cafe", position: 0 }] },
];
describe("City Hub published route recommendations", () => {
  it("keeps editorial order for guests without preferences", () => {
    expect(cityHubRecommendations(tours, places)).toBe(tours);
  });
  it("uses real stop tags and canonical planner interests without modifying tours", () => {
    const result = cityHubRecommendations(tours, places, ["food"]);
    expect(result.map(tour => tour.slug)).toEqual(["food", "history"]);
    expect(result[0]).toBe(tours[1]);
    expect(tours[0].slug).toBe("history");
    expect(cityHubRecommendations(tours, places, ["culture"])[0]).toBe(tours[0]);
  });
  it("preserves ties and handles empty/missing published stops", () => {
    expect(cityHubRecommendations(tours, [], ["food"])).toEqual(tours);
    expect(cityHubRecommendations([], places, ["history"])).toEqual([]);
  });
});
describe("Screen 09 integration boundaries", () => {
  it("uses licensed city-specific photography, real city switching, and accessible credits", () => {
    expect(hero).toContain('cityHubBundledPhoto(city.slug)');
    expect(hero).toContain('selectPrimaryImageMedia(city.media');
    expect(hero).toContain('<CityPhotoCredits');
    expect(hero).toContain('href="/?section=cities"');
    expect(hero).toContain('accessibilityLabel={`${name} · ${copy.switch}`}');
    expect(hero).not.toContain('citywalk-waterfront');
  });
  it("preserves virtualized places, actual tours, account ownership and planner navigation", () => {
    expect(hub).toContain('accountInterests?.userId === userId');
    expect(hub).toContain('suggestedTours.map');
    expect(hub).toContain('<VirtualizedScreen');
    // B05: valid/invalid return behavior is asserted against the real rendered Hub
    // in city-hub-actions.test.tsx (B01 and I02/I03), replacing the boolean source contract.
    expect(hub).toContain('requestForegroundLocation');
    expect(hub).not.toContain('UNESCO Old Town · Hanseatic history');
  });
});
