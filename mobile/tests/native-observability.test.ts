import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configure: vi.fn(),
}));

vi.mock("expo-observe", () => ({
  Observe: {
    configure: mocks.configure,
  },
}));

import {
  configureNativeObservability,
  createNativeObservabilityConfig,
} from "../src/lib/nativeObservability";

describe("native crash observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when no explicit activation flag exists", () => {
    expect(createNativeObservabilityConfig("production", undefined)).toEqual({
      dispatchingEnabled: false,
      dispatchInDebug: false,
      sampleRate: 0,
      environment: "production",
    });
  });

  it("keeps dispatch disabled even if an activation flag is present", () => {
    expect(createNativeObservabilityConfig("preview", "1")).toMatchObject({
      dispatchingEnabled: false,
      dispatchInDebug: false,
      sampleRate: 0,
      environment: "preview",
    });
    expect(createNativeObservabilityConfig("production", "1")).toMatchObject({
      dispatchingEnabled: false,
      sampleRate: 0,
      environment: "production",
    });
  });

  it("keeps the foundation limited to dispatch gating and environment metadata", () => {
    expect(Object.keys(createNativeObservabilityConfig("production", "1")).sort())
      .toEqual([
        "dispatchInDebug",
        "dispatchingEnabled",
        "environment",
        "sampleRate",
      ]);
  });

  it("sanitizes unknown environment names", () => {
    expect(createNativeObservabilityConfig("private@example.com", "1"))
      .toMatchObject({ environment: "development" });
  });

  it("applies only the fixed privacy-safe configuration", () => {
    const previousEnvironment = process.env.EXPO_PUBLIC_CITYWALK_ENV;
    const previousEnabled = process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY;
    try {
      process.env.EXPO_PUBLIC_CITYWALK_ENV = "preview";
      process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY = "1";

      const config = configureNativeObservability();

      expect(mocks.configure).toHaveBeenCalledOnce();
      expect(mocks.configure).toHaveBeenCalledWith(config);
      expect(config.dispatchingEnabled).toBe(false);
      expect(config.sampleRate).toBe(0);
      expect(JSON.stringify(config)).not.toMatch(
        /email|token|gps|location|prompt|account|session/i,
      );
    } finally {
      if (previousEnvironment === undefined) {
        delete process.env.EXPO_PUBLIC_CITYWALK_ENV;
      } else {
        process.env.EXPO_PUBLIC_CITYWALK_ENV = previousEnvironment;
      }
      if (previousEnabled === undefined) {
        delete process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY;
      } else {
        process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY = previousEnabled;
      }
    }
  });
});
