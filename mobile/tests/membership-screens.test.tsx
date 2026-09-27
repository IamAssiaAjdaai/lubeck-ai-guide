// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPlace } from "../src/lib/api/contracts";
// AsyncStorage uses its real browser adapter in jsdom, shared by both screens.
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de" | "ar" }));
vi.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ citySlug: "lubeck", placeSlug: "holstentor" }),
  useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  Link: ({ children, asChild }: React.PropsWithChildren<{ asChild?: boolean }>) => {
    if (asChild && Array.isArray((children as React.ReactElement<{ style?: unknown }>).props.style)) throw new Error("Slot array");
    return <div>{children}</div>;
  },
}));
vi.mock("react-native", () => ({
  useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
  StyleSheet: { create: (styles: unknown) => styles, flatten: (styles: unknown) => Array.isArray(styles) ? Object.assign({}, ...styles.flat(Infinity).filter(Boolean)) : styles },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Linking: { openURL: vi.fn() },
}));
vi.mock("../src/components/ui", () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  VirtualizedScreen: ({ ListHeaderComponent, data, renderItem }: { ListHeaderComponent: React.ReactNode; data: PublicPlace[]; renderItem: (props: { item: PublicPlace }) => React.ReactNode }) => <main>{ListHeaderComponent}{data.map(item => <div key={item.slug}>{renderItem({ item })}</div>)}</main>,
  MotionView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="alert">{children}</div>,
  EmptyState: ({ title }: { title: string }) => <span>{title}</span>,
  PressableSurface: ({ children, accessibilityLabel }: React.PropsWithChildren<{ accessibilityLabel?: string }>) => <div aria-label={accessibilityLabel}>{children}</div>,
  PrimaryButton: ({ label, busy, disabled, onPress, accessibilityState }: { label: string; busy?: boolean; disabled?: boolean; onPress?: () => void; accessibilityState?: { selected: boolean } }) => <button disabled={busy || disabled} aria-pressed={accessibilityState?.selected} onClick={onPress}>{label}</button>,
}));
vi.mock("../src/components/WalkControls", () => ({ WalkChoices: () => null }));
vi.mock("../src/components/V2Presentation", () => ({ V2Hero: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: () => null }));
vi.mock("../src/components/NativeAudioPlayer", () => ({ NativeAudioPlayer: () => null }));
vi.mock("../src/components/TripProgress", () => ({ TripProgress: () => null }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/components/NativeCityMap", () => ({ NativeCityMap: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => null }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/lib/location.expo", () => ({ expoForegroundLocationAdapter: {} }));
vi.mock("../src/lib/location", () => ({ requestForegroundLocation: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (value: string) => value } }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr", messages: getNativeMessages(state.locale) }) }));
vi.mock("../src/hooks/usePublicContent", () => ({
  usePublicCity: () => ({ status: "available", data: { city, places: [place], tours: [] } }),
  usePublicPlace: () => ({ status: "available", data: { city, place } }),
  useGuideEligibility: () => ({ status: "available", data: { eligible: false } }),
  prefetchPublicCity: async () => undefined, prefetchPublicPlace: async () => undefined,
}));
vi.mock("../src/lib/publicContentCache", () => ({ publicContentCacheKey: () => "city", publicContentCache: { peek: () => ({ city, places: [place], tours: [] }) } }));
import CityScreen from "../src/app/city/[citySlug]/index";
import PlaceScreen from "../src/app/city/[citySlug]/place/[placeSlug]";
import { getNativeMessages } from "../src/lib/localization";
import { loadCurrentWalk, loadSavedPlaces, toggleSavedPlace } from "../src/lib/walkStorage";
import { addPlaceToCurrentWalk } from "../src/lib/walkMembership";
import { uxCopy } from "../src/design/uxCopy";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
const city = { slug: "lubeck", content: { name: "Lübeck" } };
const place: PublicPlace = {
  slug: "holstentor", category: "see", coordinates: { lat: 53.86, lng: 10.68 }, durationMinutes: 15,
  requestedLocale: "en", resolvedLocale: "en", didFallback: false, tags: ["history"], media: [],
  content: { name: "Holstentor", shortDescription: "Historic gate", story: "Published story" },
};
beforeEach(() => { window.localStorage.clear(); state.locale = "en"; });
afterEach(cleanup);
function surfaces() {
  render(<><section aria-label="Explore"><CityScreen /></section><section aria-label="Detail"><PlaceScreen /></section></>);
  return { explore: within(screen.getByRole("region", { name: "Explore" })), detail: within(screen.getByRole("region", { name: "Detail" })) };
}
describe("actual Explore and Detail share current-walk state (native bridges mocked)", () => {
  it.each(["en", "de", "ar"] as const)("adds from Explore and immediately updates Detail in %s", async locale => {
    state.locale = locale; const t = uxCopy(locale), { explore, detail } = surfaces();
    fireEvent.click(await explore.findByRole("button", { name: t.add }));
    await detail.findByRole("button", { name: t.remove, pressed: true });
    expect(explore.getByRole("button", { name: t.remove, pressed: true })).toBeTruthy();
    expect(screen.queryByText(t.included)).toBeNull();
    expect(detail.queryByRole("button", { name: t.add })).toBeNull();
    expect((await loadCurrentWalk("lubeck"))?.journey.remaining).toEqual(["holstentor"]);
  });
  it("adds from Detail and immediately updates Explore", async () => {
    const { explore, detail } = surfaces();
    fireEvent.click(await detail.findByRole("button", { name: "Add to my walk" }));
    await explore.findByRole("button", { name: "Remove from walk", pressed: true });
    expect(detail.getByRole("button", { name: "Remove from walk", pressed: true })).toBeTruthy();
  });
  it("prevents duplicate additions from both screens before either write completes", async () => {
    const { explore, detail } = surfaces();
    const first = await explore.findByRole("button", { name: "Add to my walk" });
    const second = await detail.findByRole("button", { name: "Add to my walk" });
    act(() => { fireEvent.click(first); fireEvent.click(second); });
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Remove from walk", pressed: true })).toHaveLength(2));
    expect((await loadCurrentWalk("lubeck"))?.journey.remaining).toEqual(["holstentor"]);
  });
  it("removes from Detail and updates both screens", async () => {
    await addPlaceToCurrentWalk("lubeck", "holstentor", [place]);
    const { explore, detail } = surfaces();
    fireEvent.click(await detail.findByRole("button", { name: "Remove from walk" }));
    await explore.findByRole("button", { name: "Add to my walk" });
    expect(detail.getByRole("button", { name: "Add to my walk" })).toBeTruthy();
    expect(screen.queryByText("In my walk ✓")).toBeNull();
  });
  it("shows a saved place as not-in-walk and keeps it saved after membership removal", async () => {
    await toggleSavedPlace({ citySlug: "lubeck", slug: "holstentor", name: "Holstentor" });
    expect(await loadSavedPlaces()).toEqual([{ citySlug: "lubeck", slug: "holstentor", name: "Holstentor" }]);
    const { explore, detail } = surfaces();
    await detail.findByRole("button", { name: `${walkCopy("en").saved} ✓` });
    expect(await detail.findByRole("button", { name: "Add to my walk" })).toBeTruthy();
    fireEvent.click(explore.getByRole("button", { name: "Add to my walk" }));
    fireEvent.click(await detail.findByRole("button", { name: "Remove from walk" }));
    await detail.findByRole("button", { name: "Add to my walk" });
    expect(await loadSavedPlaces()).toHaveLength(1);
  });
  it("shows an in-walk place as not-saved", async () => {
    await addPlaceToCurrentWalk("lubeck", "holstentor", [place]);
    const { detail } = surfaces();
    await detail.findByRole("button", { name: "Remove from walk", pressed: true });
    expect(detail.queryByRole("button", { name: "Add to my walk" })).toBeNull();
    expect(detail.getByRole("button", { name: walkCopy("en").saved }).getAttribute("aria-pressed")).toBe("false");
    expect(await loadSavedPlaces()).toEqual([]);
  });
});
