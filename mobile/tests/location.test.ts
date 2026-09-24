import { describe, expect, it, vi } from "vitest";

import expoAdapterSource from "../src/lib/location.expo.ts?raw";
import {
  LAST_KNOWN_LOCATION_TIMEOUT_MS,
  recheckForegroundLocationProvider,
  requestForegroundLocation,
} from "../src/lib/location";

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

  it("treats a slow cached lookup as optional before requesting a fresh fix", async () => {
    vi.useFakeTimers();
    try {
      const getCurrentPosition = vi.fn(async () => ({ latitude: 53.55, longitude: 10.01 }));
      const request = requestForegroundLocation({
        requestPermission: async () => "granted",
        getLastKnownPosition: () => new Promise(() => undefined),
        getCurrentPosition,
      });

      await vi.advanceTimersByTimeAsync(LAST_KNOWN_LOCATION_TIMEOUT_MS);
      await expect(request).resolves.toEqual({
        status: "available",
        location: { latitude: 53.55, longitude: 10.01 },
      });
      expect(getCurrentPosition).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
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

  it("rechecks disabled services after the app returns from settings", async () => {
    const checkProvider = vi.fn()
      .mockResolvedValueOnce("services_disabled")
      .mockResolvedValueOnce("ready");
    const adapter = {
      requestPermission: async () => "granted" as const,
      checkProvider,
      getCurrentPosition: async () => ({ latitude: 53.55, longitude: 10.01 }),
    };

    await expect(recheckForegroundLocationProvider(adapter))
      .resolves.toBe("services_disabled");
    await expect(recheckForegroundLocationProvider(adapter))
      .resolves.toBe("ready");
  });

  it("allows a fresh fix when Android provider flags are uncertain", async () => {
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      prepareProvider: async () => "ready",
      getLastKnownPosition: async () => undefined,
      getCurrentPosition: async () => ({ latitude: 53.55, longitude: 10.01 }),
    })).resolves.toEqual({
      status: "available",
      location: { latitude: 53.55, longitude: 10.01 },
    });
    expect(expoAdapterSource).not.toContain("reportedProviders");
  });

  it("remains retryable after a failed fix", async () => {
    const getCurrentPosition = vi.fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ latitude: 53.55, longitude: 10.01 });
    const adapter = {
      requestPermission: async () => "granted" as const,
      getCurrentPosition,
    };

    await expect(requestForegroundLocation(adapter)).resolves.toEqual({ status: "fix_failed" });
    await expect(requestForegroundLocation(adapter)).resolves.toEqual({
      status: "available",
      location: { latitude: 53.55, longitude: 10.01 },
    });
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
    expect(expoAdapterSource).toContain("android.settings.LOCATION_SOURCE_SETTINGS");
  });
});
