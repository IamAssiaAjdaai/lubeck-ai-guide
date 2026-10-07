import type { ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import {
  CITYWALK_DEVELOPMENT_IDENTIFIER,
  CITYWALK_STORE_IDENTIFIER,
  assertNativeObservabilityBuildEnvironment,
  assertProductionBuildEnvironment,
  assertRevenueCatBuildEnvironment,
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

  it("enables iOS-only active-walk background location and local Live Activities", () => {
    const location = appJson.expo.plugins.find((entry) =>
      Array.isArray(entry) && entry[0] === "expo-location",
    );
    expect(location).toEqual(["expo-location", {
      locationWhenInUsePermission:
        "Allow CITYWALK to show your position on the city map while you use the app.",
      locationAlwaysAndWhenInUsePermission:
        "Allow CITYWALK to keep your active walk updated on the Lock Screen while you are walking.",
      isIosBackgroundLocationEnabled: true,
      isAndroidBackgroundLocationEnabled: false,
    }]);

    const widgets = appJson.expo.plugins.find((entry) =>
      Array.isArray(entry) && entry[0] === "expo-widgets",
    );
    expect(widgets).toEqual(["expo-widgets", {
      enablePushNotifications: false,
    }]);
  });

  it("keeps the approved launcher artwork wired for standard and adaptive icons", () => {
    expect(appJson.expo.icon).toBe("./assets/images/icon.png");
    expect(appJson.expo.android.adaptiveIcon).toMatchObject({
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    });
  });

  it("uses the approved CITYWALK artwork for a true native launch splash", () => {
    const plugin = appJson.expo.plugins.find((entry) =>
      Array.isArray(entry) && entry[0] === "expo-splash-screen",
    );

    expect(plugin).toEqual(["expo-splash-screen", {
      backgroundColor: "#FAFAF8",
      image: "./assets/images/icon.png",
      imageWidth: 168,
      resizeMode: "contain",
    }]);
    expect(appJson.expo.androidStatusBar).toMatchObject({
      backgroundColor: "#FAFAF8",
      barStyle: "dark-content",
    });
    expect(appJson.expo.plugins).toContain("expo-font");
  });

  it("configures store beta as store-distributed builds without a committed preview API origin", () => {
    const storeBeta = easJson.build["store-beta"];

    expect(storeBeta).toMatchObject({
      distribution: "store",
      environment: "preview",
      autoIncrement: true,
      android: { buildType: "app-bundle" },
      env: {
        EXPO_PUBLIC_CITYWALK_ENV: "preview",
        EXPO_PUBLIC_CITYWALK_GOOGLE_AUTH: "1",
        EXPO_PUBLIC_CITYWALK_APPLE_AUTH: "1",
      },
    });
    expect(storeBeta.env).not.toHaveProperty("EXPO_PUBLIC_CITYWALK_API_ORIGIN");
  });

  it("configures internal preview builds without a committed preview API origin", () => {
    expect(easJson.build.preview).toMatchObject({
      developmentClient: false,
      autoIncrement: true,
      android: { buildType: "apk" },
      ios: { buildConfiguration: "Release" },
      distribution: "internal",
      environment: "preview",
      env: {
        EXPO_PUBLIC_CITYWALK_ENV: "preview",
        EXPO_PUBLIC_CITYWALK_GOOGLE_AUTH: "1",
        EXPO_PUBLIC_CITYWALK_APPLE_AUTH: "1",
      },
    });
    expect(easJson.build.preview.env).not.toHaveProperty(
      "EXPO_PUBLIC_CITYWALK_API_ORIGIN",
    );
  });

  it("selects the EAS Production environment with the verified production API origin", () => {
    expect(easJson.build.production).toMatchObject({
      environment: "production",
      autoIncrement: true,
      env: {
        EXPO_PUBLIC_CITYWALK_ENV: "production",
        EXPO_PUBLIC_CITYWALK_API_ORIGIN: "https://getcitywalk.com",
      },
    });
    expect(() =>
      assertProductionBuildEnvironment(
        "production",
        easJson.build.production.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
      ),
    ).not.toThrow();
  });

  it("fails a production build before bundling when its API origin is missing or unsafe", () => {
    expect(() => assertProductionBuildEnvironment("production", undefined))
      .toThrow("Production builds require EXPO_PUBLIC_CITYWALK_API_ORIGIN");
    expect(() => assertProductionBuildEnvironment("production", "http://api.citywalk.example"))
      .toThrow("absolute HTTPS origin");
    expect(() => assertProductionBuildEnvironment("production", "https://api.citywalk.example/path"))
      .toThrow("absolute HTTPS origin");

    expect(() => assertProductionBuildEnvironment(
      "production",
      "https://api.citywalk.example",
    )).not.toThrow();
    expect(() => assertProductionBuildEnvironment("preview", undefined)).not.toThrow();
  });

  it("keeps native observability dispatch disabled in every committed EAS profile", () => {
    expect(JSON.stringify(easJson.build))
      .not.toContain("EXPO_PUBLIC_CITYWALK_OBSERVABILITY");
  });

  it("requires an explicit non-development activation flag for native observability", () => {
    expect(() =>
      assertNativeObservabilityBuildEnvironment("development", "1"),
    ).toThrow("must not be enabled in development");
    expect(() =>
      assertNativeObservabilityBuildEnvironment("preview", "true"),
    ).toThrow("must be unset, 0, or 1");
    expect(() =>
      assertNativeObservabilityBuildEnvironment("preview", "1"),
    ).not.toThrow();
    expect(() =>
      assertNativeObservabilityBuildEnvironment("production", "1"),
    ).not.toThrow();
    expect(() =>
      assertNativeObservabilityBuildEnvironment("production", undefined),
    ).not.toThrow();
  });

  it("rejects RevenueCat secret keys from every mobile build", () => {
    expect(() => assertRevenueCatBuildEnvironment(
      "preview",
      "sk_secret_must_stay_server_side",
      undefined,
    )).toThrow("secret API keys must never be included");
  });

  it("allows RevenueCat Test Store only outside production", () => {
    expect(() => assertRevenueCatBuildEnvironment(
      "preview",
      "test_preview_key",
      "test_preview_key",
    )).not.toThrow();
    expect(() => assertRevenueCatBuildEnvironment(
      "production",
      "test_preview_key",
      undefined,
    )).toThrow("must not use a RevenueCat Test Store API key");
    expect(() => assertRevenueCatBuildEnvironment(
      "production",
      "appl_public_key",
      "goog_public_key",
    )).not.toThrow();
    expect(() => assertRevenueCatBuildEnvironment(
      "production",
      undefined,
      undefined,
    )).not.toThrow();
  });

  it("keeps store beta submission limited to Google Play internal and TestFlight", () => {
    expect(easJson.submit["store-beta"]).toEqual({
      android: { track: "internal", releaseStatus: "draft" },
      ios: { ascAppId: "6815815964" },
    });
  });
});

it("sandbox billing requires Preview/HTTPS and uses the Store identifier", () => {
  const previousBilling=process.env.EXPO_PUBLIC_CITYWALK_BILLING, previousOrigin=process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN;
  try {
    process.env.EXPO_PUBLIC_CITYWALK_BILLING="sandbox"; delete process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN;
    expect(()=>createCitywalkExpoConfig({name:"CITYWALK",slug:"citywalk-mobile"},"preview")).toThrow();
    process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN="https://isolated-preview.example.test";
    const config=createCitywalkExpoConfig({name:"CITYWALK",slug:"citywalk-mobile"},"preview");
    expect(config.ios?.bundleIdentifier).toBe("com.citywalk.app");expect(config.android?.package).toBe("com.citywalk.app");
    expect(()=>createCitywalkExpoConfig({name:"CITYWALK",slug:"citywalk-mobile"},"production")).toThrow();
  } finally {
    if(previousBilling===undefined)delete process.env.EXPO_PUBLIC_CITYWALK_BILLING;else process.env.EXPO_PUBLIC_CITYWALK_BILLING=previousBilling;
    if(previousOrigin===undefined)delete process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN;else process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN=previousOrigin;
  }
});
