import { describe, expect, it, vi } from "vitest";

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

  it("degrades safely for unavailable services, errors, and invalid coordinates", async () => {
    await expect(requestForegroundLocation({
      requestPermission: async () => "unavailable",
      getCurrentPosition: vi.fn(),
    })).resolves.toEqual({ status: "unavailable" });
    await expect(requestForegroundLocation({
      requestPermission: async () => { throw new Error("native failure"); },
      getCurrentPosition: vi.fn(),
    })).resolves.toEqual({ status: "error" });
    await expect(requestForegroundLocation({
      requestPermission: async () => "granted",
      getCurrentPosition: async () => ({ latitude: 200, longitude: 10 }),
    })).resolves.toEqual({ status: "error" });
  });
});
