import { beforeEach, describe, expect, it, vi } from "vitest";

describe("withdrawal with a stale persisted grant", () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear(); sessionStorage.clear(); });

  it("blocks all readers immediately even when the old grant cannot be overwritten or removed", async () => {
    const consent = await import("./analyticsConsent");
    const stale = JSON.stringify({ version: 1, decision: "granted" });
    const storage = {
      getItem: () => stale,
      setItem: () => { throw new Error("Storage unavailable"); },
      removeItem: () => { throw new Error("Storage unavailable"); },
    };
    expect(consent.getAnalyticsConsent(storage)).toBe("granted");
    consent.setAnalyticsConsent("denied", storage);
    expect(consent.getAnalyticsConsent(storage)).toBe("denied");
  });
});

it("removes the old grant when writing denial fails, and remains off after reload", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  let raw: string | null = JSON.stringify({ version: 1, decision: "granted" });
  const storage = { getItem: () => raw, setItem: () => { throw Error(); }, removeItem: () => { raw = null; } };
  const consent = await import("./analyticsConsent");
  expect(consent.setAnalyticsConsent("denied", storage)).toBe(true);
  expect(raw).toBeNull();
  vi.resetModules();
  expect((await import("./analyticsConsent")).getAnalyticsConsent(storage)).not.toBe("granted");
});

it("keeps a session withdrawal marker across reload when the durable grant is stuck", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  const stale = JSON.stringify({ version: 1, decision: "granted" });
  const storage = { getItem: () => stale, setItem: () => { throw Error(); }, removeItem: () => { throw Error(); } };
  const consent = await import("./analyticsConsent");
  expect(consent.setAnalyticsConsent("denied", storage)).toBe(false);
  expect(consent.getAnalyticsConsentPersistenceFailed()).toBe(true);
  vi.resetModules();
  expect((await import("./analyticsConsent")).getAnalyticsConsent(storage)).toBe("denied");
});

it("does not grant on throwing reads or a silently ignored write, and permits a later verified opt-in", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  const consent = await import("./analyticsConsent");
  const broken = { getItem: () => { throw Error(); }, setItem: () => {}, removeItem: () => {} };
  expect(consent.getAnalyticsConsent(broken)).toBe("unset");
  expect(consent.setAnalyticsConsent("granted", broken)).toBe(false);
  expect(consent.getAnalyticsConsent(broken)).toBe("denied");
  expect(consent.setAnalyticsConsent("granted", localStorage)).toBe(true);
  expect(consent.getAnalyticsConsent()).toBe("granted");
  expect(consent.getAnalyticsConsentPersistenceFailed()).toBe(false);
});

it("notifies all consumers before attempting the withdrawal write", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  const consent = await import("./analyticsConsent");
  consent.setAnalyticsConsent("granted");
  const decisions: string[] = [];
  const stop = consent.subscribeAnalyticsConsent(() => decisions.push(consent.getAnalyticsConsent()));
  try {
    const storage = { getItem: () => null, setItem: () => { expect(decisions[0]).toBe("denied"); throw Error(); }, removeItem: () => {} };
    consent.setAnalyticsConsent("denied", storage);
    expect(decisions.every(d => d === "denied")).toBe(true);
  } finally { stop(); }
});

it("blocks when localStorage is unavailable, without making opt-in appear saved", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw Error(); });
  try {
    const consent = await import("./analyticsConsent");
    expect(consent.getAnalyticsConsent()).toBe("unset");
    expect(consent.setAnalyticsConsent("granted")).toBe(false);
    expect(consent.getAnalyticsConsent()).toBe("denied");
    expect(consent.getAnalyticsConsentPersistenceFailed()).toBe(true);
  } finally { spy.mockRestore(); }
});

it("does not let another tab's grant release a local withdrawal", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  const consent = await import("./analyticsConsent");
  consent.setAnalyticsConsent("granted");
  const onChange = vi.fn(); const stop = consent.subscribeAnalyticsConsent(onChange);
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: consent.ANALYTICS_CONSENT_STORAGE_KEY, newValue: null, storageArea: localStorage }));
    expect(consent.getAnalyticsConsent()).toBe("denied");
    localStorage.setItem(consent.ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({ version: 1, decision: "granted" }));
    window.dispatchEvent(new StorageEvent("storage", { key: consent.ANALYTICS_CONSENT_STORAGE_KEY, newValue: localStorage.getItem(consent.ANALYTICS_CONSENT_STORAGE_KEY), storageArea: localStorage }));
    expect(consent.getAnalyticsConsent()).toBe("denied");
    expect(onChange).toHaveBeenCalled();
    expect(consent.setAnalyticsConsent("granted")).toBe(true);
    expect(consent.getAnalyticsConsent()).toBe("granted");
  } finally { stop(); }
});

it("accepts only withdrawal broadcasts and cleans up its channel", async () => {
  vi.resetModules(); sessionStorage.clear(); localStorage.clear();
  let message: ((event: MessageEvent) => void) | null = null;
  const close = vi.fn(), postMessage = vi.fn();
  class Channel { set onmessage(value: (event: MessageEvent) => void) { message = value; } close = close; postMessage = postMessage; }
  const original = window.BroadcastChannel;
  Object.defineProperty(window, "BroadcastChannel", { configurable: true, value: Channel });
  const consent = await import("./analyticsConsent");
  const stop = consent.subscribeAnalyticsConsent(() => {});
  try {
    consent.setAnalyticsConsent("granted");
    message!(new MessageEvent("message", { data: { type: "withdraw" } }));
    expect(consent.getAnalyticsConsent()).toBe("denied");
    message!(new MessageEvent("message", { data: { type: "grant" } }));
    expect(consent.getAnalyticsConsent()).toBe("denied");
    expect(postMessage).not.toHaveBeenCalled();
  } finally { stop(); Object.defineProperty(window, "BroadcastChannel", { configurable: true, value: original }); }
  expect(close).toHaveBeenCalledOnce();
});

it("stays blocked and reports failure when both persistent and session storage writes fail", async () => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear();
  const consent = await import("./analyticsConsent");
  const bad = { getItem: () => JSON.stringify({ version: 1, decision: "granted" }), setItem: () => { throw Error(); }, removeItem: () => { throw Error(); } };
  const original = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) {
    if (this === sessionStorage) throw Error();
    return original.call(this, key, value);
  });
  try {
    expect(consent.setAnalyticsConsent("denied", bad)).toBe(false);
    expect(consent.getAnalyticsConsent(bad)).toBe("denied");
    expect(consent.getAnalyticsConsentPersistenceFailed()).toBe(true);
    expect(sessionStorage.getItem(consent.ANALYTICS_WITHDRAWAL_STORAGE_KEY)).toBeNull();
  } finally { spy.mockRestore(); }
});

it("does not reauthorize if a previous withdrawal marker cannot be cleared", async () => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear();
  const consent = await import("./analyticsConsent");
  consent.setAnalyticsConsent("denied");
  const remove = Storage.prototype.removeItem;
  const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function(this: Storage, key) {
    if (this === sessionStorage) throw Error();
    return remove.call(this, key);
  });
  try {
    expect(consent.setAnalyticsConsent("granted")).toBe(false);
    expect(consent.getAnalyticsConsent()).toBe("denied");
    expect(consent.getAnalyticsConsentPersistenceFailed()).toBe(true);
  } finally { spy.mockRestore(); }
  expect(consent.setAnalyticsConsent("granted")).toBe(true);
  expect(consent.getAnalyticsConsent()).toBe("granted");
});
