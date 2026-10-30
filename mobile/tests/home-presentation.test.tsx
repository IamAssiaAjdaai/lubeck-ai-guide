// @vitest-environment jsdom
import React from "react";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { CityPhotoCredits } from "../src/components/CityPhotoCredits";
import homeSource from "../src/app/index.tsx?raw";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  openURL: vi.fn().mockResolvedValue(undefined),
  location: vi.fn(),
  retry: vi.fn(),
  citiesStatus: "available" as "available" | "error" | "loading",
  scroll: vi.fn(),
  section: undefined as string | undefined,
  locale: "en",
  cities: [
    {
      slug: "lubeck",
      name: "Lübeck",
      media: [],
      resolvedLocale: "en",
      requestedLocale: "en",
      didFallback: false,
    },
  ],
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("react-native", () => ({
  Linking: { openURL: state.openURL },
  Modal: ({ children }: React.PropsWithChildren) => <div role="dialog">{children}</div>,
  ScrollView: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ fontScale: 1, width: 390, height: 844 }),
  StyleSheet: { create: (s: unknown) => s },
  View: ({ children, onLayout }: React.PropsWithChildren<{ onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void }>) => {
    React.useEffect(() => { onLayout?.({ nativeEvent: { layout: { y: 420 } } }); }, [onLayout]);
    return <div>{children}</div>;
  },
  TextInput: ({
    accessibilityLabel,
    value,
    onChangeText,
  }: {
    accessibilityLabel: string;
    value: string;
    onChangeText: (s: string) => void;
  }) => (
    <input
      aria-label={accessibilityLabel}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
    />
  ),
}));
vi.mock("expo-router", () => ({
  router: { canGoBack: () => false, replace: vi.fn(), back: vi.fn() },
  useLocalSearchParams: () => ({ section: state.section }),
  Link: ({
    children,
    href,
  }: React.PropsWithChildren<{ href: string | { params: { citySlug: string } } }>) => (
    <a href={typeof href === "string" ? href : `/city/${href.params.citySlug}`}>{children}</a>
  ),
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children, scrollViewRef }: React.PropsWithChildren<{ scrollViewRef: React.Ref<{ scrollTo: typeof state.scroll }> }>) => {
    React.useImperativeHandle(scrollViewRef, () => ({ scrollTo: state.scroll }));
    return <main>{children}</main>;
  },
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) =>
    accessibilityRole === "header" ? <h1>{children}</h1> : <span>{children}</span>,
  SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  PressableSurface: ({ children, accessibilityRole, accessibilityLabel, onPress }: React.PropsWithChildren<{ accessibilityRole?: "link" | "button"; accessibilityLabel?: string; onPress?: () => void }>) => (
    <div role={accessibilityRole} aria-label={accessibilityLabel} onClick={onPress}>{children}</div>
  ),
  PrimaryButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => <button onClick={onPress}>{label}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
  EmptyState: ({ title }: { title: string }) => <p role="status">{title}</p>,
}));
vi.mock("expo-image", () => ({
  Image: () => <div data-testid="citywalk-brand-mark" />,
}));
vi.mock("../src/components/LocaleSelector", () => ({
  LocaleSelector: () => <div data-testid="home-locale-selector">English</div>,
}));
vi.mock("../src/components/NativeContentImage", () => ({
  NativeContentImage: ({
    source,
    fallbackSource,
    accessibilityLabel,
  }: {
    source?: { uri?: string };
    fallbackSource?: unknown;
    accessibilityLabel?: string;
  }) => <img src={source?.uri ?? "bundled-photo"} data-has-fallback={fallbackSource ? "true" : "false"} alt={accessibilityLabel ?? ""} />,
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({
  CitywalkLoading: () => null,
}));
vi.mock("../src/components/MediaAttribution", () => ({
  MediaAttribution: ({ attribution }: { attribution?: { text: string } }) => attribution ? <p>{attribution.text}</p> : null,
}));
vi.mock("../src/hooks/usePublicContent", () => ({
  usePublicCities: () => ({
    status: state.citiesStatus,
    data: { cities: state.cities },
    retry: state.retry,
  }),
  prefetchPublicCity: vi.fn(),
}));
vi.mock("../src/lib/api/instance", () => ({
  citywalkApi: { resolveUrl: (url: string) => `https://preview.example${url}` },
}));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/lib/location", () => ({
  requestForegroundLocation: state.location,
}));
vi.mock("../src/lib/location.expo", () => ({
  expoForegroundLocationAdapter: {},
}));
vi.mock("../src/localization/LocaleProvider", () => ({
  useNativeLocale: () => ({
    locale: state.locale,
    direction: state.locale === "ar" ? "rtl" : "ltr",
    messages: { exploreCity: "Explore city", unavailable: "Unavailable" },
  }),
}));
import HomeScreen from "../src/app/index";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.locale = "en";
  state.section = undefined;
  state.citiesStatus = "available";
});
describe("native Home V2 (native bridges mocked)", () => {
  it("returns city-selection Explore to the top on the first tab transition", () => {
    const { rerender } = render(<HomeScreen />);
    state.scroll.mockClear();
    state.section = "cities";
    rerender(<HomeScreen />);
    expect(state.scroll).toHaveBeenCalledExactlyOnceWith({ y: 0, animated: true });
  });
  it("uses V2 copy and published imagery even when the API has no city media", () => {
    render(<HomeScreen />);
    expect(
      screen.getByRole("heading", { name: "Where do you want to explore?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Lübeck" }).getAttribute("src"),
    ).toBe("https://preview.example/landmarks/holstentor.jpg");
    expect(screen.getByRole("img", { name: "Lübeck" }).getAttribute("data-has-fallback")).toBe("true");
    expect(
      screen.getByRole("img", { name: "Hamburg" }).getAttribute("src"),
    ).toContain("city-hamburg.webp");
    expect(document.querySelectorAll('a[href="/city/lubeck"]')).toHaveLength(1);
    expect(document.querySelectorAll('a[href="/profile"]')).toHaveLength(1);
    expect(screen.getByText("Featured cities")).toBeTruthy();
    expect(screen.getByText("More cities coming soon")).toBeTruthy();
    expect(screen.getAllByTestId("citywalk-brand-mark").length).toBeGreaterThan(0);
    expect(homeSource).toContain('homeAppMark from "../../assets/images/citywalk-mark.svg"');
    expect(homeSource).not.toContain('home-city-mark.svg');
    expect(homeSource).toContain('homeMulticityApproved from "../../assets/images/home-multicity-approved.webp"');
    expect(homeSource).toContain("source={homeMulticityApproved}");
    expect(homeSource).not.toContain("HOME_PANORAMA_URI");
    expect(homeSource).not.toContain("HOME_PANORAMA_CREDIT_URL");
  });
  it("filters real city cards and exposes an empty search state", () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search city" }), {
      target: { value: "Hamburg" },
    });
    expect(screen.getByRole("img", { name: "Hamburg" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Lübeck" })).toBeNull();
    expect(document.querySelector('a[href^="/city/"]')).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "not-a-city" },
    });
    expect(screen.queryByRole("img", { name: "Lübeck" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Hamburg" })).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });
  it("keeps denied location non-blocking and city search available", async () => {
    state.location.mockResolvedValueOnce({ status: "denied" });
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await vi.waitFor(() => expect(state.location).toHaveBeenCalledOnce());
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(document.querySelector('a[href="/city/lubeck"]')).toBeTruthy();
  });
});


it("localizes city cards in Arabic without changing route identity", () => {
  state.locale = "ar";
  render(<HomeScreen />);
  expect(screen.getByText("لوبيك")).toBeTruthy();
  expect(screen.getByText("هامبورغ")).toBeTruthy();
  expect(document.querySelector('a[href="/city/lubeck"]')).toBeTruthy();
  expect(screen.getByRole("img", { name: "لوبيك" })).toBeTruthy();
});


it("finds the same city using either its Arabic display name or original name", () => {
  state.locale = "ar";
  render(<HomeScreen />);
  for (const value of ["لوبيك", "Lübeck"]) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value } });
    expect(screen.getByRole("img", { name: "لوبيك" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "هامبورغ" })).toBeNull();
    expect(document.querySelector('a[href="/city/lubeck"]')).toBeTruthy();
  }
});


it("keeps known city photography visible with a safe retry when CMS is unreachable", () => {
  state.citiesStatus = "error";
  render(<HomeScreen />);
  expect(screen.getByRole("img", { name: "Lübeck" })).toBeTruthy();
  expect(screen.getByRole("img", { name: "Hamburg" })).toBeTruthy();
  expect(document.querySelector('a[href="/city/lubeck"]')).toBeNull();
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  expect(screen.getByText("Featured cities")).toBeTruthy();
});


it("keeps incoming cities compact and removes the flat photo-darkening stripe", () => {
  expect(homeSource).toContain('smallItem: { width: "47%", flexGrow: 0');
  expect(homeSource).toContain("imageGradientContainer");
  expect(homeSource).not.toContain("imageBottomShade");
});


it("shows the approved multi-city photo and the official app mark without third-party credits", () => {
  expect(homeSource).toContain('source={homeAppMark}');
  expect(homeSource).toContain('homeAppMark from "../../assets/images/citywalk-mark.svg"');
  expect(homeSource).toContain('homeMulticityApproved from "../../assets/images/home-multicity-approved.webp"');
  expect(homeSource).toContain('source={homeMulticityApproved}');
  expect(homeSource).toContain('contentFit="cover"');
  expect(homeSource).not.toContain("Edelmauswaldgeist");
  expect(homeSource).not.toContain("HOME_PANORAMA_URI");
  expect(homeSource).not.toContain("HOME_PANORAMA_CREDIT_URL");
  expect(homeSource).toContain('case "lubeck": return homeHolstentor;');
});


it("keeps Home preview credits off cards and links to accessible licensing details", () => {
  expect(homeSource).toContain('href="/photo-credits"');
  expect(homeSource).toContain("city.attribution && city.available");
  expect(homeSource).not.toContain('<MediaAttribution attribution={city.attribution} />\n    </View>');
});

describe("Screen 04 reuses existing city discovery", () => {
  it.each(["en", "de"])("uses localized editorial presentation and existing search in %s", locale => {
    state.section = "cities"; state.locale = locale;
    render(<HomeScreen />);
    expect(screen.getByRole("heading").textContent).toContain(locale === "de" ? "Welche Stadt" : "Where would");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hamburg" } });
    expect(screen.getByRole("img", { name: "Hamburg" })).toBeTruthy();
    expect(document.querySelector('a[href^="/city/"]')).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "not-a-city" } });
    expect(screen.getByRole("status")).toBeTruthy();
  });
  it("keeps available city routes guest-accessible with accurate bundled-photo provenance", () => {
    state.section = "cities"; render(<HomeScreen />);
    expect(document.querySelector('a[href="/city/lubeck"]')).toBeTruthy();
    expect(document.querySelector('a[href="/city/hamburg"]')).toBeNull();
    expect(document.querySelector('a[href="/city/duesseldorf"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Photo credits: Lübeck" }));
    expect(screen.getByText(/Christian Wolf/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View license · CC BY-SA 3.0 DE" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Photo credits: Hamburg" }));
    expect(screen.getByText(/Avda/)).toBeTruthy();
  });
  it("does not enable coming-soon cities even when included in the API", () => {
    state.section = "cities";
    const original = state.cities;
    state.cities = [...original, { ...original[0], slug: "hamburg", name: "Hamburg" }];
    try {
      render(<HomeScreen />);
      expect(screen.getAllByRole("img", { name: "Hamburg" })).toHaveLength(1);
      expect(document.querySelector('a[href="/city/hamburg"]')).toBeNull();
    } finally { state.cities = original; }
  });
  it("does not make any city selectable when publication cannot be confirmed", () => {
    state.section = "cities"; state.citiesStatus = "error";
    render(<HomeScreen />);
    expect(document.querySelector('a[href^="/city/"]')).toBeNull();
    expect(screen.getByRole("img", { name: "Lübeck" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.retry).toHaveBeenCalledOnce();
  });
  it("keeps location denial optional and search functional", async () => {
    state.section = "cities"; state.location.mockResolvedValueOnce({ status: "denied" });
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await vi.waitFor(() => expect(state.location).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Lübeck" } });
    expect(document.querySelector('a[href="/city/lubeck"]')).toBeTruthy();
  });
  it("does not require location and never selects a city during loading", () => {
    state.section = "cities"; state.citiesStatus = "loading";
    render(<HomeScreen />);
    expect(state.location).not.toHaveBeenCalled();
    expect(document.querySelector('a[href^="/city/"]')).toBeNull();
  });
});

it("translates existing location feedback when changing language after denial", async () => {
  state.section = "cities"; state.location.mockResolvedValueOnce({ status: "denied" });
  const { rerender } = render(<HomeScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  await vi.waitFor(() => expect(screen.getByText(walkCopy("en").locationHelp)).toBeTruthy());
  state.locale = "de"; rerender(<HomeScreen />);
  expect(screen.getByText(walkCopy("de").locationHelp)).toBeTruthy();
  expect(screen.queryByText(walkCopy("en").locationHelp)).toBeNull();
});

describe("Screen 04 in-card attribution", () => {
  it.each([
    ["Lübeck", "Holstentor in Lübeck Frontseite.jpg", "https://creativecommons.org/licenses/by-sa/3.0/de/", "CC BY-SA 3.0 DE"],
    ["Hamburg", "Hamburg - Elbphilharmonie - 2016-2.jpg", "https://creativecommons.org/licenses/by-sa/3.0/", "CC BY-SA 3.0"],
    ["Düsseldorf", "Rheinturm, Duesseldorf.jpg", "https://creativecommons.org/publicdomain/zero/1.0/", "CC0 1.0"],
  ])("opens independent credits and accurate license for %s", async (city, title, url, license) => {
    state.section = "cities"; render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: `Photo credits: ${city}` }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: `View license · ${license}` }));
    await vi.waitFor(() => expect(state.openURL).toHaveBeenCalledWith(url));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    if (city !== "Lübeck") expect(document.querySelector(`a[href="/city/${city.toLowerCase()}"]`)).toBeNull();
  });
  it("retains modal dismissal after a source-link failure", async () => {
    state.section = "cities"; state.openURL.mockRejectedValueOnce(new Error("offline"));
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Photo credits: Hamburg" }));
    fireEvent.click(screen.getByRole("link", { name: "View source photo" }));
    await vi.waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    expect(state.openURL).toHaveBeenCalledWith("https://commons.wikimedia.org/wiki/File:Hamburg_-_Elbphilharmonie_-_2016-2.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

it("preserves API-supplied creator and source information without a city allowlist", async () => {
  render(<CityPhotoCredits cityName="Published test city" attribution={{ creator: "Test Photographer", text: "Test photo title · https://example.org/source-photo" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Photo credits: Published test city" }));
  expect(screen.getByText(/Test Photographer/)).toBeTruthy();
  fireEvent.click(screen.getByRole("link", { name: "example.org" }));
  await vi.waitFor(() => expect(state.openURL).toHaveBeenCalledWith("https://example.org/source-photo"));
});

it("uses the existing distance sort without auto-selecting a destination", async () => {
  state.section = "cities";
  state.location.mockResolvedValueOnce({ status: "available", location: { latitude: 51.2277, longitude: 6.7735 } });
  render(<HomeScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  await vi.waitFor(() => expect(screen.getByText(walkCopy("en").nearest)).toBeTruthy());
  expect(screen.getAllByRole("img").map(image => image.getAttribute("alt"))).toEqual(["Lübeck", "Düsseldorf", "Hamburg"]);
  expect(document.querySelector('a[href="/city/duesseldorf"]')).toBeNull();
});

it("uses API-backed routes for other published cities without a Lübeck-only selector", () => {
  state.section = "cities";
  const original = state.cities;
  state.cities = [{ ...original[0], slug: "published-test-city", name: "Published test city" }];
  try {
    render(<HomeScreen />);
    expect(document.querySelector('a[href="/city/published-test-city"]')).toBeTruthy();
    expect(document.querySelector('a[href="/city/lubeck"]')).toBeNull();
  } finally { state.cities = original; }
});
