import type { ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import {
  CITYWALK_DEVELOPMENT_IDENTIFIER,
  CITYWALK_STORE_IDENTIFIER,
  createCitywalkExpoConfig,
} from "../app.config";
import appJson from "../app.json";
import easJson from "../eas.json";

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

  it("keeps development identifiers isolated from store builds", () => {
    const config = createCitywalkExpoConfig(baseConfig, "development");

    expect(config.ios?.bundleIdentifier).toBe(CITYWALK_DEVELOPMENT_IDENTIFIER);
    expect(config.android?.package).toBe(CITYWALK_DEVELOPMENT_IDENTIFIER);
  });

  it.each(["preview", "production"] as const)(
    "uses final store identifiers for %s builds",
    (environment) => {
      const config = createCitywalkExpoConfig(baseConfig, environment);

      expect(config.ios?.bundleIdentifier).toBe(CITYWALK_STORE_IDENTIFIER);
      expect(config.android?.package).toBe(CITYWALK_STORE_IDENTIFIER);
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

  it("configures store beta as store-distributed builds against the stable Beta API", () => {
    const storeBeta = easJson.build["store-beta"];

    expect(storeBeta).toMatchObject({
      distribution: "store",
      environment: "preview",
      autoIncrement: true,
      android: { buildType: "app-bundle" },
      env: {
        EXPO_PUBLIC_CITYWALK_ENV: "preview",
        EXPO_PUBLIC_CITYWALK_API_ORIGIN:
          "https://lubeck-ai-guide-git-beta-store-iamassiaajdaais-projects.vercel.app",
      },
    });
  });

  it("configures internal preview builds against the stable Beta API", () => {
    expect(easJson.build.preview).toEqual({
      distribution: "internal",
      environment: "preview",
      env: {
        EXPO_PUBLIC_CITYWALK_ENV: "preview",
        EXPO_PUBLIC_CITYWALK_API_ORIGIN:
          "https://lubeck-ai-guide-git-beta-store-iamassiaajdaais-projects.vercel.app",
      },
    });
  });

  it("keeps store beta submission limited to Google Play internal and TestFlight", () => {
    expect(easJson.submit["store-beta"]).toEqual({
      android: { track: "internal", releaseStatus: "draft" },
      ios: {},
    });
  });
});
