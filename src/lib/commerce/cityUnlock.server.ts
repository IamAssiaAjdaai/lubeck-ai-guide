import "server-only";
import { requireTester } from "./native/config.server";
import { getCityUnlockProduct } from "@citywalk/traveler-core";
import { hasActiveEntitlement, type EntitlementDependencies } from "./entitlements.server";

/** Reuses the canonical commerce ledger. Never accepts a receipt or client premium flag. */
export async function hasCityUnlock(
  input: { userId?: string; citySlug: string; now?: Date },
  dependencies?: EntitlementDependencies,
): Promise<boolean> {
  const product = getCityUnlockProduct(input.citySlug);
  if (!input.userId || !product) return false;

  // RevenueCat / production City Pass authority. The provider is irrelevant here: only
  // a verified, active PostgreSQL city entitlement can authorize the traveler.
  if (await hasActiveEntitlement({
    userId: input.userId,
    scopeType: "city",
    scopeKey: input.citySlug,
    now: input.now,
  }, dependencies)) return true;

  // Legacy direct-Store sandbox compatibility. This old feature-scoped entitlement is
  // deliberately tester-only and can never become production RevenueCat authority.
  try { requireTester(input.userId); } catch { return false; }
  return hasActiveEntitlement({
    userId: input.userId,
    scopeType: "feature",
    scopeKey: product.entitlement,
    now: input.now,
  }, dependencies);
}
