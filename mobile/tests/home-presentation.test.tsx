// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  location: vi.fn(),
  retry: vi.fn(),
  citiesStatus: "available" as "available" | "error",
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
vi.mock("react-native", () => ({
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
  PressableSurface: ({ children, accessibilityRole, onPress }: React.PropsWithChildren<{ accessibilityRole?: "link" | "button"; onPress?: () => void }>) => (
    <div role={accessibilityRole} onClick={onPress}>{children}</div>
  ),
  PrimaryButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => <button onClick={onPress}>{label}</button>,
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
    accessibilityLabel,
  }: {
    source?: { uri?: string };
    accessibilityLabel?: string;
  }) => <img src={source?.uri ?? "bundled-photo"} alt={accessibilityLabel ?? ""} />,
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({
  CitywalkLoading: () => null,
}));
vi.mock("../src/components/MediaAttribution", () => ({
  MediaAttribution: () => null,
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
    ).toBe("bundled-photo");
    expect(
      screen.getByRole("img", { name: "Hamburg" }).getAttribute("src"),
    ).toContain("city-hamburg.webp");
    expect(document.querySelectorAll('a[href="/city/lubeck"]')).toHaveLength(1);
    expect(document.querySelectorAll('a[href="/profile"]')).toHaveLength(1);
    expect(screen.getByText("Featured cities")).toBeTruthy();
    expect(screen.getByText("More cities coming soon")).toBeTruthy();
    expect(screen.getByTestId("citywalk-brand-mark")).toBeTruthy();
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
