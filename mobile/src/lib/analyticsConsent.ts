import AsyncStorage from "@react-native-async-storage/async-storage";

export const NATIVE_ANALYTICS_CONSENT_STORAGE_KEY = "citywalk:analytics-consent:v1";
const CONSENT_VERSION = 1;
let blockedInThisRuntime = false;
let writeQueue: Promise<void> = Promise.resolve();
let decisionRevision = 0;

export type NativeAnalyticsConsent = "unset" | "granted" | "denied";

type StoredNativeAnalyticsConsent = Readonly<{
  version: typeof CONSENT_VERSION;
  decision: Exclude<NativeAnalyticsConsent, "unset">;
}>;

export async function getNativeAnalyticsConsent(): Promise<NativeAnalyticsConsent> {
  if (blockedInThisRuntime) return "denied";
  try {
    const raw = await AsyncStorage.getItem(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY);
    if (blockedInThisRuntime) return "denied";
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
  // Withdrawal takes effect before asynchronous storage finishes.
  blockedInThisRuntime = true;
  const revision = ++decisionRevision;
  writeQueue = writeQueue.then(async () => {
    try {
      await AsyncStorage.setItem(
        NATIVE_ANALYTICS_CONSENT_STORAGE_KEY,
        JSON.stringify({ version: CONSENT_VERSION, decision }),
      );
      if (revision === decisionRevision) blockedInThisRuntime = decision !== "granted";
    } catch {
      // A failed write must not reactivate a previous persistent grant.
      await AsyncStorage.removeItem(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY).catch(() => undefined);
    }
  });
  await writeQueue;
}

export async function clearNativeAnalyticsConsent(): Promise<void> {
  blockedInThisRuntime = true;
  const revision = ++decisionRevision;
  writeQueue = writeQueue.then(async () => {
    try {
      await AsyncStorage.removeItem(NATIVE_ANALYTICS_CONSENT_STORAGE_KEY);
      if (revision === decisionRevision) blockedInThisRuntime = false;
    } catch {
      // Failed cleanup must not reactivate a previous persistent grant.
    }
  });
  await writeQueue;
}
