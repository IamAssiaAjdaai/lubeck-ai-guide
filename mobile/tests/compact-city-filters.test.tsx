// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ width: 390, fontScale: 1, locale: "en" }));
const flatten = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
vi.mock("react-native", () => ({
  StyleSheet: { create: (s: unknown) => s }, useWindowDimensions: () => state,
  Text: ({ children, style }: React.PropsWithChildren<{ style?: unknown }>) => <span data-style={JSON.stringify(flatten(style))}>{children}</span>,
  View: ({ children, style, accessibilityRole, accessibilityLabel }: React.PropsWithChildren<{ style?: unknown; accessibilityRole?: string; accessibilityLabel?: string }>) => <div role={accessibilityRole} aria-label={accessibilityLabel} data-style={JSON.stringify(flatten(style))}>{children}</div>,
}));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  PressableSurface: ({ children, onPress, accessibilityRole, accessibilityLabel, accessibilityState, style }: React.PropsWithChildren<{ onPress: () => void; accessibilityRole: string; accessibilityLabel: string; accessibilityState: { checked: boolean }; style: unknown }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState.checked} onClick={onPress} data-style={JSON.stringify(flatten(style))}>{children}</button>,
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ direction: state.locale === "ar" ? "rtl" : "ltr" }) }));
import { WalkChoices } from "../src/components/WalkControls";
import { discoveryCopy } from "../src/design/discoveryCopy";
afterEach(() => { cleanup(); state.width = 390; state.fontScale = 1; state.locale = "en"; });
it.each(["en", "de", "da", "sv", "nl", "es", "ar"])("fills categories equally and adapts live without changing selection in %s", locale => {
  state.locale = locale;
  const t = discoveryCopy(locale), choose = vi.fn();
  const options = (["all", "see", "eat", "fun"] as const).map(value => ({ value, label: t[value] }));
  const renderGroup = () => <WalkChoices label="Places" compact variant="segment" options={options} selected={["see"]} onSelect={choose} />;
  const view = render(renderGroup());
  for (const scale of [1, 1.1, 1.3, 2.5, 1]) {
    state.fontScale = scale; view.rerender(renderGroup());
    expect(JSON.parse(screen.getByRole("radiogroup").dataset.style!)).toMatchObject({ alignSelf: "stretch", width: "100%", flexWrap: scale === 1 ? "nowrap" : "wrap", direction: locale === "ar" ? "rtl" : "ltr" });
    for (const button of screen.getAllByRole("radio")) {
      expect(JSON.parse(button.dataset.style!)).toMatchObject({ flexGrow: 1, flexBasis: scale === 1 ? 0 : "45%", minHeight: 44 });
      expect(JSON.parse(button.querySelector("span")!.dataset.style!)).toMatchObject({ textAlign: "center" });
    }
    expect(screen.getByRole("radio", { name: t.see }).getAttribute("aria-checked")).toBe("true");
  }
  fireEvent.click(screen.getByRole("radio", { name: t.eat }));
  expect(choose).toHaveBeenCalledExactlyOnceWith("eat");
});
it.each([1, 1.1, 1.3, 2.5])("opens List/Map at scale %s with two equal full-width segments", scale => {
  state.fontScale = scale;
  render(<WalkChoices label="View" compact variant="segment" options={[{ value: "list", label: "Liste" }, { value: "map", label: "Karte" }]} selected={["map"]} onSelect={() => {}} />);
  expect(JSON.parse(screen.getByRole("radiogroup").dataset.style!)).toMatchObject({ width: "100%", flexWrap: "nowrap" });
  for (const button of screen.getAllByRole("radio")) expect(JSON.parse(button.dataset.style!)).toMatchObject({ flexGrow: 1, flexBasis: 0, minHeight: 44 });
});
it("leaves existing planner-sized segments unchanged by default", () => {
  render(<WalkChoices label="Walking" variant="segment" options={[{ value: "easy", label: "Easy" }]} selected={["easy"]} onSelect={() => {}} />);
  expect(JSON.parse(screen.getByRole("radio").dataset.style!)).toMatchObject({ minHeight: 56, flex: 1, flexBasis: 0 });
});
