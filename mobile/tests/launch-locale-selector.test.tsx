// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocaleLabel, launchLocales, t } from "@citywalk/i18n";
vi.mock("react-native", () => ({
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
  View: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => <div role={accessibilityRole}>{children}</div>,
  ScrollView: ({ children }: React.PropsWithChildren) => <div data-testid="language-scroll">{children}</div>,
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Modal: ({ children, visible }: React.PropsWithChildren<{ visible: boolean }>) => visible ? <div role="dialog">{children}</div> : null,
  Pressable: ({ children, accessibilityLabel, accessibilityRole, accessibilityState, onPress }: React.PropsWithChildren<{ accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: { checked?: boolean }; onPress(): void }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} onClick={onPress}>{children}</button>,
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn(async () => undefined) }));
vi.mock("../src/components/ui", () => ({ AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span> }));
vi.mock("../src/localization/localePreference", () => ({ deviceLocale: () => "en", localePreference: { read: async () => null, write: async () => undefined } }));
import { LocaleSelector } from "../src/components/LocaleSelector";
import { NativeLocaleProvider, useNativeLocale } from "../src/localization/LocaleProvider";
function Example() {
  const { locale, direction, messages } = useNativeLocale();
  return <><LocaleSelector showLabel /><output data-testid="locale">{locale}/{direction}</output><p>{messages.sendQuestion}</p></>;
}
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
describe("single native launch-language selector", () => {
  it.each(launchLocales)("selects %s with its full native label and shared copy", locale => {
    vi.stubEnv("NODE_ENV", "production");
    render(<NativeLocaleProvider><Example /></NativeLocaleProvider>);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(screen.getAllByRole("radio").map(element => element.textContent)).toEqual(launchLocales.map(getLocaleLabel));
    expect(screen.getByTestId("language-scroll")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: getLocaleLabel(locale) }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("locale").textContent).toBe(`${locale}/ltr`);
    expect(screen.getByText(t(locale, "assistant.sendQuestion"))).toBeTruthy();
  });
  it("retains experimental Arabic and its RTL metadata in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<NativeLocaleProvider><Example /></NativeLocaleProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    fireEvent.click(screen.getByRole("radio", { name: "العربية" }));
    expect(screen.getByTestId("locale").textContent).toBe("ar/rtl");
  });
});
