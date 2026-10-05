import { LOCAL_TRIPS_STORAGE_KEY } from "../tripStorage";
import { travelerStyleStorageKey } from "../travelerStyle";

export type AccountLocalDataStore = Readonly<{
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}>;

const NATIVE_TRAVELER_PREFIX = "citywalk:native:v2:";

function deletedAccountKeys(keys: readonly string[], userId: string): string[] {
  const styleKey = travelerStyleStorageKey(userId);
  return keys.filter(
    (key) =>
      key.startsWith(NATIVE_TRAVELER_PREFIX) ||
      key === LOCAL_TRIPS_STORAGE_KEY ||
      key === styleKey,
  );
}

async function defaultStore(): Promise<AccountLocalDataStore> {
  return (await import("@react-native-async-storage/async-storage")).default;
}

/**
 * Clear traveler data that can remain on this device after the server has
 * committed an account deletion. This must never run before server success.
 *
 * Auth cookies/session state live in Better Auth's SecureStore integration and
 * are cleared separately by signOut. Unrelated CITYWALK device preferences are
 * intentionally left alone.
 */
export async function purgeDeletedAccountLocalData(
  userId: string,
  store?: AccountLocalDataStore,
): Promise<void> {
  const target = store ?? (await defaultStore());
  const keys = deletedAccountKeys(await target.getAllKeys(), userId);
  if (keys.length) await target.multiRemove(keys);
}

export const accountLocalDataContract = {
  nativeTravelerPrefix: NATIVE_TRAVELER_PREFIX,
  localTripsKey: LOCAL_TRIPS_STORAGE_KEY,
  travelerStyleKey: travelerStyleStorageKey,
} as const;
