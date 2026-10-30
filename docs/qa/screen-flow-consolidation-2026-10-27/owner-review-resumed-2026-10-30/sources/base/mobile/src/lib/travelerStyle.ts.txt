import type { Interest, WalkSettings } from "@citywalk/traveler-core/walkPlanner";

export const TRAVELER_STYLE_STORAGE_KEY = "citywalk:native:v1:traveler-style";
export const travelerStyleStorageKey = (userId: string) => `${TRAVELER_STYLE_STORAGE_KEY}:${userId}`;
// Do not migrate the older unscoped preview value: without an owner it could leak one traveler's defaults into another account.
export const TRAVELER_STYLE_VERSION = 1;
export const TRAVELER_STYLE_INTERESTS = [
  "history",
  "architecture",
  "hidden-gems",
  "nature",
  "food",
  "culture",
  "family",
] as const satisfies readonly Interest[];
export const TRAVELER_STYLE_WALKING = ["easy", "balanced", "long"] as const satisfies readonly WalkSettings["walking"][];
export const TRAVELER_STYLE_DURATIONS = [60, 90, 120, 180] as const;

export type TravelerStyle = Readonly<{
  interests: readonly Interest[];
  walking: WalkSettings["walking"];
  minutes: (typeof TRAVELER_STYLE_DURATIONS)[number];
}>;

export const DEFAULT_TRAVELER_STYLE: TravelerStyle = {
  interests: ["history", "architecture"],
  walking: "balanced",
  minutes: 120,
};

type Store = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

function parse(value: unknown): TravelerStyle {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_TRAVELER_STYLE;
  const record = value as Record<string, unknown>;
  const interests = record.interests;
  if (
    record.version !== TRAVELER_STYLE_VERSION ||
    !Array.isArray(interests) ||
    !interests.every((interest) => TRAVELER_STYLE_INTERESTS.includes(interest as Interest)) ||
    !TRAVELER_STYLE_WALKING.includes(record.walking as WalkSettings["walking"]) ||
    !TRAVELER_STYLE_DURATIONS.includes(record.minutes as TravelerStyle["minutes"])
  ) return DEFAULT_TRAVELER_STYLE;
  return {
    interests: TRAVELER_STYLE_INTERESTS.filter((interest) => interests.includes(interest)),
    walking: record.walking as WalkSettings["walking"],
    minutes: record.minutes as TravelerStyle["minutes"],
  };
}

async function defaultStore(): Promise<Store> {
  return (await import("@react-native-async-storage/async-storage")).default;
}

export async function loadTravelerStyle(
  userId: string | undefined,
  store?: Store,
): Promise<TravelerStyle> {
  if (!userId) return DEFAULT_TRAVELER_STYLE;
  try {
    const raw = await (store ?? await defaultStore()).getItem(travelerStyleStorageKey(userId));
    return raw ? parse(JSON.parse(raw)) : DEFAULT_TRAVELER_STYLE;
  } catch {
    return DEFAULT_TRAVELER_STYLE;
  }
}

export async function saveTravelerStyle(
  userId: string | undefined,
  style: TravelerStyle,
  store?: Store,
): Promise<TravelerStyle> {
  if (!userId) throw new Error("Account required.");
  const validated = parse({ version: TRAVELER_STYLE_VERSION, ...style });
  await (store ?? await defaultStore()).setItem(
    travelerStyleStorageKey(userId),
    JSON.stringify({ version: TRAVELER_STYLE_VERSION, ...validated }),
  );
  return validated;
}
