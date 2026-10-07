import { Observe } from "expo-observe";

const MOBILE_ENVIRONMENTS = ["development", "preview", "production"] as const;
type MobileEnvironment = (typeof MOBILE_ENVIRONMENTS)[number];

type NativeObserveConfig = Parameters<typeof Observe.configure>[0];

export function createNativeObservabilityConfig(
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  _enabledFlag = process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY,
): NativeObserveConfig {
  const normalizedEnvironment = MOBILE_ENVIRONMENTS.includes(
    environment as MobileEnvironment,
  )
    ? (environment as MobileEnvironment)
    : "development";
  return {
    dispatchingEnabled: false,
    dispatchInDebug: false,
    sampleRate: 0,
    environment: normalizedEnvironment,
  };
}

export function configureNativeObservability(): NativeObserveConfig {
  const config = createNativeObservabilityConfig();
  Observe.configure(config);
  return config;
}
