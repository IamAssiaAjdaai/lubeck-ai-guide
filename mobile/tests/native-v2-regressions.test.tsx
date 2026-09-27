// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de" | "ar" | "da" | "sv" | "nl" | "es", fontScale: 1, staleMessages: false, noAudio: false, noStory: false, placeLoading: false, scrollTo: vi.fn(), showTour: false, focus: undefined as string | undefined, placeSlug: "holstentor", responseSlug: undefined as string | undefined, saved: false, emptySaved: false, reduced: true, entranceFinished: undefined as ((result: { finished: boolean }) => void) | undefined }));
vi.mock("react-native", () => ({
  ActivityIndicator: () => <span role="progressbar" />,
  Text: ({ children, style }: React.PropsWithChildren<{ style?: unknown }>) => <span data-style={JSON.stringify(style)}>{children}</span>,
  StyleSheet: { create: (s: unknown) => s, flatten: (styles: unknown) => Array.isArray(styles) ? Object.assign({}, ...styles.flat(Infinity).filter(Boolean)) : styles },
  useWindowDimensions: () => ({ width: 390, fontScale: state.fontScale }),
  Animated: {
    Value: class { setValue() {} interpolate() { return "0deg"; } },
    timing: (_value: unknown, config: { duration: number }) => ({ start: (callback: typeof state.entranceFinished) => { if (config.duration === 220) state.entranceFinished = callback; }, stop: vi.fn() }),
    loop: () => ({ start: vi.fn(), stop: vi.fn() }),
    View: ({ children, onLayout, testID, accessibilityRole, accessibilityLabel, style }: React.PropsWithChildren<{ onLayout?: () => void; testID?: string; accessibilityRole?: string; accessibilityLabel?: string; style?: unknown }>) => {
      React.useEffect(() => onLayout?.(), [onLayout]);
      return <div data-testid={testID} role={accessibilityRole} aria-label={accessibilityLabel} data-style={JSON.stringify(style)}>{children}</div>;
    },
  },
  View: ({ children, accessibilityRole, accessibilityLabel, testID, style, onLayout }: React.PropsWithChildren<{ accessibilityRole?: string; accessibilityLabel?: string; testID?: string; style?: unknown; onLayout?: (event: unknown) => void }>) =>
    <div role={accessibilityRole} aria-label={accessibilityLabel} data-testid={testID} data-style={JSON.stringify(style)}>{children}{onLayout && testID ? <button onClick={() => onLayout({ nativeEvent: { layout: { y: testID === "place-story-section" ? 120 : 800, width: 342, height: 244 } } })}>Measure {testID}</button> : null}</div>,
}));
vi.mock("expo-image", () => ({ Image: () => <div data-testid="hero-art" /> }));
vi.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ citySlug: "lubeck", placeSlug: state.placeSlug, focus: state.focus }),
  useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  Link: ({ children, href, asChild }: React.PropsWithChildren<{ href: unknown; asChild?: boolean }>) => {
    const child = asChild ? React.Children.only(children) as React.ReactElement<{ style?: unknown }> : undefined;
    // Model Expo Router's actual Slot boundary, before rendering the child.
    if (Array.isArray(child?.props.style)) throw new Error("[expo-router]: You are passing an array of styles to a child of <Slot>.");
    return <a data-route={JSON.stringify(href)} data-child-style={JSON.stringify(child?.props.style)}>{children}</a>;
  },
}));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, variant, style }: React.PropsWithChildren<{ variant?: string; style?: unknown }>) => variant === "heading" ? <h2>{children}</h2> : <span data-style={JSON.stringify(style)}>{children}</span>,
  SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  Screen: ({ children, scrollViewRef }: React.PropsWithChildren<{ scrollViewRef?: React.RefObject<unknown> }>) => {
    React.useLayoutEffect(() => { if (scrollViewRef) scrollViewRef.current = { scrollTo: state.scrollTo }; }, [scrollViewRef]);
    return <main>{children}</main>;
  },
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  VirtualizedScreen: ({ ListHeaderComponent, data, renderItem }: { ListHeaderComponent: React.ReactNode; data: { slug: string }[]; renderItem: (props: { item: { slug: string } }) => React.ReactNode }) => <main>{ListHeaderComponent}{data.map(item => <div key={item.slug}>{renderItem({ item })}</div>)}</main>,
  MotionView: ({ children, onLayout }: React.PropsWithChildren<{ onLayout?: (event: unknown) => void }>) => <div>{children}{onLayout ? <button onClick={() => onLayout({ nativeEvent: { layout: { y: 40 } } })}>Measure content</button> : null}</div>,
  PressableSurface: ({ children, onPress, accessibilityLabel }: React.PropsWithChildren<{ onPress?: () => void; accessibilityLabel: string }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  PrimaryButton: ({ label, onPress, style }: { label: string; onPress?: () => void; style?: unknown }) => <button data-style={JSON.stringify(style)} onClick={onPress}>{label}</button>,
  EmptyState: ({ title, description }: { title: string; description: string }) => <div>{title} {description}</div>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
}));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: ({ style }: { style?: unknown }) => <div data-testid="content-image" data-style={JSON.stringify(style)} /> }));
vi.mock("../src/components/NativeAudioPlayer", () => ({ NativeAudioPlayer: ({ source, title }: { source: string; title: string }) => <audio aria-label={title} src={source} /> }));
vi.mock("../src/components/TripProgress", () => ({ TripProgress: () => null }));
vi.mock("../src/lib/walkStorage", () => ({ loadSavedPlaces: async () => state.saved ? [{ citySlug: "lubeck", slug: "holstentor", name: "Holstentor", savedAt: 1 }] : [], loadSavedWalks: async () => state.saved ? [{ id: "saved-walk", citySlug: "lubeck", remaining: state.emptySaved ? [] : ["holstentor"], visited: [] }] : [], loadActiveWalk: async () => undefined, removeNativeWalk: vi.fn(), toggleSavedPlace: vi.fn() }));
vi.mock("../src/components/NativeCityMap", () => ({ NativeCityMap: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => <div data-testid="place-skeleton" /> }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/lib/motion", () => ({ useReducedMotion: () => state.reduced }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/lib/location.expo", () => ({ expoForegroundLocationAdapter: {} }));
vi.mock("../src/lib/location", () => ({ requestForegroundLocation: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (url: string) => url } }));
vi.mock("../src/hooks/usePublicContent", () => ({
  usePublicPlace: (_city: string, slug: string) => state.placeLoading ? { status: "loading" } : ({ status: "available", data: {
    city: { slug: "lubeck" }, place: { slug: state.responseSlug ?? slug, category: "see", resolvedLocale: "en", durationMinutes: 10,
      content: { name: slug, story: state.noStory ? "  " : `${slug} story` },
      media: state.noAudio ? [] : [{ assetKey: slug, kind: "audio", purpose: "audio", locale: "en", url: `/api/media/${slug}`, mimeType: "audio/mpeg" }],
    },
  } }),
  useGuideEligibility: () => ({ status: "available", data: { eligible: true } }),
  usePublicCity: () => ({ status: "available", data: {
    city: { slug: "lubeck", content: { name: "Lübeck" } }, tours: state.showTour ? [{
      slug: "old-town", resolvedLocale: "en", requestedLocale: state.locale, media: [],
      content: { title: state.locale === "ar" ? "المركز التاريخي لمدينة Lübeck" : "Old Town walk" }, stops: [{ placeSlug: "holstentor", position: 1 }],
    }] : [],
    places: ["holstentor", "marienkirche"].map(slug => ({ slug, category: "see", media: [], resolvedLocale: "de", content: { name: slug }, durationMinutes: 10, tags: ["architecture", "history"] })),
  } }), prefetchPublicPlace: vi.fn(),
}));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr", messages: state.staleMessages ? { ...getNativeMessages(state.locale), audioMissingTitle: undefined, audioMissingDescription: undefined, readText: undefined } : getNativeMessages(state.locale) }) }));
import { t, type TranslationKey } from "@citywalk/i18n";
import { ImageOverlayHero, waterfrontCrop } from "../src/components/ImageOverlayHero";
import { getNativeMessages } from "../src/lib/localization";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import CityScreen from "../src/app/city/[citySlug]/index";
import PlaceScreen from "../src/app/city/[citySlug]/place/[placeSlug]";
import CityAssistantScreen from "../src/app/city/[citySlug]/assistant";
import { cityAssistantContext } from "../src/lib/cityAssistant";
import { discoveryCopy } from "../src/design/discoveryCopy";
import SavedScreen from "../src/app/saved";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
vi.mock("../src/lib/tripStorage", () => ({ loadLocalTrips: async () => [], removeLocalTrip: vi.fn() }));
import { V2Itinerary, V2Loading } from "../src/components/V2Presentation";
beforeEach(() => vi.stubGlobal("require", () => 1)); // Native asset bridge only.
afterEach(() => { cleanup(); vi.unstubAllGlobals(); state.locale = "en"; state.fontScale = 1; state.staleMessages = false; state.noAudio = false; state.noStory = false; state.placeLoading = false; state.scrollTo.mockClear(); state.showTour = false; state.focus = undefined; state.responseSlug = undefined; state.saved = false; state.emptySaved = false; state.reduced = true; state.entranceFinished = undefined; });
describe("native V2 acceptance regressions (native bridges mocked)", () => {
  it("removes English audio and shows German unavailability after changing locale", () => {
    state.placeSlug = "holstentor"; state.focus = "audio";
    const view = render(<PlaceScreen />);
    expect(view.container.querySelector("audio")?.getAttribute("src")).toBe("/api/media/holstentor");
    state.locale = "de";
    view.rerender(<PlaceScreen />);
    expect(view.container.querySelector("audio")).toBeNull();
    expect(screen.getByText(getNativeMessages("de").audioMissingDescription)).toBeTruthy();
  });
  it("renders missing audio copy even if Fast Refresh retains a locale context without new fields", () => {
    state.locale = "de"; state.noAudio = true; state.staleMessages = true;
    render(<PlaceScreen />);
    expect(screen.getByText("Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Text lesen" })).toBeNull();
  });
  it.each(["en", "de", "da", "sv", "nl", "es", "ar"] as const)("renders the actual no-attachment state in %s without a player or Retry", locale => {
    state.locale = locale; state.noAudio = true;
    const view = render(<PlaceScreen />);
    const notice = screen.getByTestId("audio-unavailable-notice");
    expect(notice.textContent).toBe(t(locale, "place.audioMissingDescription"));
    expect(notice.textContent).not.toMatch(/place\.(audioMissing|readText)/);
    expect(within(notice).queryByRole("button")).toBeNull();
    expect(within(notice).queryByRole("heading")).toBeNull();
    const keys = ["place.audioMissingTitle", "place.audioMissingDescription", "place.readText"] as const satisfies readonly TranslationKey[];
    for (const key of keys) {
      expect(t(locale, key).trim()).not.toBe("");
      expect(t(locale, key)).not.toBe(key);
    }
    expect(screen.getByText(getNativeMessages(locale).audioMissingDescription)).toBeTruthy();
    expect(view.container.querySelector("audio")).toBeNull();
    expect(screen.queryByRole("button", { name: getNativeMessages(locale).retry })).toBeNull();
  });
  it.each(["holstentor", "marienkirche"])("Listen reveals the compact absent track notice below %s's existing story", slug => {
    state.locale = "de"; state.noAudio = true; state.focus = "audio"; state.placeSlug = slug;
    render(<PlaceScreen />);
    fireEvent.click(screen.getByText("Measure content"));
    fireEvent.click(screen.getByText("Measure place-story-section"));
    expect(state.scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Measure place-audio-section"));
    expect(state.scrollTo).toHaveBeenLastCalledWith({ y: 840, animated: true });
    expect(screen.getByText(`${slug} story`)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Text lesen" })).toBeNull();
  });
  it("omits Read when there is no readable story", () => {
    state.locale = "de"; state.noAudio = true; state.noStory = true;
    render(<PlaceScreen />);
    expect(screen.getByText("Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Text lesen" })).toBeNull();
    expect(screen.queryByTestId("place-story-section")).toBeNull();
  });
  it("keeps metadata loading separate from confirmed missing audio", () => {
    state.locale = "de"; state.noAudio = true; state.placeLoading = true;
    const view = render(<PlaceScreen />);
    expect(screen.getByTestId("place-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("audio-unavailable-notice")).toBeNull();
    state.placeLoading = false; view.rerender(<PlaceScreen />);
    expect(screen.queryByTestId("place-skeleton")).toBeNull();
    expect(screen.getByText("Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.")).toBeTruthy();
  });
  it("keeps source/availability consistent through EN -> DE -> EN for the same place", () => {
    state.placeSlug = "holstentor"; state.focus = "audio";
    const view = render(<PlaceScreen />);
    expect(view.container.querySelector("audio")?.getAttribute("src")).toBe("/api/media/holstentor");
    state.locale = "de"; state.noAudio = true; view.rerender(<PlaceScreen />);
    expect(view.container.querySelector("audio")).toBeNull();
    expect(screen.getByText("Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.")).toBeTruthy();
    state.locale = "en"; state.fontScale = 1; state.staleMessages = false; state.noAudio = false; view.rerender(<PlaceScreen />);
    expect(view.container.querySelectorAll("audio")).toHaveLength(1);
    expect(view.container.querySelector("audio")?.getAttribute("src")).toBe("/api/media/holstentor");
    expect(screen.queryByTestId("audio-unavailable-notice")).toBeNull();
  });
  it.each(["en", "de", "ar"] as const)("renders one Places heading before filters in %s without removing places", (locale) => {
    state.locale = locale;
    render(<CityScreen />);
    expect(screen.getAllByRole("heading", { name: getNativeMessages(locale).places })).toHaveLength(1);
    expect(screen.getByText(locale === "ar" ? "هولستنتور" : "holstentor")).toBeTruthy();
    expect(screen.getByText(locale === "ar" ? "كنيسة مريم" : "marienkirche")).toBeTruthy();
    const ask = screen.getByRole("button", { name: walkCopy(locale).ask }).closest("a")!;
    expect(JSON.parse(ask.dataset.route!)).toEqual({ pathname: "/city/[citySlug]/assistant", params: { citySlug: "lubeck" } });
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


describe("city assistant entry", () => {
  it.each(["en", "de", "ar"] as const)("opens an honest city-scoped unavailable screen in %s", locale => {
    state.locale = locale;
    expect(cityAssistantContext("lubeck")).toEqual({ type: "city", citySlug: "lubeck" });
    render(<CityAssistantScreen />);
    expect(screen.getByText(getNativeMessages(locale).askCitywalk)).toBeTruthy();
    expect(screen.getByText(locale === "ar" ? "لوبيك" : "Lübeck")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(discoveryCopy(locale).cityAssistantUnavailable);
    expect(document.querySelector('a[data-route*="placeSlug"]')).toBeNull();
  });
});


it("mounts the real progress view before the native entrance completes", () => {
  state.reduced = false;
  const ready = vi.fn(), presented = vi.fn();
  const { rerender } = render(<V2Loading stage="matching" onReady={ready} onPresented={presented} />);
  expect(screen.getByTestId("walk-building-progress")).toBeTruthy();
  expect(screen.getByTestId("build-matching-current")).toBeTruthy();
  expect(ready).toHaveBeenCalledOnce();
  expect(presented).not.toHaveBeenCalled();
  rerender(<V2Loading stage="choosing" onReady={ready} onPresented={presented} />);
  expect(presented).not.toHaveBeenCalled();
  act(() => state.entranceFinished?.({ finished: true }));
  expect(presented).toHaveBeenCalledOnce();
});

it("gives reduced-motion progress a presented frame without a display timer", () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const presented = vi.fn();
  render(<V2Loading stage="matching" onPresented={presented} />);
  expect(screen.getByTestId("build-matching-current")).toBeTruthy();
  expect(presented).not.toHaveBeenCalled();
  act(() => frames.shift()!(0));
  expect(presented).not.toHaveBeenCalled();
  act(() => frames.shift()!(16));
  expect(presented).toHaveBeenCalledOnce();
});


it("uses an Arabic detail name while preserving the original place route and exact audio locale", async () => {
  state.locale = "ar";
  render(<PlaceScreen />);
  expect(await screen.findByText("هولستنتور")).toBeTruthy();
  const ask = screen.getByRole("button", { name: getNativeMessages("ar").askCitywalk }).closest("a")!;
  expect(JSON.parse(ask.dataset.route!).params).toEqual({ citySlug: "lubeck", placeSlug: "holstentor" });
  expect(screen.queryByRole("audio")).toBeNull();
  expect(document.querySelector("audio")).toBeNull(); // Only English audio exists in this fixture.
});


it("localizes previously saved Latin names at render time and preserves removal/link identities", async () => {
  state.saved = true; state.locale = "ar";
  const { rerender } = render(<SavedScreen />);
  expect(await screen.findByText("هولستنتور")).toBeTruthy();
  expect(screen.getByText("لوبيك")).toBeTruthy();
  const route = document.querySelector('a[data-route*="placeSlug"]')! as HTMLElement;
  expect(JSON.parse(route.dataset.route!).params).toEqual({ citySlug: "lubeck", placeSlug: "holstentor" });
  expect(screen.getByRole("button", { name: `${walkCopy("ar").removePlace}: هولستنتور` })).toBeTruthy();
  state.locale = "en";
  rerender(<SavedScreen />);
  expect(await screen.findByText("Holstentor")).toBeTruthy();
});

it("localizes planner itinerary names and keeps the selected stop identity", () => {
  state.locale = "ar";
  const places = [{ slug: "holstentor", content: { name: "Holstentor", shortDescription: "Gate" }, category: "see", durationMinutes: 30, coordinates: { lat: 53.8, lng: 10.7 }, media: [], resolvedLocale: "en", requestedLocale: "ar", didFallback: true }] satisfies PublicPlaceCard[];
  render(<V2Itinerary places={places} citySlug="lubeck" />);
  expect(screen.getByText("هولستنتور")).toBeTruthy();
  const route = document.querySelector('a[data-route*="placeSlug"]')! as HTMLElement;
  expect(JSON.parse(route.dataset.route!).params).toEqual({ citySlug: "lubeck", placeSlug: "holstentor" });
  expect(places[0].content.name).toBe("Holstentor");
});

vi.mock("../src/components/WalkMembershipControl", () => ({ WalkMembershipControl: () => null }));


describe("Expo Router Slot-bound card styles", () => {
  it.each(["en", "de", "ar"] as const)("renders place links with an object style and preserved direction in %s", locale => {
    state.locale = locale;
    render(<CityScreen />);
    const links = [...document.querySelectorAll('a[data-route*="placeSlug"]')] as HTMLElement[];
    expect(links).toHaveLength(2);
    for (const link of links) {
      const style = JSON.parse(link.dataset.childStyle!);
      expect(Array.isArray(style)).toBe(false);
      expect(style).toMatchObject({ direction: locale === "ar" ? "rtl" : "ltr", flexDirection: "row", alignItems: "flex-start", minHeight: 120 });
    }
  });
  it.each(["en", "de", "ar"] as const)("renders a suggested tour through Slot without losing RTL or row layout in %s", locale => {
    state.locale = locale; state.showTour = true;
    render(<CityScreen />);
    const link = document.querySelector('a[data-route*="tourSlug"]') as HTMLElement;
    expect(link).toBeTruthy();
    expect(JSON.parse(link.dataset.childStyle!)).toEqual({ direction: locale === "ar" ? "rtl" : "ltr", flexDirection: "row", overflow: "hidden" });
    expect(JSON.parse(link.dataset.route!).params).toEqual({ citySlug: "lubeck", tourSlug: "old-town" });
    if (locale === "ar") {
      expect(screen.getByText("المركز التاريخي لمدينة لوبيك")).toBeTruthy();
      expect(screen.getByText("العمارة")).toBeTruthy();
      expect(screen.getByText("التاريخ")).toBeTruthy();
    }
  });
});


describe("image-overlay discovery heroes", () => {
  it.each(["de", "ar"] as const)("layers real %s copy and artwork inside one unclamped hero", locale => {
    state.locale = locale;
    const title = walkCopy(locale).homeTitle, subtitle = walkCopy(locale).homeSubtitle;
    render(<ImageOverlayHero title={title} subtitle={subtitle} />);
    const hero = screen.getByTestId("image-overlay-hero");
    fireEvent.click(screen.getByText("Measure image-overlay-hero"));
    expect(within(hero).getByText(title)).toBeTruthy();
    expect(within(hero).getByText(subtitle)).toBeTruthy();
    expect(screen.getAllByText(title)).toHaveLength(1);
    expect(within(hero).getByTestId("content-image")).toBeTruthy();
    const frame = JSON.parse(hero.dataset.style!);
    expect(frame.height).toBeUndefined();
    expect(frame.maxHeight).toBeUndefined();
    expect(frame.minHeight).toBe(244);
    const textStyles = within(hero).getByText(title).dataset.style!;
    expect(textStyles).toContain(locale === "ar" ? '"textAlign":"right"' : '"textAlign":"left"');
    expect(within(hero).getByTestId("content-image").dataset.style).not.toMatch(/scaleX|rotate/);
  });
  it.each([[342, 244], [280, 460], [760, 244]])("fills a %s × %s frame with the approved source region without distortion", (width, height) => {
    const crop = waterfrontCrop(width, height);
    const scale = crop.width / 1200;
    expect(crop.height / 800).toBeCloseTo(scale);
    expect(-crop.left / scale).toBeGreaterThanOrEqual(640 - 1e-8);
    expect(-crop.top / scale).toBeGreaterThanOrEqual(360 - 1e-8);
    expect((width - crop.left) / scale).toBeLessThanOrEqual(1200 + 1e-8);
    expect((height - crop.top) / scale).toBeLessThanOrEqual(760 + 1e-8);
  });
  it("keeps the city identity inside the hero and its planner CTA outside", () => {
    state.locale = "de";
    render(<CityScreen />);
    const hero = screen.getByTestId("image-overlay-hero");
    expect(within(hero).getByText("Lübeck")).toBeTruthy();
    expect(within(hero).getByText(walkCopy("de").hubSubtitle)).toBeTruthy();
    expect(within(hero).queryByRole("button", { name: walkCopy("de").build })).toBeNull();
    expect(screen.getByRole("button", { name: walkCopy("de").build })).toBeTruthy();
  });
});

it.each(["en", "de", "da", "sv", "nl", "es", "ar"] as const)("adapts quick actions/tour cards on mounted %s screens and restores the normal layout", locale => {
  state.locale = locale; state.showTour = true;
  const t = walkCopy(locale);
  const view = render(<CityScreen />);
  for (const scale of [1, 1.1, 1.12, 1.3, 2, 3, 1]) {
    state.fontScale = scale; view.rerender(<CityScreen />);
    const quick = screen.getByRole("button", { name: t.places });
    const style = JSON.parse(quick.dataset.style!);
    expect(style.width).toBe(scale === 1 ? 79.5 : scale === 3 ? 342 : 167);
    expect(style.height).toBeUndefined();
    const start = screen.getByText(getNativeMessages(locale).startTour);
    const linkStyle = JSON.parse(start.closest("a")!.dataset.childStyle!);
    expect(linkStyle.flexDirection).toBe(scale === 1 ? "row" : "column");
    expect(screen.getByRole("button", { name: t.build }).textContent).toBe(t.build);
  }
});
it.each([1.1, 1.3, 2.5])("opens directly with larger text (%s) using stacked tour content", scale => {
  state.fontScale = scale; state.showTour = true;
  render(<CityScreen />);
  expect(JSON.parse(screen.getByText(getNativeMessages("en").startTour).closest("a")!.dataset.childStyle!).flexDirection).toBe("column");
});

it("keeps the chosen category when switching full-width List/Map", () => {
  render(<CityScreen />);
  const t = discoveryCopy("en");
  expect(screen.getByText("holstentor")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: t.eat }));
  expect(screen.queryByText("holstentor")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: t.map }));
  expect(screen.queryByText("holstentor")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: t.list }));
  expect(screen.queryByText("holstentor")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: t.see }));
  expect(screen.getByText("holstentor")).toBeTruthy();
});


it("keeps explicit removal available for historical zero-stop saved records", async () => {
  const { removeNativeWalk } = await import("../src/lib/walkStorage");
  vi.mocked(removeNativeWalk).mockClear();
  state.saved = true; state.emptySaved = true;
  render(<SavedScreen />);
  const remove = await screen.findByRole("button", { name: `${walkCopy("en").removeWalk}: Lübeck` });
  expect(screen.getByText(`0 ${walkCopy("en").stops} · ${walkCopy("en").preview}`)).toBeTruthy();
  expect(removeNativeWalk).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(remove));
  expect(removeNativeWalk).toHaveBeenCalledWith("lubeck", "saved-walk");
});
