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
  // This phase grants sandbox ownership only; never authorize it in Production.
  try { requireTester(input.userId); } catch { return false; }
  return hasActiveEntitlement({ userId: input.userId, scopeType: "feature", scopeKey: product.entitlement, now: input.now }, dependencies);
}
