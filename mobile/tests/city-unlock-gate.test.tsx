// @vitest-environment jsdom
import React, { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sharedLocales, t } from "@citywalk/i18n";

const mocks = vi.hoisted(() => ({ account: undefined as string | undefined, locale: "en", access: vi.fn(), push: vi.fn() }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { useSession: () => ({ data: mocks.account ? { user: { id: mocks.account } } : null, isPending: false }) } }));
vi.mock("../src/lib/cityUnlockAccess", () => ({ readCityUnlock: mocks.access }));
vi.mock("../src/lib/nativeBillingRuntime", () => ({nativeBilling:{product: async()=>undefined,subscribe:()=>()=>{}}}));
vi.mock("expo-router", () => ({ router: { push: mocks.push }, useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: mocks.locale }) }));
vi.mock("react-native", () => ({ View: ({ children }: React.PropsWithChildren) => <div>{children}</div>, Modal: ({ visible, children }: React.PropsWithChildren<{ visible: boolean }>) => visible ? <div role="dialog">{children}</div> : null }));
vi.mock("../src/components/ImageOverlayHero", () => ({ ImageOverlayHero: ({ title, subtitle }: { title: string; subtitle: string }) => <header><h1>{title}</h1><p>{subtitle}</p></header> }));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="status">{children}</div>,
  PrimaryButton: ({ label, onPress, disabled, busy }: { label: string; onPress(): void; disabled?: boolean; busy?: boolean }) => <button onClick={onPress} disabled={disabled || busy}>{label}</button>,
}));
import { CityUnlockGate, PreviewCityUnlockGate } from "../src/components/CityUnlockGate";

beforeEach(() => { vi.clearAllMocks(); mocks.account = undefined; mocks.locale = "en"; mocks.access.mockResolvedValue(false); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function fixture() {
  const completed = vi.fn();
  const view = render(<PreviewCityUnlockGate citySlug="lubeck" cityName="Lübeck">{authorize => <button onClick={() => void authorize().then(completed)}>Start preview</button>}</PreviewCityUnlockGate>);
  fireEvent.click(screen.getByText("Start preview"));
  return { completed, ...view };
}
it.each(sharedLocales)("renders translated guest paywall and preserves a dismissed Start intent in %s", async locale => {
  mocks.locale = locale;
  const h = fixture();
  await screen.findByRole("dialog");
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe(t(locale, "unlock.states.store_product_unavailable")));
  expect(screen.getByText(t(locale, "unlock.title", { city: locale === "ar" ? "لوبيك" : "Lübeck" }))).toBeTruthy();
  expect(screen.getByRole("button", { name: t(locale, "profile.signUp") })).toBeTruthy();
  expect(screen.getByRole("dialog").textContent).not.toContain("unlock.");
  expect(screen.getByRole("dialog").textContent).not.toContain("{city}");
  fireEvent.click(screen.getByRole("button", { name: t(locale, "unlock.notNow") }));
  await waitFor(() => expect(h.completed).toHaveBeenCalledWith(false));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("starts an entitled traveler without a paywall or Store dependency", async () => {
  mocks.account = "owner"; mocks.access.mockResolvedValue(true);
  const h = fixture(); await waitFor(() => expect(h.completed).toHaveBeenCalledWith(true));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("fails closed with recoverable messaging when the server is unavailable", async () => {
  mocks.account = "owner"; mocks.access.mockRejectedValue(new Error("offline"));
  const h = fixture(); await screen.findByText(t("en", "unlock.states.access_unavailable"));
  expect(screen.getByRole("button", { name: t("en", "unlock.title", { city: "Lübeck" }) }).hasAttribute("disabled")).toBe(true);
  expect(h.completed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: t("en", "unlock.notNow") }));
  await waitFor(() => expect(h.completed).toHaveBeenCalledWith(false));
});
it("takes a guest to account creation without granting or discarding the pending Start intent", async () => {
  const h = fixture(); await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: t("en", "profile.signUp") }));
  expect(mocks.push).toHaveBeenCalledWith({ pathname: "/account", params: { entry: "sign-up", returnToWalk: "1" } });
  expect(h.completed).not.toHaveBeenCalled();
  h.unmount(); await waitFor(() => expect(h.completed).toHaveBeenCalledWith(false));
});
it("leaves accepted release behavior unchanged even if the preview flag is set", async () => {
  vi.stubGlobal("__DEV__", false); vi.stubEnv("EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW", "1");
  const completed = vi.fn();
  render(<CityUnlockGate citySlug="lubeck" cityName="Lübeck">{authorize => <button onClick={() => void authorize().then(completed)}>Start</button>}</CityUnlockGate>);
  await act(async () => { fireEvent.click(screen.getByText("Start")); });
  expect(completed).toHaveBeenCalledWith(true); expect(mocks.access).not.toHaveBeenCalled();
});
