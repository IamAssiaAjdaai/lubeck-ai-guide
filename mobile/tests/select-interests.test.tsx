// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Interest } from "@citywalk/traveler-core/walkPlanner";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de", fontScale: 1 }));
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
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: "ltr" }) }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h1>{children}</h1> : <span>{children}</span>,
  PressableSurface: ({ children, accessibilityLabel, accessibilityRole, accessibilityState, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; accessibilityRole: "button" | "checkbox"; accessibilityState?: { checked: boolean }; onPress: () => void }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} onClick={onPress}>{children}</button>,
  PrimaryButton: ({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
}));
import { SelectInterests } from "../src/components/SelectInterests";
afterEach(cleanup);
describe("Screen 05 controlled native presentation", () => {
  it.each(["en", "de"] as const)("supports multiple choices, empty state, guest exit and city context in %s", locale => {
    state.locale = locale; state.fontScale = locale === "de" ? 3.571 : 1;
    const next = vi.fn(); const skip = vi.fn(); const back = vi.fn(); const changed = vi.fn();
    function Harness() {
      const [selected, setSelected] = useState<Interest[]>([]);
      return <SelectInterests citySlug="lubeck" cityName="Lübeck" selected={selected} onToggle={key => { changed(key); setSelected(values => values.includes(key) ? values.filter(value => value !== key) : [...values, key]); }} onContinue={next} onSkip={skip} onBack={back} />;
    }
    render(<Harness />);
    expect(screen.getByRole("heading").textContent).toBe(locale === "en" ? "What interests you most?" : "Was interessiert dich am meisten?");
    expect(screen.getByText("Lübeck")).toBeTruthy();
    const continueButton = screen.getByRole("button", { name: walkCopy(locale).continue }) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(true);
    const cards = screen.getAllByRole("checkbox"); expect(cards).toHaveLength(7);
    fireEvent.click(cards[0]); fireEvent.click(cards[1]);
    expect(cards[0].getAttribute("aria-checked")).toBe("true"); expect(cards[1].getAttribute("aria-checked")).toBe("true");
    expect(changed.mock.calls.map(args => args[0])).toEqual(["history", "food"]);
    expect(continueButton.disabled).toBe(false); fireEvent.click(continueButton); expect(next).toHaveBeenCalledOnce();
    fireEvent.click(cards[0]); fireEvent.click(cards[1]); expect(continueButton.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Skip for now" : "Vorerst überspringen" })); expect(skip).toHaveBeenCalledOnce();
    fireEvent.click(screen.getAllByRole("button")[0]); expect(back).toHaveBeenCalledOnce();
  });
});
