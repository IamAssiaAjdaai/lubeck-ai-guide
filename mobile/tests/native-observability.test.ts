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
      errorHandlingEnabled: false,
      sampleRate: 0,
      environment: "production",
    });
  });

  it("enables dispatch only for the exact explicit activation flag", () => {
    expect(createNativeObservabilityConfig("preview", "1")).toMatchObject({
      dispatchingEnabled: true,
      dispatchInDebug: false,
      errorHandlingEnabled: false,
      sampleRate: 1,
      environment: "preview",
    });
    expect(createNativeObservabilityConfig("preview", "true")).toMatchObject({
      dispatchingEnabled: false,
      sampleRate: 0,
    });
  });

  it("keeps the foundation limited to dispatch gating and environment metadata", () => {
    expect(Object.keys(createNativeObservabilityConfig("production", "1")).sort())
      .toEqual([
        "dispatchInDebug",
        "dispatchingEnabled",
        "environment",
        "errorHandlingEnabled",
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
      expect(config.errorHandlingEnabled).toBe(false);
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
