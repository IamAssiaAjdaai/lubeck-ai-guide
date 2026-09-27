// @vitest-environment jsdom
import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launchLocales, t } from "@citywalk/i18n";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
const state = vi.hoisted(() => ({ locale: "en", completion: vi.fn(), url: vi.fn(), open: vi.fn(async () => undefined) }));
vi.mock("expo-router", () => ({ useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) }));
vi.mock("react-native", () => ({ AppState: { currentState: "active" } }));
vi.mock("../src/lib/storeReview", () => ({ storeReview: { afterCompletion: state.completion, openFallback: state.open, configuredUrl: state.url } }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale }) }));
vi.mock("../src/components/ui", () => ({
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  AppText: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  PrimaryButton: ({ label, onPress, busy, wrapLabel }: { label: string; onPress(): void; busy: boolean; wrapLabel: boolean }) => <button data-wrap={wrapLabel} disabled={busy} onClick={onPress}>{label}</button>,
}));
import { PublicStoreReview } from "../src/components/PublicStoreReview";
const journey = { id: "finished", finishedAt: 20, startedAt: 10, visited: ["one", "two"] } as WalkJourney;
beforeEach(() => { state.url.mockReturnValue(undefined); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("public review Finish presentation", () => {
  it.each(launchLocales)("localizes the configured public-store fallback in %s", async locale => {
    state.locale = locale;
    state.completion.mockResolvedValue({ status: "requested" });
    state.url.mockReturnValue("https://configured.example");
    render(<PublicStoreReview journey={journey} />);
    const action = await screen.findByRole("button", { name: t(locale, "review.action") });
    expect(screen.getByText(t(locale, "review.title"), { selector: "p" })).toBeTruthy();
    expect(screen.getByText(t(locale, "review.description"))).toBeTruthy();
    expect(action.getAttribute("data-wrap")).toBe("true");
    fireEvent.click(action);
    await waitFor(() => expect(state.open).toHaveBeenCalledWith());
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });
  it.each(["requested", "unavailable", "ineligible"])("does not show a dead review button for %s", async status => {
    state.completion.mockResolvedValue({ status });
    const view = render(<PublicStoreReview journey={journey} />);
    await waitFor(() => expect(state.completion).toHaveBeenCalled());
    expect(view.container.textContent).toBe("");
    expect(state.open).not.toHaveBeenCalled();
  });
});
