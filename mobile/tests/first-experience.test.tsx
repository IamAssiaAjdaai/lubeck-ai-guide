// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de", fontScale: 1 }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (url: string) => `https://qa.invalid${url}` } }));
vi.mock("@citywalk/traveler-core/cityAvailability", () => ({ isCityLaunched: (slug: string) => ["lubeck", "test-city"].includes(slug) }));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: ({ source, accessibilityLabel }: { source?: { uri?: string }; accessibilityLabel: string }) => <img src={source?.uri} alt={accessibilityLabel} /> }));
vi.mock("../src/components/CityPhotoCredits", () => ({ CityPhotoCredits: ({ cityName }: { cityName: string }) => <button>Credits: {cityName}</button> }));
vi.mock("expo-router", () => ({ Stack: { Screen: () => null } }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios" }, StyleSheet: { create: (v: unknown) => v },
  useWindowDimensions: () => ({ width: 375, height: 667, fontScale: state.fontScale }),
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ScrollView: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("../src/components/LocaleSelector", () => ({ LocaleSelector: () => <button>Language</button> }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: "ltr", messages: { unavailable: "City unavailable" } }) }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h1>{children}</h1> : <span>{children}</span>,
  PressableSurface: ({ children, accessibilityLabel, accessibilityRole, accessibilityState, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; accessibilityRole: "button" | "radio"; accessibilityState?: { checked: boolean }; onPress: () => void }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} onClick={onPress}>{children}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
  PrimaryButton: ({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
}));
import { FirstExperience } from "../src/components/FirstExperience";
import { firstExperienceCopy } from "../src/lib/firstExperienceCopy";
afterEach(cleanup);
describe("First Experience city entry", () => {
  it.each(["en", "de"] as const)("uses the selected available city without claiming a route exists in %s", locale => {
    state.locale = locale; state.fontScale = 3.571;
    const explore = vi.fn(); const back = vi.fn();
    render(<FirstExperience citySlug="test-city" cityName="Test City" cityMedia={[{ assetKey: "test-city/hero", kind: "image", purpose: "hero", url: "/test-city.jpg", mimeType: "image/jpeg", attribution: { text: "Licensed test city photo" } }]} onExplore={explore} onBack={back} />);
    expect(screen.getByRole("heading").textContent).toBe(firstExperienceCopy[locale].title);
    expect(screen.getByRole("img", { name: "Test City" }).getAttribute("src")).toBe("https://qa.invalid/test-city.jpg");
    fireEvent.click(screen.getByRole("button", { name: firstExperienceCopy[locale].explore.replace("{city}", "Test City") }));
    expect(explore).toHaveBeenCalledOnce(); expect(screen.queryByText(/Lübeck/)).toBeNull();
    fireEvent.click(screen.getAllByRole("button")[0]); expect(back).toHaveBeenCalledOnce();
  });
  it("does not offer city entry for an unavailable city", () => {
    state.locale = "en";
    render(<FirstExperience citySlug="hamburg" cityName="Hamburg" onExplore={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Explore Hamburg" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("City unavailable");
  });
});


const s08PresentationGap = it;
s08PresentationGap.each(["en", "de"] as const)("[S08 PASS][A01] distinct planning primary and city-browsing secondary in %s", locale => {
  state.locale = locale;
  const continuePlanning = vi.fn(), exploreCity = vi.fn();
  render(<FirstExperience citySlug="test-city" cityName="Test City" onContinue={continuePlanning} onExplore={exploreCity} onBack={vi.fn()} />);
  const planning = screen.getByRole("button", { name: locale === "en" ? "Continue planning" : "Planung fortsetzen" });
  const browse = screen.getByRole("button", { name: firstExperienceCopy[locale].explore.replace("{city}", "Test City") });
  expect(planning).not.toBe(browse);
  fireEvent.click(planning); expect(continuePlanning).toHaveBeenCalledOnce(); expect(exploreCity).not.toHaveBeenCalled();
  fireEvent.click(browse); expect(exploreCity).toHaveBeenCalledOnce();
});
