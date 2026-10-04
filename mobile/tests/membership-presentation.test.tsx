// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SharedLocale } from "@citywalk/i18n";
const state = vi.hoisted(() => ({ locale: "en" as SharedLocale, included: false, status: "available" as "available" | "loading" | "error", retry: vi.fn().mockResolvedValue(undefined) }));
function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}
vi.mock("react-native", () => ({
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  View: ({ children, style, accessibilityLabel, accessibilityElementsHidden }: React.PropsWithChildren<{ style?: unknown; accessibilityLabel?: string; accessibilityElementsHidden?: boolean }>) => <div data-style={JSON.stringify(flatten(style))} aria-label={accessibilityLabel} aria-hidden={accessibilityElementsHidden}>{children}</div>,
  Text: ({ children, style, numberOfLines, adjustsFontSizeToFit, allowFontScaling }: React.PropsWithChildren<{ style?: unknown; numberOfLines?: number; adjustsFontSizeToFit?: boolean; allowFontScaling?: boolean }>) => <span data-style={JSON.stringify(flatten(style))} data-lines={numberOfLines} data-fit={adjustsFontSizeToFit} data-scaling={allowFontScaling}>{children}</span>,
  Pressable: ({ children, style, onPress, accessibilityState, accessibilityHint, disabled }: React.PropsWithChildren<{ style?: unknown; onPress?: () => void; accessibilityState?: { selected?: boolean }; accessibilityHint?: string; disabled?: boolean }>) => <button data-style={JSON.stringify(flatten(typeof style === "function" ? style({ pressed: false }) : style))} aria-pressed={accessibilityState?.selected} data-hint={accessibilityHint} disabled={disabled} onClick={onPress}>{children}</button>,
  ActivityIndicator: () => <span role="progressbar" />,
}));
vi.mock("expo-router", () => ({ Link: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("../src/components/NativeChrome", () => ({ NativeBrand: () => null, NativeBottomNavigation: () => null }));
vi.mock("../src/lib/tabNavigation", () => ({ useRootTabScroll: vi.fn() }));
vi.mock("../src/lib/motion", () => ({ useReducedMotion: () => true }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: ({ ios, color }: { ios: string; color?: string }) => <span data-testid="membership-icon" data-icon={ios} data-color={color} /> }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr", messages: getNativeMessages(state.locale) }) }));
vi.mock("../src/hooks/useCurrentWalk", () => ({ useCurrentWalk: () => ({ status: state.status, retry: state.retry, current: state.included ? { phase: "active", journey: { remaining: ["holstentor"], visited: [] } } : undefined }), refreshCurrentWalk: vi.fn() }));
vi.mock("../src/hooks/usePublicContent", () => ({ prefetchPublicCity: vi.fn() }));
import { getNativeMessages } from "../src/lib/localization";
import { uxCopy } from "../src/design/uxCopy";
import { colors } from "../src/design/tokens";
import { WalkMembershipControl } from "../src/components/WalkMembershipControl";
import { PrimaryButton } from "../src/components/ui";
afterEach(() => { cleanup(); state.locale = "en"; state.included = false; state.status = "available"; state.retry.mockClear(); });
function buttonStyle(button: HTMLElement) { return JSON.parse(button.dataset.style!); }

describe("real membership/button presentation (native bridges mocked)", () => {
  it.each(["en", "de", "da", "sv", "nl", "es", "ar"] as const)("keeps full-width Add/Remove and one inline membership row in %s", locale => {
    state.locale = locale;
    const t = uxCopy(locale);
    const { rerender } = render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense />);
    const add = screen.getByRole("button", { name: t.add });
    const addStyle = buttonStyle(add);
    expect(addStyle).toMatchObject({ alignSelf: "stretch", minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 });
    expect(addStyle.width).toBeUndefined();
    expect(addStyle.maxWidth).toBeUndefined();
    expect(addStyle.height).toBeUndefined();
    expect(screen.queryByTestId("membership-icon")).toBeNull();
    expect(screen.getByText(t.add).dataset.lines).toBeUndefined();
    expect(screen.getByText(t.add).dataset.fit).toBe("false");
    expect(screen.getByText(t.add).dataset.scaling).not.toBe("false");
    state.included = true;
    rerender(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense />);
    const remove = screen.getByRole("button", { name: t.remove, pressed: true });
    const removeStyle = buttonStyle(remove);
    for (const key of ["alignSelf", "minHeight", "height", "paddingVertical", "paddingHorizontal", "borderRadius", "width", "maxWidth"]) expect(removeStyle[key]).toEqual(addStyle[key]);
    expect(remove.dataset.hint).toBe(t.included);
    expect(screen.queryByText(t.included)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    const icon = within(remove).getByTestId("membership-icon");
    expect(icon.dataset.icon).toBe("checkmark");
    const row = within(remove).getByText(t.remove).parentElement!;
    expect(row.contains(icon)).toBe(true);
    expect(JSON.parse(row.dataset.style!)).toMatchObject({ flexDirection: "row", alignItems: "center", gap: 8, direction: locale === "ar" ? "rtl" : "ltr" });
    expect(remove.parentElement?.children).toHaveLength(1);
  });
  it("retains the same responsive width rule through EN -> DE -> EN", () => {
    const { rerender } = render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense />);
    const initial = buttonStyle(screen.getByRole("button"));
    for (const locale of ["de", "en"] as const) {
      state.locale = locale;
      rerender(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense />);
      expect(buttonStyle(screen.getByRole("button", { name: uxCopy(locale).add }))).toEqual(initial);
    }
  });
  it("keeps read-only saved membership accessible without a visible sentence or new action", () => {
    state.included = true;
    render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" readOnly />);
    expect(screen.getByLabelText(uxCopy("en").included)).toBeTruthy();
    expect(screen.queryByText(uxCopy("en").included)).toBeNull();
    expect(screen.getByTestId("membership-icon")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("stretches ordinary text actions and allows labels to grow while letting compact labels grow without auto-shrinking", () => {
    const { rerender } = render(<PrimaryButton label="A long action" />);
    expect(buttonStyle(screen.getByRole("button"))).toMatchObject({ alignSelf: "stretch", minHeight: 52, borderRadius: 16 });
    expect(screen.getByText("A long action").dataset.lines).toBeUndefined();
    rerender(<PrimaryButton compact label="Quick action" />);
    expect(buttonStyle(screen.getByRole("button")).alignSelf).toBeUndefined();
    expect(screen.getByText("Quick action").dataset.lines).toBeUndefined();
    expect(screen.getByText("Quick action").dataset.fit).toBe("false");
  });

  it.each(["en", "de", "da", "sv", "nl", "es", "ar"] as const)("opts into bounded outlined discovery actions without truncating labels in %s", locale => {
    state.locale = locale;
    const t = uxCopy(locale);
    const { rerender } = render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense inline />);
    const add = screen.getByRole("button", { name: t.add });
    const addStyle = buttonStyle(add);
    expect(addStyle).toMatchObject({ alignSelf: "flex-start", maxWidth: "100%", minHeight: 44, backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 });
    expect(addStyle.width).toBeUndefined();
    expect(addStyle.height).toBeUndefined();
    expect(within(add).getByTestId("membership-icon").dataset).toMatchObject({ icon: "plus", color: colors.primary });
    expect(screen.getByText(t.add).dataset.lines).toBeUndefined();
    expect(screen.getByText(t.add).dataset.fit).toBe("false");
    expect(screen.getByText(t.add).dataset.scaling).not.toBe("false");
    const row = screen.getByText(t.add).parentElement!;
    expect(JSON.parse(row.dataset.style!)).toMatchObject({ width: "auto", maxWidth: "100%", flexDirection: "row", direction: locale === "ar" ? "rtl" : "ltr" });

    state.included = true;
    rerender(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense inline />);
    const remove = screen.getByRole("button", { name: t.remove, pressed: true });
    expect(buttonStyle(remove)).toEqual(addStyle);
    expect(remove.dataset.hint).toBe(t.included);
    expect(within(remove).getByTestId("membership-icon").dataset.icon).toBe("checkmark");
    expect(screen.getByText(t.remove).dataset.lines).toBeUndefined();
    expect(JSON.parse(screen.getByText(t.remove).parentElement!.dataset.style!)).toMatchObject({ width: "auto", maxWidth: "100%" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps inline loading disabled and retry on the same bounded secondary action", () => {
    state.status = "loading";
    const { rerender } = render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense inline />);
    const checking = screen.getByRole("button", { name: uxCopy("en").checking });
    expect((checking as HTMLButtonElement).disabled).toBe(true);
    expect(buttonStyle(checking)).toMatchObject({ alignSelf: "flex-start", maxWidth: "100%", minHeight: 44, backgroundColor: colors.surface });
    state.status = "error";
    rerender(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense inline />);
    const retry = screen.getByRole("button", { name: getNativeMessages("en").retry });
    expect(buttonStyle(retry)).toMatchObject({ alignSelf: "flex-start", maxWidth: "100%", minHeight: 44, backgroundColor: colors.surface });
    expect((retry as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(retry);
    expect(state.retry).toHaveBeenCalledOnce();
  });

  it("preserves the default solid compact Detail action", () => {
    render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" dense compact />);
    const add = screen.getByRole("button", { name: uxCopy("en").add });
    expect(buttonStyle(add)).toMatchObject({ alignSelf: "stretch", minHeight: 64, backgroundColor: colors.primary });
    expect(buttonStyle(add).maxWidth).toBeUndefined();
    expect(within(add).getByTestId("membership-icon").dataset.color).toBe("#FFFFFF");
    expect(JSON.parse(screen.getByText(uxCopy("en").add).parentElement!.dataset.style!)).toMatchObject({ width: "100%" });
  });
});
