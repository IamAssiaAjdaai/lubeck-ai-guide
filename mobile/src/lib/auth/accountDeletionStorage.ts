import AsyncStorage from "@react-native-async-storage/async-storage";

import { LIVE_WALK_STORAGE_KEY } from "../liveWalkStorage";
import { LOCAL_TRIPS_STORAGE_KEY } from "../tripStorage";
import { travelerStyleStorageKey } from "../travelerStyle";
import { clearNativeVisitorIdentity } from "../visitorIdentity";

export const ACCOUNT_DELETION_LOCAL_EXACT_KEYS = [
  "citywalk:native:v2:saved",
  "citywalk:native:v2:places",
  LOCAL_TRIPS_STORAGE_KEY,
  LIVE_WALK_STORAGE_KEY,
] as const;

export const ACCOUNT_DELETION_LOCAL_PREFIXES = [
  "citywalk:native:v2:active:",
  "citywalk:native:v2:feedback:",
  "citywalk:guide:",
] as const;

type DeletionStore = Pick<
  typeof AsyncStorage,
  "getAllKeys" | "multiRemove" | "removeItem"
>;

export function accountDeletionLocalKeys(
  keys: readonly string[],
  userId: string,
): string[] {
  const exact = new Set<string>([
    ...ACCOUNT_DELETION_LOCAL_EXACT_KEYS,
    travelerStyleStorageKey(userId),
  ]);
  return keys.filter(
    (key) => exact.has(key) || ACCOUNT_DELETION_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
}

/**
 * Clears traveler-generated device state only after the server has committed
 * account deletion. Locale and public content caches intentionally survive as
 * device preferences/cache rather than account data.
 */
export async function clearDeletedAccountLocalData(
  userId: string,
  store: DeletionStore = AsyncStorage,
): Promise<void> {
  const keys = await store.getAllKeys();
  const removable = accountDeletionLocalKeys(keys, userId);
  if (removable.length) await store.multiRemove(removable);
  await clearNativeVisitorIdentity(store);
}
