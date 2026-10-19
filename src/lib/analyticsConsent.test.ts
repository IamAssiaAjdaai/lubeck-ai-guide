import { beforeEach, describe, expect, it, vi } from "vitest";

let consent: typeof import("./analyticsConsent");

describe("analytics consent", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    consent = await import("./analyticsConsent");
  });

  it("is fail-closed until the user makes an explicit choice", () => {
    expect(consent.getAnalyticsConsent(localStorage)).toBe("unset");
    localStorage.setItem(consent.ANALYTICS_CONSENT_STORAGE_KEY, "not-json");
    expect(consent.getAnalyticsConsent(localStorage)).toBe("unset");
    localStorage.setItem(
      consent.ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: 999, decision: "granted" }),
    );
    expect(consent.getAnalyticsConsent(localStorage)).toBe("unset");
  });

  it("persists explicit allow and decline choices", () => {
    consent.setAnalyticsConsent("granted", localStorage);
    expect(consent.getAnalyticsConsent(localStorage)).toBe("granted");

    consent.setAnalyticsConsent("denied", localStorage);
    expect(consent.getAnalyticsConsent(localStorage)).toBe("denied");
  });

  it("can clear the stored preference without granting analytics", () => {
    consent.setAnalyticsConsent("granted", localStorage);
    consent.clearAnalyticsConsent(localStorage);
    expect(consent.getAnalyticsConsent(localStorage)).toBe("unset");
  });
});
