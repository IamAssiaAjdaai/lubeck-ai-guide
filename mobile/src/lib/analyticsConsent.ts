import AsyncStorage from "@react-native-async-storage/async-storage";

export const NATIVE_ANALYTICS_CONSENT_STORAGE_KEY = "citywalk:analytics-consent:v1";
const CONSENT_VERSION = 1;

export type NativeAnalyticsConsent = "unset" | "granted" | "denied";

type StoredNativeAnalyticsConsent = Readonly<{
  version: typeof CONSENT_VERSION;
  decision: Exclude<NativeAnalyticsConsent, "unset">;
}>;

export async function getNativeAnalyticsConsent(): Promise<NativeAnalyticsConsent> {
  try {
    const raw = await AsyncStorage.getItem(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) return "unset";
    const value = JSON.parse(raw) as Partial<StoredNativeAnalyticsConsent>;
    return value.version === CONSENT_VERSION &&
      (value.decision === "granted" || value.decision === "denied")
      ? value.decision
      : "unset";
  } catch {
    return "unset";
  }
}

export async function setNativeAnalyticsConsent(
  decision: Exclude<NativeAnalyticsConsent, "unset">,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NATIVE_ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, decision }),
    );
  } catch {
    // Consent storage failures must fail closed and never make CITYWALK unusable.
  }
}

export async function clearNativeAnalyticsConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    // Missing storage is already effectively fail-closed.
  }
}
