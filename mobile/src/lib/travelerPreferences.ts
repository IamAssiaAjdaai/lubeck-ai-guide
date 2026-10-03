import {
  interestTags,
  type Interest,
  type WalkSettings,
} from "@citywalk/traveler-core/walkPlanner";

export const TRAVELER_PREFERENCES_VERSION = 1;
export const TRAVELER_PREFERENCES_STORAGE_KEY =
  `citywalk:native:traveler-preferences:v${TRAVELER_PREFERENCES_VERSION}`;

export const TRAVELER_WALK_DURATIONS = [60, 90, 120, 180] as const;
export type TravelerWalkDuration = (typeof TRAVELER_WALK_DURATIONS)[number];

export type TravelerPreferences = Readonly<{
  interests: readonly Interest[];
  walking: WalkSettings["walking"];
  typicalMinutes: TravelerWalkDuration;
}>;

export const DEFAULT_TRAVELER_PREFERENCES: TravelerPreferences = Object.freeze({
  interests: ["history", "architecture"],
  walking: "balanced",
  typicalMinutes: 120,
});

type PreferenceStore = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

type StoredTravelerPreferences = Readonly<{
  version: typeof TRAVELER_PREFERENCES_VERSION;
  ownerUserId: string;
  preferences: TravelerPreferences;
}>;

const allowedInterests = new Set<Interest>(Object.keys(interestTags) as Interest[]);
const allowedWalking = new Set<WalkSettings["walking"]>(["easy", "balanced", "long"]);

export function parseTravelerPreferences(value: unknown): TravelerPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_TRAVELER_PREFERENCES;
  }
  const candidate = value as Record<string, unknown>;
  const interests = Array.isArray(candidate.interests)
    ? candidate.interests.filter(
        (interest): interest is Interest =>
          typeof interest === "string" && allowedInterests.has(interest as Interest),
      )
    : [];
  const walking =
    typeof candidate.walking === "string" &&
    allowedWalking.has(candidate.walking as WalkSettings["walking"])
      ? (candidate.walking as WalkSettings["walking"])
      : DEFAULT_TRAVELER_PREFERENCES.walking;
  const typicalMinutes = TRAVELER_WALK_DURATIONS.includes(
    candidate.typicalMinutes as TravelerWalkDuration,
  )
    ? (candidate.typicalMinutes as TravelerWalkDuration)
    : DEFAULT_TRAVELER_PREFERENCES.typicalMinutes;
  return {
    interests: [...new Set(interests)],
    walking,
    typicalMinutes,
  };
}

export async function loadTravelerPreferences(
  userId: string | undefined,
  store?: PreferenceStore,
): Promise<TravelerPreferences> {
  if (!userId) return DEFAULT_TRAVELER_PREFERENCES;
  const target = store ?? (await defaultStore());
  let raw: string | null;
  try {
    raw = await target.getItem(TRAVELER_PREFERENCES_STORAGE_KEY);
  } catch {
    return DEFAULT_TRAVELER_PREFERENCES;
  }
  if (!raw) return DEFAULT_TRAVELER_PREFERENCES;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return DEFAULT_TRAVELER_PREFERENCES;
    }
    const record = value as Record<string, unknown>;
    if (
      record.version !== TRAVELER_PREFERENCES_VERSION ||
      record.ownerUserId !== userId ||
      !("preferences" in record)
    ) {
      return DEFAULT_TRAVELER_PREFERENCES;
    }
    return parseTravelerPreferences(record.preferences);
  } catch {
    return DEFAULT_TRAVELER_PREFERENCES;
  }
}

export async function saveTravelerPreferences(
  userId: string,
  preferences: TravelerPreferences,
  store?: PreferenceStore,
): Promise<TravelerPreferences> {
  if (!userId) throw new Error("Account required.");
  const target = store ?? (await defaultStore());
  const validated = parseTravelerPreferences(preferences);
  const record: StoredTravelerPreferences = {
    version: TRAVELER_PREFERENCES_VERSION,
    ownerUserId: userId,
    preferences: validated,
  };
  await target.setItem(TRAVELER_PREFERENCES_STORAGE_KEY, JSON.stringify(record));
  return validated;
}

async function defaultStore(): Promise<PreferenceStore> {
  return (await import("@react-native-async-storage/async-storage")).default;
}
