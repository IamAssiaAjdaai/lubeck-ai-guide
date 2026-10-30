import type { ConfigContext, ExpoConfig } from "expo/config";

const MOBILE_ENVIRONMENTS = ["development", "preview", "production"] as const;
type MobileEnvironment = (typeof MOBILE_ENVIRONMENTS)[number];

const DEVELOPMENT_HTTP_PLUGIN = "./plugins/with-development-http.js";
export const CITYWALK_STORE_IDENTIFIER = "com.citywalk.app";
export const CITYWALK_DEVELOPMENT_IDENTIFIER = `${CITYWALK_STORE_IDENTIFIER}.dev`;
export const CITYWALK_TESTER_IDENTIFIER = `${CITYWALK_STORE_IDENTIFIER}.preview`;
export const CITYWALK_APP_LINK_HOST = "getcitywalk.com";

export function assertPreviewBuildEnvironment(
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  configuredOrigin = process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
): void {
  if (environment !== "preview") return;
  const origin = configuredOrigin?.trim();
  if (!origin) {
    throw new Error(
      "A CITYWALK API origin is required for preview builds.",
    );
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("Preview CITYWALK API origin must be an absolute HTTPS URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Preview CITYWALK API origin must use HTTPS and contain only scheme and host.");
  }

  if (isLocalBuildHostname(url.hostname)) {
    throw new Error("Preview CITYWALK API origin cannot target a local host.");
  }
}

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
  _environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  enabledFlag = process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY,
): void {
  const flag = enabledFlag?.trim();
  if (!flag || flag === "0") return;
  if (flag !== "1") {
    throw new Error(
      "EXPO_PUBLIC_CITYWALK_OBSERVABILITY must be unset, 0, or 1.",
    );
  }
  throw new Error(
    "Native observability dispatch is not approved for Expo SDK 57 builds.",
  );
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

  const testerPreview = process.env.CITYWALK_ANDROID_TESTER_PREVIEW === "1";
  if (testerPreview && environment !== "preview") {
    throw new Error("Android tester mode requires Preview.");
  }

  const testerDomain =
    process.env.EXPO_PUBLIC_CITYWALK_TESTER_AUTH0_DOMAIN?.trim();

  if (
    testerPreview &&
    (!testerDomain ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(testerDomain))
  ) {
    throw new Error("A valid tester Auth0 domain is required.");
  }

  const testerPlugins: NonNullable<ExpoConfig["plugins"]> =
    testerPreview
      ? [["react-native-auth0", {
          domain: testerDomain,
          customScheme: "citywalkpreviewauth0",
        }]]
      : [];

  const applicationIdentifier = testerPreview
    ? CITYWALK_TESTER_IDENTIFIER
    : environment === "development"
      ? CITYWALK_DEVELOPMENT_IDENTIFIER
      : CITYWALK_STORE_IDENTIFIER;

  const appLinksEnabled =
    environment !== "development" && !testerPreview;
  const completeConfig: ExpoConfig = {
    ...config,
    name: config.name,
    slug: config.slug,
    plugins: [...(config.plugins ?? []), ...testerPlugins],
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

function isLocalBuildHostname(hostname: string): boolean {
  const normalized = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[|\]$/g, "");
  const isIpv6 = normalized.includes(":");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("127.") ||
    (isIpv6 && (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized)
    )) ||
    normalized.startsWith("10.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development";
  assertPreviewBuildEnvironment(environment);
  assertProductionBuildEnvironment(environment);
  assertRevenueCatBuildEnvironment(environment);
  assertNativeObservabilityBuildEnvironment(environment);
  return createCitywalkExpoConfig(config, environment);
};
