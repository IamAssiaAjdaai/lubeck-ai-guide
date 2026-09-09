import type { ConfigContext, ExpoConfig } from "expo/config";

const MOBILE_ENVIRONMENTS = ["development", "preview", "production"] as const;
type MobileEnvironment = (typeof MOBILE_ENVIRONMENTS)[number];

const DEVELOPMENT_HTTP_PLUGIN = "./plugins/with-development-http.js";

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

  const completeConfig: ExpoConfig = {
    ...config,
    name: config.name,
    slug: config.slug,
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
