// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de", fontScale: 1, platform: "ios" }));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("expo-router", () => ({ Stack: { Screen: () => null } }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("react-native", () => ({
  Platform: { get OS() { return state.platform; } }, StyleSheet: { create: (v: unknown) => v },
  useWindowDimensions: () => ({ width: 375, height: 667, fontScale: state.fontScale }),
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ScrollView: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("../src/components/LocaleSelector", () => ({ LocaleSelector: () => <button>Language</button> }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: "ltr" }) }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h1>{children}</h1> : <span>{children}</span>,
  PressableSurface: ({ children, accessibilityLabel, accessibilityRole, accessibilityState, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; accessibilityRole: "button" | "radio"; accessibilityState?: { checked: boolean }; onPress: () => void }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} onClick={onPress}>{children}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
  PrimaryButton: ({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) => <button disabled={busy} onClick={onPress}>{label}</button>,
}));
import { LocationPermission } from "../src/components/LocationPermission";
import { locationOnboardingCopy } from "../src/lib/locationOnboardingCopy";
afterEach(cleanup);
describe("Location permission presentation", () => {
  it.each([["en", "ios"], ["de", "ios"], ["en", "android"], ["de", "android"]] as const)("requires an explicit action and preserves the optional exit in %s / %s", (locale, platform) => {
    state.platform = platform;
    state.locale = locale; state.fontScale = 3.571;
    const use = vi.fn(); const skip = vi.fn(); const back = vi.fn(); const copy = locationOnboardingCopy[locale];
    const view = render(<LocationPermission busy={false} onUseLocation={use} onSkip={skip} onBack={back} />);
    expect(use).not.toHaveBeenCalled(); expect(screen.getByRole("heading").textContent).toBe(copy.title);
    fireEvent.click(screen.getByRole("button", { name: copy.skip })); expect(skip).toHaveBeenCalledOnce(); expect(use).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: copy.use })); expect(use).toHaveBeenCalledOnce();
    view.rerender(<LocationPermission busy error="Location unavailable" onUseLocation={use} onSkip={skip} onBack={back} />);
    expect((screen.getByRole("button", { name: copy.use }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: copy.skip }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("Location unavailable");
    expect(screen.getByText(copy.requesting)).toBeTruthy();
  });
});
