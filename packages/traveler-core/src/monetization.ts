export const CITYWALK_PREMIUM_ENTITLEMENT = Object.freeze({
  scopeType: "feature" as const,
  scopeKey: "premium",
});

export const CITYWALK_CITY_PASS_72H = Object.freeze({
  lubeck: Object.freeze({
    citySlug: "lubeck",
    scopeType: "city" as const,
    scopeKey: "lubeck",
    packageIdentifier: "city_pass_72h",
    productIdentifier: "com.citywalk.lubeck.pass72h",
    durationHours: 72,
  }),
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

/**
 * Canonical cross-store logical product IDs. Google Play attaches a base-plan
 * suffix in RevenueCat, but the subscription ID is stable.
 */
export const CITYWALK_REVENUECAT_PRODUCT_IDS = Object.freeze({
  monthly: "com.citywalk.premium.monthly",
  annual: "com.citywalk.premium.yearly",
  cityPass72h: CITYWALK_CITY_PASS_72H.lubeck.productIdentifier,
});

export const CITYWALK_REVENUECAT_PACKAGE_IDS = Object.freeze({
  monthly: "$rc_monthly",
  annual: "$rc_annual",
  cityPass72h: CITYWALK_CITY_PASS_72H.lubeck.packageIdentifier,
});

const GOOGLE_PLAY_BASE_PLAN_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Apple exact IDs; Google Play exact legacy IDs or IDs with valid base plans. */
export function matchesCitywalkRevenueCatProduct(
  expectedSubscriptionId: string,
  actualStoreProductId: string,
  platform: "ios" | "android",
): boolean {
  if (actualStoreProductId === expectedSubscriptionId) return true;
  if (platform !== "android") return false;
  const prefix = `${expectedSubscriptionId}:`;
  return actualStoreProductId.startsWith(prefix) &&
    GOOGLE_PLAY_BASE_PLAN_ID.test(actualStoreProductId.slice(prefix.length));
}
