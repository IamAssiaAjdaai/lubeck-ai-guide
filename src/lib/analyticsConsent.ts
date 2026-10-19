export const ANALYTICS_CONSENT_STORAGE_KEY = "citywalk:analytics-consent:v1";
export const ANALYTICS_WITHDRAWAL_STORAGE_KEY = "citywalk:analytics-withdrawal:v1";
const CONSENT_VERSION = 1;
const CHANNEL_NAME = "citywalk:analytics-consent";

export type AnalyticsConsent = "unset" | "granted" | "denied";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type StoredAnalyticsConsent = { version: number; decision: AnalyticsConsent };

// This override takes effect before SDK callbacks or any fallible storage work.
// Only a verified, explicit opt-in in this document can release it.
let runtimeOverride: AnalyticsConsent | undefined;
let persistenceFailed = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let stopListening: (() => void) | undefined;

function browserStorage(name: "localStorage" | "sessionStorage"): StorageLike | undefined {
  if (typeof window === "undefined") return;
  try { return window[name]; } catch { return; }
}

function storedDecision(raw: string | null): AnalyticsConsent {
  try {
    const value = JSON.parse(raw ?? "null") as StoredAnalyticsConsent | null;
    return value?.version === CONSENT_VERSION &&
      (value.decision === "granted" || value.decision === "denied")
      ? value.decision : "unset";
  } catch { return "unset"; }
}

function hasWithdrawalMarker(): boolean {
  try {
    return Boolean(browserStorage("sessionStorage")?.getItem(ANALYTICS_WITHDRAWAL_STORAGE_KEY));
  } catch { return true; }
}

export function getAnalyticsConsent(storage = browserStorage("localStorage")): AnalyticsConsent {
  if (runtimeOverride !== undefined) return runtimeOverride;
  if (hasWithdrawalMarker()) return "denied";
  try { return storedDecision(storage?.getItem(ANALYTICS_CONSENT_STORAGE_KEY) ?? null); }
  catch { return "unset"; }
}

export function getAnalyticsConsentPersistenceFailed(): boolean {
  if (persistenceFailed) return true;
  if (!hasWithdrawalMarker()) return false;
  // Retain honest feedback after a manual reload protected only by session storage.
  const storage = browserStorage("localStorage");
  try { return !storage || storedDecision(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)) === "granted"; }
  catch { return true; }
}

function notify() {
  // A broken consumer must not prevent the remaining consumers being disabled.
  for (const listener of listeners) { try { listener(); } catch { /* fail closed */ } }
}

function writeVerified(storage: StorageLike | undefined, key: string, value: string): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return storage.getItem(key) === value;
  } catch { return false; }
}

function removeVerified(storage: StorageLike | undefined, key: string): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return storage.getItem(key) === null;
  } catch { return false; }
}

function rememberWithdrawal() {
  // Best effort: survives reload in this tab if persistent storage cannot change.
  writeVerified(browserStorage("sessionStorage"), ANALYTICS_WITHDRAWAL_STORAGE_KEY, "denied");
}

function persistDenied(storage: StorageLike | undefined): boolean {
  return writeVerified(storage, ANALYTICS_CONSENT_STORAGE_KEY,
    JSON.stringify({ version: CONSENT_VERSION, decision: "denied" })) ||
    removeVerified(storage, ANALYTICS_CONSENT_STORAGE_KEY);
}

function deny(storage: StorageLike | undefined, broadcast: boolean): boolean {
  runtimeOverride = "denied";
  notify();
  rememberWithdrawal();
  if (broadcast) { try { channel?.postMessage({ type: "withdraw" }); } catch { /* optional transport */ } }
  const persisted = persistDenied(storage);
  persistenceFailed = !persisted;
  notify();
  return persisted;
}

/** Returns true only if the durable choice (or removal of an old grant) is verified. */
export function setAnalyticsConsent(
  decision: Exclude<AnalyticsConsent, "unset">,
  storage = browserStorage("localStorage"),
): boolean {
  if (decision === "denied") return deny(storage, true);

  runtimeOverride = "denied";
  notify();
  const session = browserStorage("sessionStorage");
  if (writeVerified(storage, ANALYTICS_CONSENT_STORAGE_KEY,
    JSON.stringify({ version: CONSENT_VERSION, decision })) &&
    (!session || removeVerified(session, ANALYTICS_WITHDRAWAL_STORAGE_KEY))) {
    runtimeOverride = undefined;
    persistenceFailed = false;
    notify();
    return true;
  }
  // Failed opt-in must never reuse a stale grant or enable the SDK.
  deny(storage, true);
  persistenceFailed = true;
  notify();
  return false;
}

export function clearAnalyticsConsent(storage = browserStorage("localStorage")): boolean {
  runtimeOverride = "unset";
  notify();
  rememberWithdrawal();
  try { channel?.postMessage({ type: "withdraw" }); } catch { /* optional transport */ }
  const removed = removeVerified(storage, ANALYTICS_CONSENT_STORAGE_KEY);
  persistenceFailed = !removed;
  notify();
  return removed;
}

export function subscribeAnalyticsConsent(listener: () => void): () => void {
  listeners.add(listener);
  if (!stopListening && typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      if (event.storageArea && event.storageArea !== browserStorage("localStorage")) return;
      if (storedDecision(event.newValue) !== "granted") {
        deny(browserStorage("localStorage"), false);
      } else {
        // A grant from another tab cannot clear this document's withdrawal latch.
        notify();
      }
    };
    const onResume = () => notify();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("focus", onResume);
    try {
      if (typeof window.BroadcastChannel === "function") {
        channel = new window.BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event: MessageEvent) => {
          if (event.data?.type === "withdraw") deny(browserStorage("localStorage"), false);
        };
      }
    } catch { /* Storage events and capture-time checks still apply. */ }
    stopListening = () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("focus", onResume);
      channel?.close();
      channel = undefined;
      stopListening = undefined;
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopListening?.();
  };
}
