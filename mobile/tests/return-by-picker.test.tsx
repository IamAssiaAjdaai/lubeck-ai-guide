// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  Platform: { OS: "ios" }, StyleSheet: { create: (value: unknown) => value },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Modal: ({ children, visible }: React.PropsWithChildren<{ visible: boolean }>) => visible ? <section role="dialog">{children}</section> : null,
}));
const state = vi.hoisted(() => ({ locale: "en" }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale }) }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/WalkControls", () => ({ WalkInput: () => null }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  PressableSurface: ({ children, accessibilityLabel, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; onPress: () => void }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
}));
vi.mock("@expo/ui/swift-ui", () => ({
  Host: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DatePicker: ({ selection, onDateChange }: { selection: Date; onDateChange: (date: Date) => void }) => <div><output data-testid="picker-time">{`${selection.getHours()}:${String(selection.getMinutes()).padStart(2, "0")}`}</output><button onClick={() => { const date = new Date(selection); date.setHours(15, 45); onDateChange(date); }}>Choose 15:45</button></div>,
}));
import { ReturnByTimePicker } from "../src/components/ReturnByTimePicker";
afterEach(cleanup);
describe("saved iOS return-by restoration through the picker component", () => {
  it.each(["en", "de"])("opens and reopens the previously saved time in %s", locale => {
    state.locale = locale;
    function Harness() {
      const [value, setValue] = useState("13:25");
      return <ReturnByTimePicker label="Return by" value={value} onChangeText={setValue} placeholder="HH:MM" />;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Return by" }));
    expect(screen.getByTestId("picker-time").textContent).toBe("13:25");
    fireEvent.click(screen.getByRole("button", { name: "Choose 15:45" }));
    fireEvent.click(screen.getByRole("button", { name: locale === "de" ? "Fertig" : "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Return by" }));
    expect(screen.getByTestId("picker-time").textContent).toBe("15:45");
  });
});
