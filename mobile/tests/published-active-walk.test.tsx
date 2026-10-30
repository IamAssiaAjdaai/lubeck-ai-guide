// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CuratedExecutionState, CuratedProgress } from "@citywalk/traveler-core";
import type { PublicCitySummaryResponse } from "../src/lib/api/contracts";
import type { MobileTripContext } from "../src/lib/tripNavigation";
import { activeWalkCopy } from "../src/lib/activeWalkCopy";
import { resolveActivePublishedTrip } from "../src/lib/activePublishedTrip";
import { PublishedActiveWalk } from "../src/components/PublishedActiveWalk";

const state = vi.hoisted(() => ({ locale: "en", values: new Map<string, string>(), failWrite: false, retry: vi.fn() }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ fontScale: 1 }),
  StyleSheet: { create: (styles: unknown) => styles, flatten: (styles: unknown[]) => Object.assign({}, ...styles.filter(Boolean)) },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
  Link: ({ children, href, asChild }: React.PropsWithChildren<{ href: unknown; asChild?: boolean }>) => {
    if (asChild && Array.isArray((React.Children.only(children) as React.ReactElement<{ style?: unknown }>).props.style)) throw new Error("Expo Slot cannot accept array styles");
    return <a data-route={JSON.stringify(href)}>{children}</a>;
  },
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children, footer }: React.PropsWithChildren<{ footer?: React.ReactNode }>) => <main><section data-testid="active-body">{children}</section><footer data-testid="active-actions">{footer}</footer></main>,
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h2>{children}</h2> : <span>{children}</span>,
  PressableSurface: ({ children, onPress, accessibilityLabel }: React.PropsWithChildren<{ onPress?(): void; accessibilityLabel?: string }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  PrimaryButton: ({ label, onPress, disabled, busy, accessibilityLabel }: { label: string; onPress?(): void; disabled?: boolean; busy?: boolean; accessibilityLabel?: string }) => <button aria-label={accessibilityLabel} disabled={disabled || busy} onClick={onPress}>{label}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
}));
vi.mock("../src/components/NativeCityMap", () => ({
  NativeCityMap: ({ followUserLocation, places, onSelectPlace }: { followUserLocation: boolean; places: { slug: string }[]; onSelectPlace(slug: string): void }) => <div data-testid="stop-map" data-follow={String(followUserLocation)}><button onClick={() => onSelectPlace(places[1].slug)}>Select map stop 2</button></div>,
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: () => null }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => <p>Loading city</p> }));
vi.mock("../src/components/ContentRecovery", () => ({ ContentRecovery: ({ retry }: { retry(): void }) => <button onClick={retry}>Retry content</button> }));
vi.mock("../src/lib/explorePhotography", () => ({ explorePhotography: () => undefined }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (url: string) => url } }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: "ltr", messages: { visitMinutes: state.locale === "de" ? "Min. Besuch" : "min visit" } }) }));
vi.mock("../src/hooks/usePublicContent", () => ({ usePublicCity: () => ({ status: "available", retry: state.retry, data: fixture }) }));
vi.mock("../src/lib/curatedProgressStorage", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/lib/curatedProgressStorage")>();
  const store = {
    getItem: async (key: string) => state.values.get(key) ?? null,
    setItem: async (key: string, value: string) => { if (state.failWrite) throw new Error("Test disk write failed"); state.values.set(key, value); },
  };
  return {
    ...actual,
    openCuratedProgress: (city: string, tour: string, stops: readonly string[]) => actual.openCuratedProgress(city, tour, stops, store),
    updateCuratedProgress: (progress: CuratedProgress, index: number, status: "visited" | "skipped") => actual.updateCuratedProgress(progress, index, status, store),
    changeCuratedExecutionState: (progress: CuratedProgress, phase: CuratedExecutionState) => actual.changeCuratedExecutionState(progress, phase, store),
  };
});

const localized = { requestedLocale: "en" as const, resolvedLocale: "en" as const, didFallback: false };
const fixture: PublicCitySummaryResponse = {
  city: { ...localized, slug: "test-city", content: { name: "Selected City" }, media: [] },
  places: ["first", "second", "third"].map((slug, index) => ({ ...localized, slug, category: "see" as const, coordinates: { lat: 53.8 + index * 0.001, lng: 10.7 }, durationMinutes: 20, content: { name: `${slug} place`, shortDescription: "Published place description" }, media: [] })),
  tours: [{ ...localized, slug: "real-tour", content: { title: "Real published route" }, estimatedDurationMinutes: 45, media: [], stops: [{ placeSlug: "second", position: 2, visitDurationMinutes: 20 }, { placeSlug: "first", position: 1, visitDurationMinutes: 20 }, { placeSlug: "third", position: 3, visitDurationMinutes: 20 }] }],
};
const trip: MobileTripContext = { version: 1, id: "published-real-tour", citySlug: "test-city", source: "published", stopSlugs: ["first", "second", "third"], currentStopIndex: 0 };
const storageKey = "citywalk:native:v1:curated:test-city:real-tour";
function stored(): CuratedProgress { return JSON.parse(state.values.get(storageKey)!); }
function currentRow(index: number, locale = state.locale) {
  return screen.getByRole("button", { name: `${index + 1}. ${trip.stopSlugs[index]} place · ${activeWalkCopy(locale).current}` });
}
async function ready(locale = state.locale) {
  const button = await screen.findByRole("button", { name: activeWalkCopy(locale).mark });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  return button;
}
beforeEach(() => { state.locale = "en"; state.values.clear(); state.failWrite = false; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(["en", "de"])("shows the real %s guest route and keeps stop details outside execution context", async locale => {
  state.locale = locale;
  render(<PublishedActiveWalk trip={trip} />);
  await ready(locale);
  const copy = activeWalkCopy(locale);
  expect(screen.getByRole("heading", { name: "Real published route" })).toBeTruthy();
  expect(screen.getByText(`Selected City · ${copy.active}`)).toBeTruthy();
  expect(currentRow(0, locale)).toBeTruthy();
  const details = screen.getByRole("button", { name: copy.details }).closest("a")!;
  expect(JSON.parse(details.dataset.route!).params).toEqual({ citySlug: "test-city", placeSlug: "first" });
  fireEvent.click(screen.getByRole("button", { name: "Select map stop 2" }));
  const selected = screen.getByRole("button", { name: `${copy.details}: second place` }).closest("a")!;
  expect(JSON.parse(selected.dataset.route!).params).toEqual({ citySlug: "test-city", placeSlug: "second" });
  expect(stored().statuses).toEqual(["pending", "pending", "pending"]);
  expect(document.querySelectorAll('a[data-route*="tripSource"]')).toHaveLength(0);
  expect(screen.queryByText("45 min")).toBeNull();
});

it("uses manual visited/skip actions in editorial order and persists completion", async () => {
  render(<PublishedActiveWalk trip={trip} />);
  const copy = activeWalkCopy("en");
  fireEvent.click(await ready());
  await waitFor(() => expect(stored().statuses).toEqual(["visited", "pending", "pending"]));
  expect(currentRow(1)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: copy.skip }));
  await waitFor(() => expect(stored().statuses).toEqual(["visited", "skipped", "pending"]));
  expect(currentRow(2)).toBeTruthy();
  fireEvent.click(await ready());
  await waitFor(() => expect(stored().statuses).toEqual(["visited", "skipped", "visited"]));
  expect(screen.getByText(`Selected City · ${copy.complete}`)).toBeTruthy();
  expect(screen.queryByRole("button", { name: copy.mark })).toBeNull();
  expect(screen.queryByTestId("stop-map")).toBeNull();
  expect(stored().stopSlugs).toEqual(trip.stopSlugs);
});

it("persists pause, blocks progression and resumes the same cursor explicitly", async () => {
  const view = render(<PublishedActiveWalk trip={trip} />);
  const copy = activeWalkCopy("en");
  fireEvent.click(await ready());
  await waitFor(() => expect(currentRow(1)).toBeTruthy());
  const startedAt = stored().startedAt;
  fireEvent.click(screen.getByRole("button", { name: copy.pause }));
  await waitFor(() => expect(stored().executionState).toBe("paused"));
  expect(screen.queryByRole("button", { name: copy.mark })).toBeNull();
  expect(screen.queryByRole("button", { name: copy.skip })).toBeNull();
  expect(screen.getByTestId("stop-map").dataset.follow).toBe("false");
  expect(currentRow(1)).toBeTruthy();
  view.unmount();
  render(<PublishedActiveWalk trip={trip} />);
  const resume = await screen.findByRole("button", { name: copy.resume });
  await waitFor(() => expect((resume as HTMLButtonElement).disabled).toBe(false));
  expect(stored().executionState).toBe("paused");
  expect(currentRow(1)).toBeTruthy();
  fireEvent.click(resume);
  await ready();
  expect(stored()).toMatchObject({ executionState: "active", startedAt, statuses: ["visited", "pending", "pending"] });
  expect(currentRow(1)).toBeTruthy();
  expect(screen.getByTestId("stop-map").dataset.follow).toBe("true");
});

it("requires End confirmation, restores ended state and resumes without losing the cursor", async () => {
  const view = render(<PublishedActiveWalk trip={trip} />);
  const copy = activeWalkCopy("en");
  fireEvent.click(await ready());
  await waitFor(() => expect(currentRow(1)).toBeTruthy());
  const startedAt = stored().startedAt;
  fireEvent.click(within(screen.getByTestId("active-actions")).getByRole("button", { name: copy.end }));
  expect(screen.getByRole("heading", { name: copy.endQuestion })).toBeTruthy();
  expect(stored().executionState ?? "active").toBe("active");
  fireEvent.click(within(screen.getByTestId("active-body")).getByRole("button", { name: copy.end }));
  await waitFor(() => expect(stored().executionState).toBe("ended"));
  expect(screen.queryByTestId("stop-map")).toBeNull();
  view.unmount();
  render(<PublishedActiveWalk trip={trip} />);
  const resume = await screen.findByRole("button", { name: copy.resume });
  await waitFor(() => expect((resume as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByText(`Selected City · ${copy.ended}`)).toBeTruthy();
  expect(stored().executionState).toBe("ended");
  expect(stored().statuses).toEqual(["visited", "pending", "pending"]);
  fireEvent.click(resume);
  await ready();
  expect(stored()).toMatchObject({ executionState: "active", startedAt, statuses: ["visited", "pending", "pending"] });
  expect(currentRow(1)).toBeTruthy();
});

it("preserves persisted and displayed cursor after a failed write, then retries without false advancement", async () => {
  state.values.set("citywalk:native:v2:active:test-city", "existing custom walk must survive");
  render(<PublishedActiveWalk trip={trip} />);
  const copy = activeWalkCopy("en");
  await ready();
  state.failWrite = true;
  fireEvent.click(screen.getByRole("button", { name: copy.mark }));
  await screen.findByText(copy.error);
  expect(stored().statuses).toEqual(["pending", "pending", "pending"]);
  expect(currentRow(0)).toBeTruthy();
  expect((screen.getByRole("button", { name: copy.mark }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText(copy.saved)).toBeNull();
  state.failWrite = false;
  fireEvent.click(screen.getByRole("button", { name: copy.retry }));
  fireEvent.click(await ready());
  await waitFor(() => expect(currentRow(1)).toBeTruthy());
  expect(stored().statuses).toEqual(["visited", "pending", "pending"]);
  expect(state.values.get("citywalk:native:v2:active:test-city")).toBe("existing custom walk must survive");
});

it("restores the saved cursor on remount even when the entry URL still points to stop one", async () => {
  const view = render(<PublishedActiveWalk trip={trip} />);
  fireEvent.click(await ready());
  await waitFor(() => expect(currentRow(1)).toBeTruthy());
  const saved = structuredClone(stored());
  view.unmount();
  render(<PublishedActiveWalk trip={trip} />);
  await ready();
  expect(currentRow(1)).toBeTruthy();
  expect(stored()).toEqual(saved);
});

it("shows no false saved state if the initial durable write fails", async () => {
  state.failWrite = true;
  render(<PublishedActiveWalk trip={trip} />);
  const copy = activeWalkCopy("en");
  await screen.findByText(copy.error);
  expect(state.values.has(storageKey)).toBe(false);
  expect(screen.queryByText(copy.saved)).toBeNull();
  expect(screen.queryByRole("button", { name: copy.mark })).toBeNull();
  state.failWrite = false;
  fireEvent.click(screen.getByRole("button", { name: copy.retry }));
  await ready();
  expect(currentRow(0)).toBeTruthy();
});

it("resolves only the exact published city/tour/order and rejects unresolved or invented stops", () => {
  expect(resolveActivePublishedTrip(fixture, trip)?.stops.map(({ place }) => place.slug)).toEqual(trip.stopSlugs);
  expect(resolveActivePublishedTrip({ ...fixture, city: { ...fixture.city, slug: "another-city" } }, trip)).toBeUndefined();
  expect(resolveActivePublishedTrip(fixture, { ...trip, id: "published-unknown-tour" })).toBeUndefined();
  expect(resolveActivePublishedTrip(fixture, { ...trip, source: "personalized" })).toBeUndefined();
  expect(resolveActivePublishedTrip(fixture, { ...trip, stopSlugs: ["second", "first", "third"] })).toBeUndefined();
  expect(resolveActivePublishedTrip(fixture, { ...trip, stopSlugs: ["first", "unknown", "third"] })).toBeUndefined();
  expect(resolveActivePublishedTrip({ ...fixture, places: fixture.places.slice(0, 2) }, trip)).toBeUndefined();
});
