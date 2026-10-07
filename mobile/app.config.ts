import type { ConfigContext, ExpoConfig } from "expo/config";

const MOBILE_ENVIRONMENTS = ["development", "preview", "production"] as const;
type MobileEnvironment = (typeof MOBILE_ENVIRONMENTS)[number];

const DEVELOPMENT_HTTP_PLUGIN = "./plugins/with-development-http.js";
export const CITYWALK_STORE_IDENTIFIER = "com.citywalk.app";
export const CITYWALK_DEVELOPMENT_IDENTIFIER = `${CITYWALK_STORE_IDENTIFIER}.dev`;
export const CITYWALK_APP_LINK_HOST = "getcitywalk.com";

export function assertProductionBuildEnvironment(
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  configuredOrigin = process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
): void {
  if (environment !== "production") return;
  const origin = configuredOrigin?.trim();
  if (!origin) {
    throw new Error(
      "Production builds require EXPO_PUBLIC_CITYWALK_API_ORIGIN.",
    );
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(
      "Production EXPO_PUBLIC_CITYWALK_API_ORIGIN must be an absolute HTTPS origin.",
    );
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Production EXPO_PUBLIC_CITYWALK_API_ORIGIN must be an absolute HTTPS origin.",
    );
  }
}

export function assertNativeObservabilityBuildEnvironment(
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  enabledFlag = process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY,
): void {
  const flag = enabledFlag?.trim();
  if (!flag || flag === "0") return;
  if (flag !== "1") {
    throw new Error(
      "EXPO_PUBLIC_CITYWALK_OBSERVABILITY must be unset, 0, or 1.",
    );
  }
  if (environment === "development") {
    throw new Error(
      "Native observability dispatch must not be enabled in development builds.",
    );
  }
}

export function assertRevenueCatBuildEnvironment(
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
): void {
  const configuredKeys = [iosKey, androidKey]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key));

  if (configuredKeys.some((key) => key.startsWith("sk_"))) {
    throw new Error("RevenueCat secret API keys must never be included in a mobile build.");
  }
  if (
    environment === "production" &&
    configuredKeys.some((key) => key.startsWith("test_"))
  ) {
    throw new Error("Production builds must not use a RevenueCat Test Store API key.");
  }
}

export function createCitywalkExpoConfig(
  config: Partial<ExpoConfig>,
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
): ExpoConfig {
  if (!MOBILE_ENVIRONMENTS.includes(environment as MobileEnvironment)) {
    throw new Error("Unsupported CITYWALK mobile environment.");
  }

  if (!config.name || !config.slug) {
    throw new Error("CITYWALK Expo configuration requires a name and slug.");
  }

  if (process.env.EXPO_PUBLIC_CITYWALK_BILLING === "sandbox") {
    const origin = process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN;
    if (environment !== "preview" || !origin || !/^https:\/\//.test(origin)) {
      throw new Error("Sandbox billing requires Preview and an explicitly approved HTTPS API origin.");
    }
    const url = new URL(origin);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error("Sandbox billing requires a credential-free API origin.");
    }
  }

  const applicationIdentifier = environment === "development"
    ? CITYWALK_DEVELOPMENT_IDENTIFIER
    : CITYWALK_STORE_IDENTIFIER;
  const appLinksEnabled = environment !== "development";
  const completeConfig: ExpoConfig = {
    ...config,
    name: config.name,
    slug: config.slug,
    ios: {
      ...config.ios,
      bundleIdentifier: applicationIdentifier,
      ...(appLinksEnabled ? { associatedDomains: Array.from(new Set([...(config.ios?.associatedDomains ?? []), `applinks:${CITYWALK_APP_LINK_HOST}`])) } : {}),
    },
    android: {
      ...config.android,
      package: applicationIdentifier,
      ...(appLinksEnabled ? { intentFilters: [...(config.android?.intentFilters ?? []), { action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: CITYWALK_APP_LINK_HOST, pathPrefix: "/open/" }], category: ["BROWSABLE", "DEFAULT"] }] } : {}),
    },
  };

  if (environment !== "development") return completeConfig;

  return {
    ...completeConfig,
    ios: {
      ...completeConfig.ios,
      infoPlist: {
        ...completeConfig.ios?.infoPlist,
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
        NSLocalNetworkUsageDescription:
          "CITYWALK connects to your local development server while testing this development build.",
      },
    },
    plugins: [...(completeConfig.plugins ?? []), DEVELOPMENT_HTTP_PLUGIN],
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development";
  assertProductionBuildEnvironment(environment);
  assertRevenueCatBuildEnvironment(environment);
  assertNativeObservabilityBuildEnvironment(environment);
  return createCitywalkExpoConfig(config, environment);
};
