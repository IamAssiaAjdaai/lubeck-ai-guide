import type { ConfigContext, ExpoConfig } from "expo/config";

const MOBILE_ENVIRONMENTS = ["development", "preview", "production"] as const;
type MobileEnvironment = (typeof MOBILE_ENVIRONMENTS)[number];

const DEVELOPMENT_HTTP_PLUGIN = "./plugins/with-development-http.js";
export const CITYWALK_STORE_IDENTIFIER = "com.citywalk.app";
export const CITYWALK_DEVELOPMENT_IDENTIFIER = `${CITYWALK_STORE_IDENTIFIER}.dev`;

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
  const completeConfig: ExpoConfig = {
    ...config,
    name: config.name,
    slug: config.slug,
    ios: {
      ...config.ios,
      bundleIdentifier: applicationIdentifier,
    },
    android: {
      ...config.android,
      package: applicationIdentifier,
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

export default ({ config }: ConfigContext): ExpoConfig =>
  createCitywalkExpoConfig(config);
