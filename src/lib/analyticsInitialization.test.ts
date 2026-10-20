import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(), opt_out_capturing: vi.fn(), opt_in_capturing: vi.fn(),
  has_opted_out_capturing: vi.fn(() => true), register: vi.fn(),
  startExceptionAutocapture: vi.fn(), stopExceptionAutocapture: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: sdk }));
let stop: (() => void) | undefined;
let consent: typeof import("./analyticsConsent");

beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "synthetic-token");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "http://127.0.0.1:3187/mock-analytics");
  consent = await import("./analyticsConsent");
  const subscribe = consent.subscribeAnalyticsConsent;
  vi.spyOn(consent, "subscribeAnalyticsConsent").mockImplementation(listener => {
    const unsubscribe = subscribe(listener); stop = unsubscribe; return unsubscribe;
  });
});
afterEach(() => { stop?.(); stop = undefined; vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("analytics SDK lifecycle", () => {
  it("never initializes on first visit or on a failed explicit opt-in", async () => {
    await import("../../instrumentation-client");
    expect(sdk.init).not.toHaveBeenCalled();
    const broken = { getItem: () => null, setItem: () => { throw Error(); }, removeItem: () => {} };
    consent.setAnalyticsConsent("granted", broken);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("immediately opts out before a failing write; every capture producer stays blocked until explicit verified opt-in", async () => {
    consent.setAnalyticsConsent("granted");
    await import("../../instrumentation-client");
    expect(sdk.init).toHaveBeenCalledOnce();
    const beforeSend = sdk.init.mock.calls[0][1].before_send;
    expect(beforeSend({ event: "language_selected" })).not.toBeNull();
    sdk.opt_out_capturing.mockClear(); sdk.opt_in_capturing.mockClear();
    const broken = {
      getItem: () => JSON.stringify({ version: 1, decision: "granted" }),
      setItem: () => { expect(sdk.opt_out_capturing).toHaveBeenCalled(); throw Error(); },
      removeItem: () => { throw Error(); },
    };
    consent.setAnalyticsConsent("denied", broken);
    for (const event of ["city_opened", "landing_view", "audio_played", "$exception", "checkout_started"])
      expect(beforeSend({ event })).toBeNull();
    expect(sdk.stopExceptionAutocapture).toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.opt_in_capturing).not.toHaveBeenCalled();
    consent.setAnalyticsConsent("granted");
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(beforeSend({ event: "city_opened" })).not.toBeNull();
  });

  it("keeps the capture-time gate closed even if the SDK opt-out throws", async () => {
    consent.setAnalyticsConsent("granted");
    await import("../../instrumentation-client");
    sdk.opt_out_capturing.mockImplementationOnce(() => { throw Error(); });
    consent.setAnalyticsConsent("denied");
    expect(sdk.init.mock.calls[0][1].before_send({ event: "$exception" })).toBeNull();
  });

  it("does not initialize from a stale grant protected by the reload marker", async () => {
    localStorage.setItem(consent.ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({ version: 1, decision: "granted" }));
    sessionStorage.setItem(consent.ANALYTICS_WITHDRAWAL_STORAGE_KEY, "denied");
    await import("../../instrumentation-client");
    expect(sdk.init).not.toHaveBeenCalled();
    expect(consent.getAnalyticsConsentPersistenceFailed()).toBe(true);
  });
});
