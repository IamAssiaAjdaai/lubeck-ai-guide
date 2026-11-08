// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import tripsSource from "../src/app/saved.tsx?raw";

describe("Trips P2 retention presentation", () => {
  it("separates active walks from completed walk records", () => {
    expect(tripsSource).toContain('const isTrips = view === "trips";');
    expect(tripsSource).toContain("const activeTrips = active.filter");
    expect(tripsSource).toContain("const finishedTrips = completedTrips([...account.walks, ...walks], citySlug);");
    expect(tripsSource).toContain("Boolean(walk.finishedAt)");
    expect(tripsSource).toContain("messages.resumeTrip");
    expect(tripsSource).toContain("messages.tripComplete");
  });

  it("keeps active walks resumable without reopening them as saved previews", () => {
    expect(tripsSource).toContain('key={`active:${walk.citySlug}:${walk.id}`}');
    expect(tripsSource).toContain('pathname: "/city/[citySlug]/walk", params: { citySlug: walk.citySlug }');
    expect(tripsSource).toContain("{walk.visited.length}/{totalStops} {t.stops} · {t.resume}");
  });

  it("shows truthful completed-walk metrics in compact grouped rows", () => {
    expect(tripsSource).toContain("tripDuration(walk)");
    expect(tripsSource).toContain("tripDistance(walk.historyDistance)");
    expect(tripsSource).toContain("{walk.visited.length} {t.stops}");
    expect(tripsSource).toContain("tripDate(walk.finishedAt!)");
    expect(tripsSource).toContain("tripGroup");
    expect(tripsSource).toContain("StyleSheet.hairlineWidth");
  });

  it("keeps an explicit build action in the empty Trips state", () => {
    expect(tripsSource).toContain("!activeTrips.length && !finishedTrips.length");
    expect(tripsSource).toContain("<PrimaryButton label={t.build} />");
  });
});
// Real screen and storage functions. Only native presentation, focus delivery,
// account fixtures and AsyncStorage I/O are adapted for controlled timing.
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { getNativeMessages } from "../src/lib/localization";
const fixture = vi.hoisted(() => ({ focused: true, view: "trips", userId: undefined as string | undefined,
  accountWalks: [] as import("@citywalk/traveler-core/walkJourney").WalkJourney[], values: new Map<string, string>(),
  getItem: vi.fn<(key: string) => Promise<string | null>>(), setItem: vi.fn<(key: string, value: string) => Promise<void>>() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: fixture.getItem, setItem: fixture.setItem } }));
vi.mock("expo-router", async () => {
  const React = await import("react");
  return { Stack: { Screen: () => null }, Link: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children),
    useLocalSearchParams: () => ({ view: fixture.view }),
    useFocusEffect: (callback: React.EffectCallback) => React.useEffect(() => fixture.focused ? callback() : undefined, [callback, fixture.focused]) };
});
vi.mock("react-native", async () => { const React = await import("react"); return {
  View: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children), ActivityIndicator: () => null,
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 } }; });
vi.mock("../src/components/ui", async () => {
  const React = await import("react"); const block = ({ children }: React.PropsWithChildren) => React.createElement("div", null, children);
  return { Screen: block, AppText: block, SectionTitle: ({ children }: React.PropsWithChildren) => React.createElement("h2", null, children),
    EmptyState: ({ title }: { title: string }) => React.createElement("p", null, title),
    PressableSurface: ({ children, accessibilityRole, accessibilityLabel, onPress }: React.PropsWithChildren<{ accessibilityRole?: string; accessibilityLabel?: string; onPress?: () => void }>) => React.createElement("button", { role: accessibilityRole, "aria-label": accessibilityLabel, onClick: onPress }, children),
    PrimaryButton: ({ label, onPress }: { label: string; onPress?: () => void }) => React.createElement("button", { onClick: onPress }, label) };
});
vi.mock("../src/components/CitywalkLoading", async () => { const React = await import("react"); return { CitywalkLoading: () => React.createElement("div", { role: "status" }, "Loading") }; });
vi.mock("../src/components/ContentRecovery", async () => { const React = await import("react"); return { ContentRecovery: ({ retry }: { retry?: () => void }) => React.createElement("div", { role: "alert" }, "Read failed", React.createElement("button", { onClick: retry }, "Retry")) }; });
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/lib/accountWalks", () => ({ removeAccountWalk: vi.fn() }));
vi.mock("../src/hooks/useAccountWalks", () => ({ useAccountWalks: () => ({ userId: fixture.userId, walks: fixture.accountWalks, loading: false, error: undefined, refresh: vi.fn() }) }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: "en", direction: "ltr", messages: getNativeMessages("en") }) }));
import SavedScreen from "../src/app/saved";
import * as storage from "../src/lib/walkStorage";
const currentKey = "citywalk:native:v2:active:lubeck", savedKey = "citywalk:native:v2:saved", point = { lat: 0, lng: 0 }, copy = walkCopy("en");
const place: PublicPlaceCard = { slug: "fixture-stop", category: "see", coordinates: point, durationMinutes: 15, tags: ["history"], media: [], requestedLocale: "en", resolvedLocale: "en", didFallback: false, content: { name: "Fixture stop", shortDescription: "Synthetic test content" } };
function journey(id = "current-session"): WalkJourney { return { id, citySlug: "lubeck", remaining: [place.slug], visited: [], position: point, settings: { minutes: 120, interests: ["history"], walking: "balanced", start: point }, historyDistance: 0, startedAt: 10 }; }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
const activeRow = () => screen.findByRole("link", { name: /0\/1 stops/ });
beforeEach(() => {
  fixture.focused = true; fixture.view = "trips"; fixture.userId = undefined; fixture.accountWalks = []; fixture.values.clear();
  fixture.getItem.mockReset().mockImplementation(async key => fixture.values.get(key) ?? null);
  fixture.setItem.mockReset().mockImplementation(async (key, value) => { fixture.values.set(key, value); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Trips live current-walk snapshots", () => {
  it("updates guest Trips opened before real Start commit without refocus", async () => {
    await storage.persistCurrentWalk(journey(), "preview"); const entered = deferred(), release = deferred();
    fixture.setItem.mockImplementation(async (key, value) => { if (key === currentKey) { entered.resolve(); await release.promise; } fixture.values.set(key, value); });
    const starting = storage.startCurrentWalk("lubeck", journey().id, [place]); await entered.promise;
    render(React.createElement(SavedScreen)); await screen.findByText(copy.emptyTrips);
    await act(async () => { release.resolve(); await starting; }); await activeRow();
    expect(screen.queryByText(copy.emptyTrips)).toBeNull(); expect(fixture.setItem).toHaveBeenCalledTimes(2);
    expect((await storage.loadCurrentWalk("lubeck"))?.journey.id).toBe(journey().id);
  });
  it.each([undefined, "test-account"])("refreshes after commit for guest/account %s and keeps saved records", async userId => {
    fixture.userId = userId; const completed = { ...journey("saved-record"), remaining: [], visited: [place.slug], finishedAt: 20 };
    fixture.values.set(savedKey, JSON.stringify([completed])); fixture.accountWalks = userId ? [{ ...completed, id: "account-record" }] : [];
    render(React.createElement(SavedScreen)); await screen.findByText(getNativeMessages("en").tripComplete);
    await act(async () => { await storage.persistCurrentWalk(journey(), "active"); }); await activeRow();
    expect(screen.getByText(getNativeMessages("en").tripComplete)).toBeTruthy();
    expect((await storage.loadSavedWalks()).map(walk => walk.id)).toEqual(["saved-record"]); expect(fixture.setItem).toHaveBeenCalledTimes(1);
  });
  it("rejects an older empty result completing after the newer active result", async () => {
    await storage.persistCurrentWalk(journey(), "preview"); const entered = deferred(), release = deferred(); let held = false;
    fixture.getItem.mockImplementation(async key => { const value = fixture.values.get(key) ?? null; if (key === currentKey && !held) { held = true; entered.resolve(); await release.promise; } return value; });
    render(React.createElement(SavedScreen)); await entered.promise;
    await act(async () => { await storage.persistCurrentWalk(journey(), "active"); }); await activeRow();
    await act(async () => { release.resolve(); }); expect(screen.getByRole("link", { name: /0\/1 stops/ })).toBeTruthy(); expect(screen.queryByText(copy.emptyTrips)).toBeNull();
  });
  it("rejects an older read failure after a newer successful result", async () => {
    const entered = deferred(), release = deferred(); let held = false;
    fixture.getItem.mockImplementation(async key => { if (key === currentKey && !held) { held = true; entered.resolve(); await release.promise; throw Error("old read failed"); } return fixture.values.get(key) ?? null; });
    render(React.createElement(SavedScreen)); await entered.promise;
    await act(async () => { await storage.persistCurrentWalk(journey(), "active"); }); await activeRow(); await act(async () => { release.resolve(); });
    expect(screen.queryByRole("alert")).toBeNull(); expect(screen.getByRole("link", { name: /0\/1 stops/ })).toBeTruthy();
  });
  it("cleans up on repeated blur and unmount and reloads on focus", async () => {
    const original = storage.subscribeCurrentWalk, stops: ReturnType<typeof vi.fn>[] = [];
    const subscribe = vi.spyOn(storage, "subscribeCurrentWalk").mockImplementation((city, listener) => { const stop = vi.fn(original(city, listener)); stops.push(stop); return stop; });
    const view = render(React.createElement(SavedScreen)); await screen.findByText(copy.emptyTrips); expect(subscribe).toHaveBeenCalled();
    for (let i = 0; i < 2; i++) { fixture.focused = false; view.rerender(React.createElement(SavedScreen)); expect(stops.every(stop => stop.mock.calls.length === 1)).toBe(true);
      await act(async () => { await storage.persistCurrentWalk(journey(), "active"); }); fixture.focused = true; view.rerender(React.createElement(SavedScreen)); await activeRow(); }
    view.unmount(); expect(stops.every(stop => stop.mock.calls.length === 1)).toBe(true); fixture.getItem.mockClear(); await storage.persistCurrentWalk(journey(), "active");
    expect(fixture.getItem.mock.calls.some(([key]) => key === savedKey)).toBe(false);
  });
  it("invalidates an in-flight read on blur before publishing a fresh focus result", async () => {
    const entered = deferred(), release = deferred(); let held = false;
    fixture.getItem.mockImplementation(async key => { const value = fixture.values.get(key) ?? null; if (key === currentKey && !held) { held = true; entered.resolve(); await release.promise; } return value; });
    const view = render(React.createElement(SavedScreen)); await entered.promise; fixture.focused = false; view.rerender(React.createElement(SavedScreen)); await act(async () => { release.resolve(); });
    expect(screen.queryByText(copy.emptyTrips)).toBeNull(); await storage.persistCurrentWalk(journey(), "active"); fixture.focused = true; view.rerender(React.createElement(SavedScreen)); await activeRow();
  });
  it("recovers from read failure and refreshes after the next committed change", async () => {
    fixture.getItem.mockRejectedValueOnce(Error("read unavailable")); render(React.createElement(SavedScreen)); await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" })); await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await act(async () => { await storage.persistCurrentWalk(journey(), "active"); }); await activeRow(); expect(screen.queryByRole("alert")).toBeNull();
  });
  it("reads a completed explicit Start on initial focus without another write", async () => {
    await storage.persistCurrentWalk(journey(), "preview");
    await storage.startCurrentWalk("lubeck", journey().id, [place]);
    const before = fixture.setItem.mock.calls.length;
    render(React.createElement(SavedScreen)); await activeRow();
    expect(fixture.setItem).toHaveBeenCalledTimes(before);
  });
  it("keeps a known active row on refresh failure and recovers on retry", async () => {
    await storage.persistCurrentWalk(journey(), "active");
    render(React.createElement(SavedScreen)); await activeRow();
    fixture.getItem.mockImplementation(async key => {
      if (key === savedKey) throw Error("saved read unavailable");
      return fixture.values.get(key) ?? null;
    });
    await act(async () => { await storage.persistCurrentWalk(journey(), "active"); });
    await screen.findByRole("alert");
    expect(screen.getByRole("link", { name: /0\/1 stops/ })).toBeTruthy();
    fixture.getItem.mockImplementation(async key => fixture.values.get(key) ?? null);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull()); await activeRow();
  });
  it("does not turn separately persisted published progress into a custom Trips entry", async () => {
    const { openCuratedProgress, loadCuratedProgress } = await import("../src/lib/curatedProgressStorage");
    render(React.createElement(SavedScreen)); await screen.findByText(copy.emptyTrips);
    await act(async () => { await openCuratedProgress("lubeck", "fixture-tour", [place.slug]); });
    expect(screen.getByText(copy.emptyTrips)).toBeTruthy();
    expect(await storage.loadCurrentWalk("lubeck")).toBeUndefined();
    expect(await loadCuratedProgress("lubeck", "fixture-tour")).toBeTruthy();
  });
  it("preserves saved-walk notifications alongside current-walk changes", async () => {
    await storage.persistCurrentWalk(journey(), "active"); const view = render(React.createElement(SavedScreen)); await activeRow(); fixture.view = "saved"; view.rerender(React.createElement(SavedScreen));
    await act(async () => { await storage.saveNativeWalk(journey(), [place], true, { getItem: fixture.getItem, setItem: fixture.setItem }); });
    await screen.findByRole("link", { name: /1 stops/ }); expect(screen.queryByRole("alert")).toBeNull(); fixture.view = "trips"; view.rerender(React.createElement(SavedScreen)); await activeRow();
  });
});
