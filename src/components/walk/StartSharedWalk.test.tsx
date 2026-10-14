import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { SavedRoute } from "@citywalk/traveler-core";
import StartSharedWalk from "./StartSharedWalk";

vi.mock("./WalkMap", () => ({ default: () => <div>Shared route map</div> }));
vi.mock("@/components/AskGuide", () => ({ default: () => <button>Ask facts</button> }));
vi.mock("@/hooks/useUserLocation", () => ({
  useUserLocation: () => ({ status: "denied", requestLocation: vi.fn() }),
}));

const origin = { lat: 53.86, lng: 10.68 };
const places: DiscoveryPlace[] = ["first", "second", "third"].map((slug, index) => ({
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
  detailHref: "/en/test-city/" + slug,
}));
const route: SavedRoute = {
  citySlug: "test-city",
  stopSlugs: ["second", "first", "third"],
  settings: { minutes: 60, start: origin, walking: "balanced", interests: ["architecture"] },
};
const shareId = "11111111-1111-4111-8111-111111111111";
const session = () => JSON.parse(sessionStorage.getItem("citywalk:v2:active")!);

function mount() {
  return render(
    <StartSharedWalk route={route} places={places} cityName="Test City" locale="en" shareId={shareId} />,
  );
}
function successfulLookup() {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () =>
    Response.json({ version: 1, route }),
  ));
}
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  successfulLookup();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("shared walk guest start", () => {
  it("starts as a guest in snapshot order and tracks visited/skip independently", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start this walk" }));
    const begin = await screen.findByRole("button", { name: "Start walk" });
    expect([...document.querySelectorAll(".walk-itinerary > li")].map(node => node.textContent?.match(/first|second|third/)?.[0]))
      .toEqual(["second", "first", "third"]);
    expect(localStorage.getItem("citywalk:v2:saved")).toBeNull();

    fireEvent.click(begin);
    expect(session().remaining).toEqual(["second", "first", "third"]);
    expect(session().visited).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Mark visited" }));
    expect(session().visited).toEqual(["second"]);
    expect(session().remaining).toEqual(["first", "third"]);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(session().remaining).toEqual(["first", "third"]);
    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(session().remaining).toEqual(["third"]);
    expect(session().visited).toEqual(["second"]);
  });

  it("does not replace an existing active trip without explicit confirmation", async () => {
    const original = JSON.stringify({ citySlug: "old-city", startedAt: 100 });
    sessionStorage.setItem("citywalk:v2:active", original);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start this walk" }));
    expect(await screen.findByRole("alertdialog", { name: "Replace active walk?" })).toBeTruthy();
    expect(sessionStorage.getItem("citywalk:v2:active")).toBe(original);
    fireEvent.click(screen.getByRole("button", { name: "Keep current walk" }));
    expect(sessionStorage.getItem("citywalk:v2:active")).toBe(original);
    expect(screen.queryByRole("button", { name: "Start walk" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start this walk" }));
    await screen.findByRole("alertdialog", { name: "Replace active walk?" });
    fireEvent.click(screen.getByRole("button", { name: "Replace and preview" }));
    expect(sessionStorage.getItem("citywalk:v2:active")).toBe(original);
    fireEvent.click(screen.getByRole("button", { name: "Start walk" }));
    expect(session().citySlug).toBe("test-city");
    expect(session().remaining).toEqual(["second", "first", "third"]);
  });

  it("rejects revoked or missing links on the last-moment public GET", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ error: "Walk unavailable" }, { status: 404 }),
    ));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start this walk" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/unavailable/);
    expect(screen.queryByRole("button", { name: "Start walk" })).toBeNull();
    expect(sessionStorage.getItem("citywalk:v2:active")).toBeNull();
  });

  it("rejects a changed route rather than silently using an outdated snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ version: 1, route: { ...route, stopSlugs: ["first", "second", "third"] } }),
    ));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start this walk" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be verified/);
    expect(screen.queryByRole("button", { name: "Start walk" })).toBeNull();
  });
});
