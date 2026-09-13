import { describe, expect, it, vi } from "vitest";

import expoAdapterSource from "../src/lib/location.expo.ts?raw";
import { requestForegroundLocation } from "../src/lib/location";

describe("foreground-only native location", () => {
  it("requests permission only when explicitly called and returns a one-shot position", async () => {
    const requestPermission = vi.fn(async () => "granted" as const);
    const getCurrentPosition = vi.fn(async () => ({ latitude: 53.86, longitude: 10.68 }));
    expect(requestPermission).not.toHaveBeenCalled();
    await expect(requestForegroundLocation({ requestPermission, getCurrentPosition })).resolves.toEqual({
      status: "available", location: { latitude: 53.86, longitude: 10.68 },
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("does not read position after denial", async () => {
    const getCurrentPosition = vi.fn();
    await expect(requestForegroundLocation({
      requestPermission: async () => "denied",
      getCurrentPosition,
    })).resolves.toEqual({ status: "denied" });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("does not apply the location-fix timeout while permission UI is pending", async () => {
    vi.useFakeTimers();
    try {
      let resolvePermission!: (permission: "granted") => void;
      const permission = new Promise<"granted">((resolve) => {
        resolvePermission = resolve;
      });
      const request = requestForegroundLocation({
        requestPermission: () => permission,
        getCurrentPosition: async () => ({ latitude: 53.55, longitude: 10.01 }),
      }, { timeoutMs: 5 });

      await vi.advanceTimersByTimeAsync(50);
      resolvePermission("granted");

      await expect(request).resolves.toEqual({
        status: "available",
        location: { latitude: 53.55, longitude: 10.01 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not apply the location-fix timeout while provider UI is pending", async () => {
    vi.useFakeTimers();
    try {
      let resolveProvider!: (provider: "ready") => void;
      const provider = new Promise<"ready">((resolve) => {
        resolveProvider = resolve;
      });
      const request = requestForegroundLocation({
        requestPermission: async () => "granted",
        prepareProvider: () => provider,
        getCurrentPosition: async () => ({ latitude: 53.55, longitude: 10.01 }),
      }, { timeoutMs: 5 });

      await vi.advanceTimersByTimeAsync(50);
      resolveProvider("ready");

      await expect(request).resolves.toEqual({
        status: "available",
        location: { latitude: 53.55, longitude: 10.01 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a recent last-known fix without waiting for a new provider fix", async () => {
    const getCurrentPosition = vi.fn();
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      prepareProvider: async () => "ready",
      getLastKnownPosition: async () => ({ latitude: 53.55, longitude: 9.99 }),
      getCurrentPosition,
    })).resolves.toEqual({
      status: "available",
      location: { latitude: 53.55, longitude: 9.99 },
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("requests a fresh fix when no valid cached position is available", async () => {
    const getCurrentPosition = vi.fn(async () => ({ latitude: 53.55, longitude: 10.01 }));
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      prepareProvider: async () => "ready",
      getLastKnownPosition: async () => undefined,
      getCurrentPosition,
    })).resolves.toEqual({
      status: "available",
      location: { latitude: 53.55, longitude: 10.01 },
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it.each([
    ["services_disabled", "services_disabled"],
    ["provider_unavailable", "provider_unavailable"],
  ] as const)("reports %s provider preparation distinctly", async (provider, status) => {
    const getCurrentPosition = vi.fn();
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      prepareProvider: async () => provider,
      getCurrentPosition,
    })).resolves.toEqual({ status });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("degrades safely for unavailable providers, errors, and invalid coordinates", async () => {
    await expect(requestForegroundLocation({
      requestPermission: async () => "unavailable",
      getCurrentPosition: vi.fn(),
    })).resolves.toEqual({ status: "provider_unavailable" });
    await expect(requestForegroundLocation({
      requestPermission: async () => { throw new Error("native failure"); },
      getCurrentPosition: vi.fn(),
    })).resolves.toEqual({ status: "error" });
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      getCurrentPosition: async () => ({ latitude: 200, longitude: 10 }),
    })).resolves.toEqual({ status: "fix_failed" });
  });

  it("times out a hanging current fix and remains retryable", async () => {
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      getCurrentPosition: () => new Promise(() => undefined),
    }, { timeoutMs: 5 })).resolves.toEqual({ status: "fix_failed" });
  });

  it("uses the Expo Android provider, cached-fix, and fresh-fix APIs", () => {
    expect(expoAdapterSource).toContain("getProviderStatusAsync");
    expect(expoAdapterSource).toContain("enableNetworkProviderAsync");
    expect(expoAdapterSource).toContain("getLastKnownPositionAsync");
    expect(expoAdapterSource).toContain("getCurrentPositionAsync");
    expect(expoAdapterSource).toContain("mayShowUserSettingsDialog: true");
  });
});
