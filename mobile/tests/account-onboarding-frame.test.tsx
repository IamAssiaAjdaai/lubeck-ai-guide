// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountOnboardingCopy } from "../src/lib/accountOnboardingCopy";
const state = vi.hoisted(() => ({ locale: "en" as keyof typeof accountOnboardingCopy, height: 667, fontScale: 1, platform: "ios" }));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("expo-router", () => ({ Stack: { Screen: () => null } }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("react-native", () => ({
  Platform: { get OS() { return state.platform; } }, StyleSheet: { create: (v: unknown) => v },
  useWindowDimensions: () => ({ height: state.height, fontScale: state.fontScale }),
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ScrollView: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  KeyboardAvoidingView: ({ children, behavior }: React.PropsWithChildren<{ behavior?: string }>) => <div data-testid="keyboard" data-behavior={behavior}>{children}</div>,
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("../src/components/LocaleSelector", () => ({ LocaleSelector: () => <button>Language</button> }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr" }) }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h1>{children}</h1> : <p>{children}</p>,
  PressableSurface: ({ children, accessibilityLabel, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; onPress: () => void }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
}));
import { AccountOnboardingFrame } from "../src/components/AccountOnboardingFrame";
afterEach(() => { cleanup(); state.platform = "ios"; state.fontScale = 1; });
describe("Screen 03 presentation with native primitives mocked", () => {
  it.each(Object.keys(accountOnboardingCopy) as Array<keyof typeof accountOnboardingCopy>)("retains content, header navigation and guest exit in %s at large text", locale => {
    state.locale = locale; state.fontScale = 3.571;
    const back = vi.fn(); const guest = vi.fn(); const copy = accountOnboardingCopy[locale];
    render(<AccountOnboardingFrame title={copy.title} description={copy.description} onBack={back} footer={<button onClick={guest}>Guest discovery</button>}><button>{copy.email}</button></AccountOnboardingFrame>);
    expect(screen.getByRole("heading").textContent).toBe(copy.title);
    expect(screen.getByRole("button", { name: copy.email })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button")[0]); expect(back).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Guest discovery" })); expect(guest).toHaveBeenCalledOnce();
    expect(screen.getByTestId("keyboard").dataset.behavior).toBe("padding");
  });
  it("allows Android's native window resize behavior", () => {
    state.platform = "android";
    render(<AccountOnboardingFrame title="Account" description="Optional" onBack={() => {}} footer={<button>Guest discovery</button>}>Email form</AccountOnboardingFrame>);
    expect(screen.getByTestId("keyboard").dataset.behavior).toBeUndefined();
  });
});
