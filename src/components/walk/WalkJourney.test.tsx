import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import { measureWalk, type WalkSettings } from "@/lib/walk/planner";
import WalkJourney from "./WalkJourney";
vi.mock("./WalkMap", () => ({ default: () => <div>Map</div> }));
vi.mock("@/components/AskGuide", () => ({
  default: () => <button>Ask facts</button>,
}));
vi.mock("@/hooks/useUserLocation", () => ({
  useUserLocation: () => ({ status: "denied", requestLocation: vi.fn() }),
}));
const origin = { lat: 53.86, lng: 10.68 };
const places: DiscoveryPlace[] = ["first", "second", "third"].map(
  (slug, index) => ({
    slug,
    name: slug,
    category: "see",
    coordinates: { lat: origin.lat + 0.001 * index, lng: origin.lng },
    durationMinutes: 10,
    duration: "10 min",
    shortDescription: slug,
    tags: ["architecture"],
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
    detailHref: `/en/test-city/${slug}`,
  }),
);
const settings: WalkSettings = {
  minutes: 60,
  start: origin,
  finish: origin,
  walking: "balanced",
  interests: ["architecture"],
};
const session = () => JSON.parse(sessionStorage.getItem("citywalk:v2:active")!);
function mount() {
  render(
    <WalkJourney
      route={measureWalk(places, origin, origin)}
      settings={settings}
      generatedAt={Date.now()}
      places={places}
      locale="en"
      citySlug="test-city"
      cityName="Test City"
      customize={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Start walk" }));
}
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(cleanup);
describe("active walk confirmation and history", () => {
  it("requires confirmation before skipping and does not count skipped stops as visited", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(session().remaining).toEqual(["first", "second", "third"]);
    fireEvent.click(screen.getByRole("button", { name: "Keep current route" }));
    expect(session().remaining).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(session().remaining).toEqual(["second", "third"]);
    expect(session().visited).toEqual([]);
  });
  it("preserves visited history when shortening or returning", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Mark visited" }));
    expect(session().visited).toEqual(["first"]);
    fireEvent.click(screen.getByRole("button", { name: "Shorten" }));
    expect(session().remaining).toEqual(["second", "third"]);
    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(session().visited).toEqual(["first"]);
    expect(session().remaining.length).toBeLessThan(2);
  });
  it("offers explicit return confirmation and navigation when all remaining stops are removed", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take me back" }));
    fireEvent.click(screen.getByRole("button", { name: "Trip start" }));
    expect(session().remaining).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(session().remaining).toEqual([]);
    expect(
      screen.getByRole("link", { name: "Navigate" }).getAttribute("href"),
    ).toContain("destination=53.86,10.68");
  });
  it("finishes with actual visited count, clears active session, and saves a reusable walk", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Mark visited" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish walk" }));
    expect(
      screen.getByRole("heading", { name: "You explored Test City" }),
    ).toBeTruthy();
    expect(sessionStorage.getItem("citywalk:v2:active")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save walk" }));
    expect(
      JSON.parse(localStorage.getItem("citywalk:v2:saved")!)[0].settings.start,
    ).toEqual(origin);
  });
});
