// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { welcomeCopy, welcomePhotos } from "../src/lib/welcomeCopy";

const state = vi.hoisted(() => ({ locale: "en", reduced: false, replace: vi.fn(), push: vi.fn(), back: vi.fn(), canGoBack: true, openURL: vi.fn().mockResolvedValue(undefined) }));
vi.mock("react-native", () => ({
  Platform: { select: () => "sans-serif-condensed" },
  StyleSheet: { create: (s: unknown) => s, absoluteFill: {} },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ScrollView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Modal: ({ children, visible }: React.PropsWithChildren<{ visible: boolean }>) => visible ? <div role="dialog">{children}</div> : null,
  useWindowDimensions: () => ({ height: 844, width: 390, fontScale: 1 }),
  Linking: { openURL: state.openURL },
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div>, useSafeAreaInsets: () => ({ top: 47, bottom: 34 }) }));
vi.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ replace: state.replace, push: state.push, back: state.back, canGoBack: () => state.canGoBack }) }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: ({ transition, source }: { transition: number; source: string }) => <div data-testid="hero" data-transition={transition} data-source={source} /> }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/LocaleSelector", () => ({ LocaleSelector: () => <button>Language</button> }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h1>{children}</h1> : <p role={accessibilityRole}>{children}</p>,
  PrimaryButton: ({ label, onPress, accessibilityLabel, accessibilityRole = "button" }: { label: string; onPress: () => void; accessibilityLabel?: string; accessibilityRole?: string }) => <button role={accessibilityRole} aria-label={accessibilityLabel} onClick={onPress}>{label}</button>,
  PressableSurface: ({ children, onPress, accessibilityLabel, accessibilityRole }: React.PropsWithChildren<{ onPress: () => void; accessibilityLabel: string; accessibilityRole: string }>) => <button role={accessibilityRole === "adjustable" ? "slider" : accessibilityRole} aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
}));
vi.mock("../src/lib/motion", () => ({ useReducedMotion: () => state.reduced }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr" }) }));
import WelcomeScreen from "../src/app/welcome";
import IntroductionScreen from "../src/app/introduction";
import { introductionCopy } from "../src/lib/introductionCopy";

afterEach(() => { cleanup(); vi.clearAllMocks(); state.locale = "en"; state.reduced = false; state.canGoBack = true; });
describe("reference Global Welcome (native bridges mocked)", () => {
  it("opens the optional value story from Get Started", () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    expect(state.push).toHaveBeenCalledExactlyOnceWith("/introduction");
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("Explore Cities enters existing guest discovery directly", () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Explore Cities" }));
    expect(state.replace).toHaveBeenCalledExactlyOnceWith({ pathname: "/", params: { section: "cities" } });
    expect(state.push).not.toHaveBeenCalled();
  });
  it.each(Object.keys(welcomeCopy))("renders %s copy and guest exit", (locale) => {
    state.locale = locale;
    render(<WelcomeScreen />);
    const copy = welcomeCopy[locale as keyof typeof welcomeCopy];
    expect(screen.getByRole("heading").textContent).toBe(copy.title);
    expect(screen.getByRole("button", { name: copy.explore })).toBeTruthy();
  });
  it("cycles four actual editorial photographs without navigating or activating a city", () => {
    render(<WelcomeScreen />);
    const firstSource = screen.getByTestId("hero").getAttribute("data-source");
    const sources = new Set<string | null>();
    for (let i = 0; i < welcomePhotos.length; i++) {
      sources.add(screen.getByTestId("hero").getAttribute("data-source"));
      fireEvent.click(screen.getByRole("slider", { name: `Show photo: ${welcomePhotos[i].city}` }));
      expect(screen.getByRole("slider", { name: `Show photo: ${welcomePhotos[(i + 1) % welcomePhotos.length].city}` })).toBeTruthy();
    }
    expect(sources.size).toBe(4);
    expect(screen.getByTestId("hero").getAttribute("data-source")).toBe(firstSource);
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("disables the photograph transition with reduced motion", () => {
    state.reduced = true;
    render(<WelcomeScreen />);
    expect(screen.getByTestId("hero").getAttribute("data-transition")).toBe("0");
  });
  it.each(welcomePhotos)("shows accurate attribution and working source/license actions for $city", (photo) => {
    render(<WelcomeScreen />);
    for (let i = 0; i < welcomePhotos.indexOf(photo); i++) {
      fireEvent.click(screen.getByRole("slider"));
    }
    fireEvent.click(screen.getByRole("button", { name: "Photo credits" }));
    expect(screen.getByText(photo.credit)).toBeTruthy();
    expect(screen.getByText(photo.licenseName)).toBeTruthy();
    expect(screen.getByText(welcomeCopy.en.inspiration)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "View source photo" }));
    expect(state.openURL).toHaveBeenCalledWith(photo.source);
    fireEvent.click(screen.getByRole("link", { name: "View license" }));
    expect(state.openURL).toHaveBeenCalledWith(photo.license);
  });
  it("recovers from a failed credit link without blocking guest discovery", async () => {
    state.openURL.mockRejectedValueOnce(new Error("offline"));
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Photo credits" }));
    fireEvent.click(screen.getByRole("link", { name: "View source photo" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("could not be opened"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    expect(state.push).toHaveBeenCalledExactlyOnceWith("/introduction");
  });
});


describe("optional Screen 02 value story (native bridges mocked)", () => {
  it.each(Object.keys(introductionCopy))("renders %s value copy with a direct guest skip", locale => {
    state.locale = locale;
    render(<IntroductionScreen />);
    const copy = introductionCopy[locale as keyof typeof introductionCopy];
    expect(screen.getByRole("heading").textContent).toBe(copy.title);
    for (const feature of copy.features) expect(screen.getByText(feature)).toBeTruthy();
    expect(screen.getByText(copy.description.replace(/\s+/g, " "))).toBeTruthy();
    for (const description of copy.featureDescriptions) expect(screen.getByText(description)).toBeTruthy();
    expect(screen.getByText(copy.availability)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: welcomeCopy[locale as keyof typeof welcomeCopy].explore }));
    expect(state.replace).toHaveBeenCalledExactlyOnceWith({ pathname: "/", params: { section: "cities" } });
  });
  it("keeps value cards informational without misleading action controls", () => {
    render(<IntroductionScreen />);
    expect(screen.getAllByRole("button").map(button => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
      "Back", "Language", "Photo credits", "Next", "Explore Cities",
    ]);
  });
  it("Next opens the optional existing account flow", () => {
    render(<IntroductionScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(state.push).toHaveBeenCalledExactlyOnceWith({ pathname: "/account", params: { onboarding: "1" } });
    expect(state.openURL).not.toHaveBeenCalled();
  });
  it("returns to Welcome through existing navigation history", () => {
    render(<IntroductionScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(state.back).toHaveBeenCalledOnce();
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("has a safe Welcome destination when opened directly", () => {
    state.canGoBack = false;
    render(<IntroductionScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(state.replace).toHaveBeenCalledExactlyOnceWith("/welcome");
  });
  it("disables all collage transitions with reduced motion", () => {
    state.reduced = true;
    render(<IntroductionScreen />);
    expect(screen.getAllByTestId("hero")).toHaveLength(3);
    for (const image of screen.getAllByTestId("hero")) expect(image.getAttribute("data-transition")).toBe("0");
  });
  it("exposes the source/license links of every collage photograph", () => {
    render(<IntroductionScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Photo credits" }));
    for (const photo of [welcomePhotos[0], welcomePhotos[1], welcomePhotos[3]]) {
      expect(screen.getByText(photo.credit)).toBeTruthy();
      fireEvent.click(screen.getByRole("link", { name: `View source photo: ${photo.city}` }));
      expect(state.openURL).toHaveBeenCalledWith(photo.source);
      fireEvent.click(screen.getByRole("link", { name: `View license: ${photo.city}` }));
      expect(state.openURL).toHaveBeenCalledWith(photo.license);
    }
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("keeps failed credit links recoverable without blocking the guest skip", async () => {
    state.openURL.mockRejectedValueOnce(new Error("offline"));
    render(<IntroductionScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Photo credits" }));
    fireEvent.click(screen.getByRole("link", { name: "View license: Prague" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("could not be opened"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Explore Cities" }));
    expect(state.replace).toHaveBeenCalledExactlyOnceWith({ pathname: "/", params: { section: "cities" } });
  });

});
