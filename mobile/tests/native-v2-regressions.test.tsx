// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de" | "ar", placeSlug: "holstentor", responseSlug: undefined as string | undefined }));
vi.mock("react-native", () => ({
  StyleSheet: { create: (s: unknown) => s },
  useWindowDimensions: () => ({ width: 390 }),
  Animated: { Value: class { interpolate() { return "0deg"; } }, View: ({ children }: React.PropsWithChildren) => <div>{children}</div> },
  View: ({ children, accessibilityRole, accessibilityLabel, testID, style }: React.PropsWithChildren<{ accessibilityRole?: string; accessibilityLabel?: string; testID?: string; style?: unknown }>) =>
    <div role={accessibilityRole} aria-label={accessibilityLabel} data-testid={testID} data-style={JSON.stringify(style)}>{children}</div>,
}));
vi.mock("expo-image", () => ({ Image: () => <div data-testid="hero-art" /> }));
vi.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ citySlug: "lubeck", placeSlug: state.placeSlug }),
  useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  Link: ({ children, href }: React.PropsWithChildren<{ href: unknown }>) => <a data-route={JSON.stringify(href)}>{children}</a>,
}));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, variant, style }: React.PropsWithChildren<{ variant?: string; style?: unknown }>) => variant === "heading" ? <h2>{children}</h2> : <span data-style={JSON.stringify(style)}>{children}</span>,
  SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  VirtualizedScreen: ({ ListHeaderComponent, data, renderItem }: { ListHeaderComponent: React.ReactNode; data: { slug: string }[]; renderItem: (props: { item: { slug: string } }) => React.ReactNode }) => <main>{ListHeaderComponent}{data.map(item => <div key={item.slug}>{renderItem({ item })}</div>)}</main>,
  MotionView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PressableSurface: ({ children, onPress, accessibilityLabel }: React.PropsWithChildren<{ onPress?: () => void; accessibilityLabel: string }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  PrimaryButton: ({ label, onPress }: { label: string; onPress?: () => void }) => <button onClick={onPress}>{label}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
}));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: () => null }));
vi.mock("../src/components/NativeAudioPlayer", () => ({ NativeAudioPlayer: ({ source, title }: { source: string; title: string }) => <audio aria-label={title} src={source} /> }));
vi.mock("../src/components/TripProgress", () => ({ TripProgress: () => null }));
vi.mock("../src/lib/walkStorage", () => ({ loadSavedPlaces: async () => [], toggleSavedPlace: vi.fn() }));
vi.mock("../src/components/NativeCityMap", () => ({ NativeCityMap: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => null }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/lib/motion", () => ({ useReducedMotion: () => true }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/lib/location.expo", () => ({ expoForegroundLocationAdapter: {} }));
vi.mock("../src/lib/location", () => ({ requestForegroundLocation: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (url: string) => url } }));
vi.mock("../src/hooks/usePublicContent", () => ({
  usePublicPlace: (_city: string, slug: string) => ({ status: "available", data: {
    city: { slug: "lubeck" }, place: { slug: state.responseSlug ?? slug, category: "see", resolvedLocale: "en", durationMinutes: 10,
      content: { name: slug, story: `${slug} story` },
      media: [{ assetKey: slug, kind: "audio", purpose: "audio", locale: "en", url: `/api/media/${slug}`, mimeType: "audio/mpeg" }],
    },
  } }),
  useGuideEligibility: () => ({ status: "available", data: { eligible: true } }),
  usePublicCity: () => ({ status: "available", data: {
    city: { slug: "lubeck", content: { name: "Lübeck" } }, tours: [],
    places: ["holstentor", "marienkirche"].map(slug => ({ slug, category: "see", media: [], resolvedLocale: "de", content: { name: slug }, durationMinutes: 10 })),
  } }), prefetchPublicPlace: vi.fn(),
}));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr", messages: getNativeMessages(state.locale) }) }));
import { getNativeMessages } from "../src/lib/localization";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import CityScreen from "../src/app/city/[citySlug]/index";
import PlaceScreen from "../src/app/city/[citySlug]/place/[placeSlug]";
import { V2Loading } from "../src/components/V2Presentation";
beforeEach(() => vi.stubGlobal("require", () => 1)); // Native asset bridge only.
afterEach(() => { cleanup(); vi.unstubAllGlobals(); state.locale = "en"; state.responseSlug = undefined; });
describe("native V2 acceptance regressions (native bridges mocked)", () => {
  it.each(["en", "de", "ar"] as const)("renders one Places heading before filters in %s without removing places", (locale) => {
    state.locale = locale;
    render(<CityScreen />);
    expect(screen.getAllByRole("heading", { name: getNativeMessages(locale).places })).toHaveLength(1);
    expect(screen.getByText("holstentor")).toBeTruthy();
    expect(screen.getByText("marienkirche")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: walkCopy(locale).ask }));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(document.querySelector('a[data-route*="guide"]')).toBeNull();
  });
  it.each(["en", "de", "ar"] as const)("renders completed/current/upcoming real build states in %s", (locale) => {
    state.locale = locale;
    const { rerender } = render(<V2Loading stage="checking" />);
    const t = walkCopy(locale);
    expect(screen.getByRole("progressbar", { name: t.loading })).toBeTruthy();
    expect(screen.getByTestId("build-matching-completed")).toBeTruthy();
    expect(screen.getByTestId("build-checking-current").textContent).toBe(t.checking);
    expect(screen.getByTestId("build-fitting-upcoming")).toBeTruthy();
    expect(screen.getByTestId("build-choosing-upcoming")).toBeTruthy();
    expect(screen.queryByText(/\d+%/)).toBeNull();
    rerender(<V2Loading stage="choosing" />);
    expect(screen.getByTestId("build-fitting-completed")).toBeTruthy();
    expect(screen.getByTestId("build-choosing-current")).toBeTruthy();
    if (locale === "ar") expect(screen.getByRole("progressbar").dataset.style).toContain('"direction":"rtl"');
  });
});


describe("place detail context (native bridges mocked)", () => {
  it.each(["holstentor", "marienkirche"])("keeps %s story, exact-locale audio and Ask bound across route changes", async (slug) => {
    state.placeSlug = slug;
    const { rerender } = render(<PlaceScreen />);
    expect(await screen.findByText(`${slug} story`)).toBeTruthy();
    expect(screen.getByLabelText(`${slug} Audio guide`).getAttribute("src")).toBe(`/api/media/${slug}`);
    const link = screen.getByRole("button", { name: getNativeMessages("en").askCitywalk }).closest("a")!;
    expect(JSON.parse(link.dataset.route!).params).toEqual({ citySlug: "lubeck", placeSlug: slug });
    state.placeSlug = slug === "holstentor" ? "marienkirche" : "holstentor";
    rerender(<PlaceScreen />);
    expect(await screen.findByText(`${state.placeSlug} story`)).toBeTruthy();
    expect(screen.queryByText(`${slug} story`)).toBeNull();
    expect(screen.getByLabelText(`${state.placeSlug} Audio guide`).getAttribute("src")).toBe(`/api/media/${state.placeSlug}`);
  });
  it("rejects a Schiffergesellschaft payload for a Holstentor route instead of displaying another place", async () => {
    state.placeSlug = "holstentor"; state.responseSlug = "schiffergesellschaft";
    render(<PlaceScreen />);
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.queryByText("holstentor story")).toBeNull();
    expect(screen.queryByRole("button", { name: getNativeMessages("en").askCitywalk })).toBeNull();
  });
});
