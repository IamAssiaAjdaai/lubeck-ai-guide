export const ANALYTICS_CONSENT_STORAGE_KEY = "citywalk:analytics-consent:v1";
const CONSENT_VERSION = 1;

export type AnalyticsConsent = "unset" | "granted" | "denied";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type StoredAnalyticsConsent = Readonly<{
  version: typeof CONSENT_VERSION;
  decision: Exclude<AnalyticsConsent, "unset">;
}>;

function browserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return;
  try {
    return window.localStorage;
  } catch {
    return;
  }
}

export function getAnalyticsConsent(
  storage: StorageLike | undefined = browserStorage(),
): AnalyticsConsent {
  if (!storage) return "unset";
  try {
    const raw = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) return "unset";
    const value = JSON.parse(raw) as Partial<StoredAnalyticsConsent>;
    return value.version === CONSENT_VERSION &&
      (value.decision === "granted" || value.decision === "denied")
      ? value.decision
      : "unset";
  } catch {
    return "unset";
  }
}

export function setAnalyticsConsent(
  decision: Exclude<AnalyticsConsent, "unset">,
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, decision }),
    );
  } catch {
    // Consent choices must never make CITYWALK unusable when storage is blocked.
  }
}

export function clearAnalyticsConsent(
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    // A blocked browser store is already effectively fail-closed for persistence.
  }
}
