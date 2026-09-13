import type { ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import { createCitywalkExpoConfig } from "../app.config";
import appJson from "../app.json";

const baseConfig: ExpoConfig = {
  name: "CITYWALK",
  slug: "citywalk-mobile",
  plugins: ["expo-router"],
};

describe("CITYWALK native app configuration", () => {
  it("enables local-network transport only for development builds", () => {
    const development = createCitywalkExpoConfig(baseConfig, "development");

    expect(development.ios?.infoPlist).toMatchObject({
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      NSLocalNetworkUsageDescription: expect.any(String),
    });
    expect(development.plugins).toContain("./plugins/with-development-http.js");
  });

  it.each(["preview", "production"] as const)(
    "does not weaken native transport security for %s builds",
    (environment) => {
      const config = createCitywalkExpoConfig(baseConfig, environment);

      expect(config.ios?.infoPlist).toBeUndefined();
      expect(config.plugins).toEqual(["expo-router"]);
    },
  );

  it("fails closed for an unknown build environment", () => {
    expect(() => createCitywalkExpoConfig(baseConfig, "other"))
      .toThrow("Unsupported CITYWALK mobile environment");
  });

  it("configures expo-audio for playback without recording or background permissions", () => {
    const plugin = appJson.expo.plugins.find((entry) =>
      Array.isArray(entry) && entry[0] === "expo-audio",
    );

    expect(plugin).toEqual(["expo-audio", {
      microphonePermission: false,
      recordAudioAndroid: false,
      enableBackgroundRecording: false,
      enableBackgroundPlayback: false,
    }]);
  });
});
