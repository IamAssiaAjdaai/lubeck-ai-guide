/** Store ownership is independent of price and the legacy time-limited web pass. */
export type CityUnlockProduct = Readonly<{
  citySlug: string;
  entitlement: string;
  productId: string;
  kind: "non-consumable";
}>;
const products: Readonly<Record<string, CityUnlockProduct>> = Object.freeze({
  lubeck: Object.freeze({ citySlug: "lubeck", entitlement: "city:luebeck:premium", productId: "com.citywalk.luebeck.premium", kind: "non-consumable" }),
});
export function getCityUnlockProduct(citySlug: string): CityUnlockProduct | undefined {
  return Object.hasOwn(products, citySlug) ? products[citySlug] : undefined;
}
export const CITY_UNLOCK_STATES = [
  "store_product_loading", "store_product_unavailable", "ready", "purchase_started",
  "purchase_pending", "purchase_cancelled", "purchase_failed", "verification_pending",
  "verification_failed", "entitlement_activating", "unlocked", "already_owned",
  "restore_started", "restore_success", "nothing_to_restore", "restore_failed",
  "account_required", "access_unavailable", "account_conflict", "purchase_revoked",
] as const;
export type CityUnlockState = typeof CITY_UNLOCK_STATES[number];
export const CITY_UNLOCK_EVENTS = [
  "city_unlock_paywall_viewed", "city_unlock_dismissed", "city_unlock_purchase_started",
  "city_unlock_purchase_cancelled", "city_unlock_purchase_failed", "city_unlock_purchase_verified",
  "city_unlock_entitlement_activated", "city_unlock_restore_started", "city_unlock_restore_success",
  "city_unlock_restore_empty", "city_unlock_restore_failed",
] as const;
/** Existing editorial tour remains a free sample; no invented premium catalog. */
export function editorialTourAccess(citySlug: string, tourSlug: string): "free-sample" | "unclassified" {
  return citySlug === "lubeck" && tourSlug === "historic-center-walk" ? "free-sample" : "unclassified";
}
