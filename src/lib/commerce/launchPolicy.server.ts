import "server-only";

/** Operator-owned runtime configuration only. Never pass request data as configuration. */
type Environment = Readonly<Record<string, string | undefined>>;
export const LAUNCH_DURATION_MS = 28 * 24 * 60 * 60 * 1000;

function utc(value: string | undefined): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value)) return;
  const result = Date.parse(value);
  if (!Number.isFinite(result) || new Date(result).toISOString() !== value) return;
  return result;
}

export function getLaunchPolicy(environment: Environment = process.env, now = new Date()) {
  const start = utc(environment.CITYWALK_LAUNCH_START_UTC);
  const approved = utc(environment.CITYWALK_LAUNCH_APPROVED_AT_UTC);
  const verified = utc(environment.CITYWALK_LAUNCH_VERIFIED_PUBLIC_AT_UTC);
  const budget = Number(environment.CITYWALK_LAUNCH_AI_CALLS_PER_24H);
  const configured = environment.CITYWALK_LAUNCH_FREE_ENABLED === "1" &&
    Boolean(environment.CITYWALK_LAUNCH_APPROVAL_REFERENCE?.trim()) &&
    start !== undefined && approved !== undefined && verified !== undefined &&
    verified <= approved && approved <= start &&
    Number.isSafeInteger(budget) && budget > 0 && budget <= 1000;
  const end = configured ? start! + LAUNCH_DURATION_MS : undefined;
  const active = Boolean(configured && Number.isFinite(now.getTime()) && now.getTime() >= start! && now.getTime() < end!);
  return {
    active,
    ...(configured ? { startsAt: new Date(start!).toISOString(), endsAt: new Date(end!).toISOString() } : {}),
    // Enabling purchases is a separate, explicit post-launch release decision.
    purchasesAllowed: environment.CITYWALK_PUBLIC_PURCHASES_APPROVED === "1" && environment.CITYWALK_LAUNCH_FREE_ENABLED !== "1",
  };
}

export function hasLaunchCityAccess(citySlug: string, now = new Date()): boolean {
  return citySlug === "lubeck" && getLaunchPolicy(process.env, now).active;
}
