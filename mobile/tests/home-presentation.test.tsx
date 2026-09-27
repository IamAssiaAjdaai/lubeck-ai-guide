// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  location: vi.fn(),
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
  }: React.PropsWithChildren<{ href: { params: { citySlug: string } } }>) => (
    <a href={`/city/${href.params.citySlug}`}>{children}</a>
  ),
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children, scrollViewRef }: React.PropsWithChildren<{ scrollViewRef: React.Ref<{ scrollTo: typeof state.scroll }> }>) => {
    React.useImperativeHandle(scrollViewRef, () => ({ scrollTo: state.scroll }));
    return <main>{children}</main>;
  },
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  PressableSurface: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
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
vi.mock("../src/components/ImageOverlayHero", () => ({
  ImageOverlayHero: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));
vi.mock("../src/components/NativeContentImage", () => ({
  NativeContentImage: ({
    source,
    accessibilityLabel,
  }: {
    source: { uri: string };
    accessibilityLabel: string;
  }) => <img src={source?.uri} alt={accessibilityLabel} />,
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
    status: "available",
    data: { cities: state.cities },
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
    expect(
      screen.getByRole("img", { name: "Hamburg" }).getAttribute("src"),
    ).toContain("city-hamburg.webp");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
  it("filters real city cards and exposes an empty search state", () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search city" }), {
      target: { value: "Hamburg" },
    });
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "not-a-city" },
    });
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });
  it("keeps denied location non-blocking and city search available", async () => {
    state.location.mockResolvedValueOnce({ status: "denied" });
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await vi.waitFor(() => expect(state.location).toHaveBeenCalledOnce());
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/city/lubeck");
  });
});


it("localizes city cards in Arabic without changing route identity", () => {
  state.locale = "ar";
  render(<HomeScreen />);
  expect(screen.getByText("لوبيك")).toBeTruthy();
  expect(screen.getByText("هامبورغ")).toBeTruthy();
  expect(screen.getByRole("link").getAttribute("href")).toBe("/city/lubeck");
  expect(screen.getByRole("img", { name: "لوبيك" })).toBeTruthy();
});


it("finds the same city using either its Arabic display name or original name", () => {
  state.locale = "ar";
  render(<HomeScreen />);
  for (const value of ["لوبيك", "Lübeck"]) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value } });
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/city/lubeck");
  }
});
