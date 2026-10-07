import { beforeEach, describe, expect, it } from "vitest";

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  clearAnalyticsConsent,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analyticsConsent";

describe("analytics consent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is fail-closed until the user makes an explicit choice", () => {
    expect(getAnalyticsConsent(localStorage)).toBe("unset");
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "not-json");
    expect(getAnalyticsConsent(localStorage)).toBe("unset");
    localStorage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: 999, decision: "granted" }),
    );
    expect(getAnalyticsConsent(localStorage)).toBe("unset");
  });

  it("persists explicit allow and decline choices", () => {
    setAnalyticsConsent("granted", localStorage);
    expect(getAnalyticsConsent(localStorage)).toBe("granted");

    setAnalyticsConsent("denied", localStorage);
    expect(getAnalyticsConsent(localStorage)).toBe("denied");
  });

  it("can clear the stored preference without granting analytics", () => {
    setAnalyticsConsent("granted", localStorage);
    clearAnalyticsConsent(localStorage);
    expect(getAnalyticsConsent(localStorage)).toBe("unset");
  });
});
