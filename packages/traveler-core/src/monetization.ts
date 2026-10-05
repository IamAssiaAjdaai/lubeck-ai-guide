export const CITYWALK_PREMIUM_ENTITLEMENT = Object.freeze({
  scopeType: "feature" as const,
  scopeKey: "premium",
});

export const CITYWALK_ACCESS_LEVELS = [
  "free",
  "city_pass",
  "premium",
] as const;

export type CitywalkAccessLevel = (typeof CITYWALK_ACCESS_LEVELS)[number];

export const CITYWALK_GUIDE_DAILY_LIMITS = Object.freeze({
  free: 3,
  paid: 20,
});
