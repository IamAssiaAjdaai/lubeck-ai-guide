import { Observe } from "expo-observe";

const MOBILE_ENVIRONMENTS = ["development", "preview", "production"] as const;
type MobileEnvironment = (typeof MOBILE_ENVIRONMENTS)[number];

type NativeObserveConfig = Parameters<typeof Observe.configure>[0];

export function createNativeObservabilityConfig(
  environment = process.env.EXPO_PUBLIC_CITYWALK_ENV ?? "development",
  enabledFlag = process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY,
): NativeObserveConfig {
  const normalizedEnvironment = MOBILE_ENVIRONMENTS.includes(
    environment as MobileEnvironment,
  )
    ? (environment as MobileEnvironment)
    : "development";
  const enabled = enabledFlag?.trim() === "1";

  return {
    dispatchingEnabled: enabled,
    dispatchInDebug: false,
    errorHandlingEnabled: false,
    sampleRate: enabled ? 1 : 0,
    environment: normalizedEnvironment,
  };
}

export function configureNativeObservability(): NativeObserveConfig {
  const config = createNativeObservabilityConfig();
  Observe.configure(config);
  return config;
}
