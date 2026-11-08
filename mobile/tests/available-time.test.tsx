// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  PressableSurface: ({ children, accessibilityLabel, accessibilityRole, accessibilityState, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; accessibilityRole: "button" | "radio"; accessibilityState?: { checked: boolean }; onPress: () => void }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} onClick={onPress}>{children}</button>,
  PrimaryButton: ({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
}));
import { AvailableTime } from "../src/components/AvailableTime";
afterEach(cleanup);
describe("Available Time controlled native presentation", () => {
  it.each(["en", "de"] as const)("exposes exclusive selected states and both exits in %s", locale => {
    state.locale = locale; state.fontScale = locale === "de" ? 3.571 : 1;
    const next = vi.fn(); const back = vi.fn(); const changed = vi.fn();
    function Harness() {
      const [minutes, setMinutes] = useState(120);
      return <AvailableTime citySlug="lubeck" cityName="Lübeck" minutes={minutes} onSelect={value => { changed(value); setMinutes(value); }} onContinue={next} onBack={back}><button>Existing deadline picker</button></AvailableTime>;
    }
    render(<Harness />);
    expect(screen.getByRole("heading").textContent).toBe(walkCopy(locale).timeQuestion);
    expect(screen.getByText("Lübeck")).toBeTruthy();
    const cards = screen.getAllByRole("radio"); expect(cards).toHaveLength(4);
    expect(cards[1].getAttribute("aria-checked")).toBe("true");
    fireEvent.click(cards[2]); expect(changed).toHaveBeenCalledWith(180);
    expect(cards[2].getAttribute("aria-checked")).toBe("true"); expect(cards[1].getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: walkCopy(locale).continue }));
    fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Skip for now" : "Vorerst überspringen" }));
    expect(next).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Existing deadline picker" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button")[0]); expect(back).toHaveBeenCalledOnce();
  });
  it("keeps the existing 90-minute account preference visible and selected", () => {
    state.locale = "en";
    render(<AvailableTime citySlug="city" cityName="City" minutes={90} onSelect={vi.fn()} onContinue={vi.fn()} onBack={vi.fn()}>{null}</AvailableTime>);
    const card = screen.getByRole("radio", { name: /90 minutes/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
  });
});
