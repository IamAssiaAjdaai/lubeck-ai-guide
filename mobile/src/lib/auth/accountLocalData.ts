import { CURATED_PROGRESS_STORAGE_PREFIX } from "../curatedProgressStorage";
import { LIVE_WALK_STORAGE_KEY } from "../liveWalkStorage";
import { LOCAL_TRIPS_STORAGE_KEY } from "../tripStorage";
import { travelerStyleStorageKey } from "../travelerStyle";
import { clearNativeVisitorIdentity } from "../visitorIdentity";

export type AccountLocalDataStore = Readonly<{
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
  removeItem(key: string): Promise<void>;
}>;

const NATIVE_TRAVELER_PREFIX = "citywalk:native:v2:";
const GUIDE_HISTORY_PREFIX = "citywalk:guide:";

function deletedAccountKeys(keys: readonly string[], userId: string): string[] {
  const styleKey = travelerStyleStorageKey(userId);
  return keys.filter((key) =>
    key.startsWith(NATIVE_TRAVELER_PREFIX) ||
    key.startsWith(CURATED_PROGRESS_STORAGE_PREFIX) ||
    key.startsWith(GUIDE_HISTORY_PREFIX) ||
    key === LOCAL_TRIPS_STORAGE_KEY ||
    key === LIVE_WALK_STORAGE_KEY ||
    key === styleKey,
  );
}

async function defaultStore(): Promise<AccountLocalDataStore> {
  return (await import("@react-native-async-storage/async-storage")).default;
}

/** Clear traveler-generated device state only after the server committed deletion. */
export async function purgeDeletedAccountLocalData(userId: string, store?: AccountLocalDataStore): Promise<void> {
  const target = store ?? (await defaultStore());
  const keys = deletedAccountKeys(await target.getAllKeys(), userId);
  if (keys.length) await target.multiRemove(keys);
  await clearNativeVisitorIdentity(target);
}

export const accountLocalDataContract = {
  nativeTravelerPrefix: NATIVE_TRAVELER_PREFIX,
  curatedProgressPrefix: CURATED_PROGRESS_STORAGE_PREFIX,
  guideHistoryPrefix: GUIDE_HISTORY_PREFIX,
  localTripsKey: LOCAL_TRIPS_STORAGE_KEY,
  liveWalkKey: LIVE_WALK_STORAGE_KEY,
  travelerStyleKey: travelerStyleStorageKey,
} as const;
