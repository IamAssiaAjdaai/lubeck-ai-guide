// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  location: vi.fn(),
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
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
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
  useLocalSearchParams: () => ({}),
  Link: ({
    children,
    href,
  }: React.PropsWithChildren<{ href: { params: { citySlug: string } } }>) => (
    <a href={`/city/${href.params.citySlug}`}>{children}</a>
  ),
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
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
vi.mock("../src/components/V2Presentation", () => ({
  V2Hero: ({ title, subtitle }: { title: string; subtitle: string }) => (
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
    locale: "en",
    direction: "ltr",
    messages: { exploreCity: "Explore city", unavailable: "Unavailable" },
  }),
}));
import HomeScreen from "../src/app/index";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("native Home V2 (native bridges mocked)", () => {
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
