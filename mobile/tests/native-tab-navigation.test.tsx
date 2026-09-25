// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ path: "/", params: {} as Record<string, string>, locale: "en", navigate: vi.fn(), dismissTo: vi.fn() }));
vi.mock("expo-router", () => ({
  usePathname: () => state.path,
  useLocalSearchParams: () => state.params,
  useRouter: () => ({ navigate: state.navigate, dismissTo: state.dismissTo }),
  useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
}));
vi.mock("react-native", () => ({
  StyleSheet: { create: (s: unknown) => s },
  View: ({ children, style, accessibilityRole }: React.PropsWithChildren<{ style: unknown; accessibilityRole?: string }>) => <div role={accessibilityRole} data-style={JSON.stringify(style)}>{children}</div>,
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityState }: React.PropsWithChildren<{ onPress: () => void; accessibilityLabel: string; accessibilityState: { selected: boolean } }>) => <button role="tab" aria-label={accessibilityLabel} aria-selected={accessibilityState.selected} onClick={onPress}>{children}</button>,
}));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("../src/components/LocaleSelector", () => ({ LocaleSelector: () => null }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr" }) }));
import { NativeBottomNavigation } from "../src/components/NativeChrome";
import { NativeTabScrollProvider, useRootTabScroll } from "../src/lib/tabNavigation";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
function Root({ scroll }: { scroll: () => void }) { useRootTabScroll(scroll); return <NativeBottomNavigation />; }
afterEach(() => { cleanup(); vi.clearAllMocks(); state.locale = "en"; });
describe("native active-tab reselection", () => {
  it.each([
    ["/", {}, "home"], ["/city/lubeck", { citySlug: "lubeck" }, "explore"],
    ["/saved", { view: "trips" }, "trips"], ["/saved", {}, "saved"], ["/account", {}, "profile"],
  ] as const)("scrolls %s (%s) to top without replacing navigation history", (path, params, tab) => {
    state.path = path; state.params = params;
    const scroll = vi.fn();
    render(<NativeTabScrollProvider><Root scroll={scroll} /></NativeTabScrollProvider>);
    fireEvent.click(screen.getByRole("tab", { name: walkCopy("en")[tab] }));
    expect(scroll).toHaveBeenCalledOnce();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.dismissTo).not.toHaveBeenCalled();
  });
  it("navigates normally to a different tab", () => {
    state.path = "/"; state.params = {};
    const scroll = vi.fn();
    render(<NativeTabScrollProvider><Root scroll={scroll} /></NativeTabScrollProvider>);
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    expect(state.navigate).toHaveBeenCalledWith("/saved");
    expect(scroll).not.toHaveBeenCalled();
  });
  it("dismisses nested Explore to the city root and scrolls when the root focuses", () => {
    state.path = "/city/lubeck/place/holstentor"; state.params = { citySlug: "lubeck" };
    const scroll = vi.fn();
    const { rerender } = render(<NativeTabScrollProvider><Root scroll={scroll} /></NativeTabScrollProvider>);
    fireEvent.click(screen.getByRole("tab", { name: "Explore" }));
    expect(state.dismissTo).toHaveBeenCalledWith({ pathname: "/city/[citySlug]", params: { citySlug: "lubeck" } });
    expect(scroll).not.toHaveBeenCalled();
    state.path = "/city/lubeck";
    rerender(<NativeTabScrollProvider><Root scroll={scroll} /></NativeTabScrollProvider>);
    expect(scroll).toHaveBeenCalledOnce();
  });
  it("uses one RTL row with localized labels, without double-reversing the tab array", () => {
    state.path = "/"; state.params = {}; state.locale = "ar";
    render(<NativeTabScrollProvider><Root scroll={vi.fn()} /></NativeTabScrollProvider>);
    const t = walkCopy("ar");
    expect(screen.getAllByRole("tab").map(el => el.getAttribute("aria-label"))).toEqual([t.home, t.explore, t.trips, t.saved, t.profile]);
    expect(screen.getByRole("tablist").dataset.style).toContain('"direction":"rtl"');
  });
});
