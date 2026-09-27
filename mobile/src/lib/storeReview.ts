import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import { Linking, Platform } from "react-native";
import type { WalkStore } from "./walkStorage";

type CompletedWalk = Pick<WalkJourney, "id" | "startedAt" | "finishedAt" | "visited">;
type NativeReview = { isAvailableAsync(): Promise<boolean>; requestReview(): Promise<void> };
export const REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const key = "citywalk:native:public-review:v1";
export type ReviewResult = { status: "unavailable" | "ineligible" | "requested" };
export function publicStoreUrl(platform: string, ios?: string, android?: string): string | undefined {
  const configured = platform === "ios" ? ios : platform === "android" ? android : undefined;
  if (!configured?.trim()) return;
  try {
    const url = new URL(configured.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return;
    if (platform === "ios" && url.hostname === "apps.apple.com" && /\/id\d+(?:\/|$)/.test(url.pathname)) return url.href;
    if (platform === "android" && url.hostname === "play.google.com" && url.pathname === "/store/apps/details" && url.searchParams.get("id") === "com.citywalk.app") return url.href;
  } catch { /* An unset or invalid future listing simply has no fallback. */ }
}
export const REVIEW_POLICY = { additionalWalks: 3, cooldownMs: REVIEW_COOLDOWN_MS } as const;
type History = { completedIds: string[]; attemptedIds: string[]; requestedAt?: number; completedAtAttempt: number };
function readHistory(saved: string | null): History {
  if (!saved) return { completedIds: [], attemptedIds: [], completedAtAttempt: 0 };
  const value = JSON.parse(saved);
  const strings = (ids: unknown): string[] => {
    if (!Array.isArray(ids) || !ids.every(id => typeof id === "string")) throw new Error("Invalid review history");
    return [...new Set(ids)];
  };
  // Preserve attempts made by the earlier local implementation.
  const attemptedIds = strings(value.attemptedIds ?? value.journeyIds ?? (typeof value.journeyId === "string" ? [value.journeyId] : []));
  const completedIds = strings(value.completedIds ?? attemptedIds);
  const requestedAt = value.requestedAt;
  const completedAtAttempt = value.completedAtAttempt ?? attemptedIds.length;
  if ((requestedAt !== undefined && (typeof requestedAt !== "number" || !Number.isFinite(requestedAt))) ||
    (attemptedIds.length > 0 && requestedAt === undefined) ||
    !Number.isInteger(completedAtAttempt) || completedAtAttempt < 0 || completedAtAttempt > completedIds.length) throw new Error("Invalid review history");
  return { completedIds, attemptedIds, requestedAt, completedAtAttempt };
}
export function createStoreReview(deps: {
  store(): Promise<WalkStore>;
  native(): Promise<NativeReview | undefined>;
  fallbackUrl(): string | undefined;
  openUrl(url: string): Promise<unknown>;
  now(): number;
  settle?(): Promise<void>;
  policy?: { additionalWalks: number; cooldownMs: number };
}) {
  let queue: Promise<unknown> = Promise.resolve();
  function serialize<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(work, work);
    queue = next.catch(() => undefined);
    return next;
  }
  return {
    configuredUrl: deps.fallbackUrl,
    afterCompletion(walk: CompletedWalk, isActive = () => true): Promise<ReviewResult> {
      return serialize(async () => {
        try {
          if (!walk.id || !Number.isFinite(walk.finishedAt) || !Number.isFinite(walk.startedAt) ||
            walk.finishedAt! < walk.startedAt) return { status: "ineligible" };
          const store = await deps.store();
          const history = readHistory(await store.getItem(key));
          // Count each completed journey once, independently of review eligibility or private feedback.
          if (!history.completedIds.includes(walk.id)) {
            history.completedIds.push(walk.id);
            await store.setItem(key, JSON.stringify(history));
          }
          const policy = deps.policy ?? REVIEW_POLICY;
          const visited = new Set(walk.visited.filter(id => id.trim().length > 0));
          const eligible = visited.size >= 2 && !history.attemptedIds.includes(walk.id) &&
            (history.requestedAt === undefined || deps.now() - history.requestedAt >= policy.cooldownMs ||
              history.completedIds.length - history.completedAtAttempt >= policy.additionalWalks);
          if (!eligible) return { status: "ineligible" };
          await deps.settle?.();
          if (!isActive()) return { status: "ineligible" };
          const native = await deps.native();
          if (!native || !(await native.isAvailableAsync())) return { status: "unavailable" };
          if (!isActive()) return { status: "ineligible" };
          // Durably record the attempt BEFORE entering the OS. A silent OS result is not a submission.
          history.attemptedIds.push(walk.id);
          history.requestedAt = deps.now();
          history.completedAtAttempt = history.completedIds.length;
          await store.setItem(key, JSON.stringify(history));
          if (!isActive()) return { status: "ineligible" };
          await native.requestReview();
          return { status: "requested" };
        } catch { return { status: "unavailable" }; }
      });
    },
    openFallback(): Promise<void> {
      return serialize(async () => {
        // Explicit store links never call the native API or alter automatic review eligibility.
        const url = deps.fallbackUrl();
        if (url) await deps.openUrl(url).catch(() => undefined);
      });
    },
  };
}
export const storeReview = createStoreReview({
  store: async () => (await import("@react-native-async-storage/async-storage")).default,
  native: async () => {
    try { return await import("expo-store-review"); }
    catch { return undefined; } // Existing development clients may lack the native module.
  },
  fallbackUrl: () => publicStoreUrl(Platform.OS,
    process.env.EXPO_PUBLIC_IOS_APP_STORE_URL,
    process.env.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL),
  openUrl: url => Linking.openURL(url),
  now: Date.now,
  settle: () => new Promise(resolve => setTimeout(resolve, 2000)),
});
