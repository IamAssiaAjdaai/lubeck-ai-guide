import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
  },
}));

import {
  clearNativeAnalyticsConsent,
  getNativeAnalyticsConsent,
  NATIVE_ANALYTICS_CONSENT_STORAGE_KEY,
  setNativeAnalyticsConsent,
} from "../src/lib/analyticsConsent";

describe("native analytics consent", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it("fails closed when no valid decision is stored", async () => {
    await expect(getNativeAnalyticsConsent()).resolves.toBe("unset");
    storage.set(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({ version: 999, decision: "granted" }));
    await expect(getNativeAnalyticsConsent()).resolves.toBe("unset");
    storage.set(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY, "not-json");
    await expect(getNativeAnalyticsConsent()).resolves.toBe("unset");
  });

  it("persists explicit allow and decline choices", async () => {
    await setNativeAnalyticsConsent("granted");
    await expect(getNativeAnalyticsConsent()).resolves.toBe("granted");
    await setNativeAnalyticsConsent("denied");
    await expect(getNativeAnalyticsConsent()).resolves.toBe("denied");
  });

  it("can clear a stored decision back to fail-closed unset", async () => {
    await setNativeAnalyticsConsent("granted");
    await clearNativeAnalyticsConsent();
    await expect(getNativeAnalyticsConsent()).resolves.toBe("unset");
  });
});
