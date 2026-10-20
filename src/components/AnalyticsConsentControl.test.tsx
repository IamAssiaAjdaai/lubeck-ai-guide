import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsConsentPreferences } from "./AnalyticsConsentControl";
import { clearAnalyticsConsent, getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analyticsConsent";

vi.mock("next/navigation", () => ({ usePathname: () => "/privacy" }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "synthetic-token");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "http://127.0.0.1:3187/mock-analytics");
  localStorage.clear(); sessionStorage.clear(); clearAnalyticsConsent();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("analytics preference feedback", () => {
  it("shows failed persistence honestly, keeps the page mounted, and allows a successful retry", () => {
    setAnalyticsConsent("granted");
    render(<AnalyticsConsentPreferences />);
    const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) {
      if (this === localStorage) throw Error("Synthetic storage failure");
      return set.call(this, key, value);
    });
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function(this: Storage, key) {
      if (this === localStorage) throw Error("Synthetic storage failure");
      return remove.call(this, key);
    });
    fireEvent.click(screen.getByRole("button", { name: "Decline analytics" }));
    expect(getAnalyticsConsent()).toBe("denied");
    expect(screen.getByRole("alert").textContent).toContain("could not save");
    expect(screen.getByText("off in this tab; not saved")).toBeDefined();
    setSpy.mockRestore(); removeSpy.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Decline analytics" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("declined")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Allow analytics" }));
    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("updates consumers after changes outside this component without reloading", () => {
    render(<AnalyticsConsentPreferences />);
    act(() => { setAnalyticsConsent("granted"); });
    expect(screen.getByText("allowed")).toBeDefined();
    act(() => { setAnalyticsConsent("denied"); });
    expect(screen.getByText("declined")).toBeDefined();
  });
});
