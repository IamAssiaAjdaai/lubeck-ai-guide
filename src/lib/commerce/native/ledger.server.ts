import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { commerceProducts, commerceProductGrants, commerceOrders, commerceEntitlements, commerceProviderEvents } from "@/db/commerceSchema";
import { accountBinding, nativeProduct, NativeBillingError, requireGoogleBilling, type VerifiedNativePurchase } from "./config.server";

export function assertAccountBinding(binding: string, userId: string) {
  const expected = Buffer.from(accountBinding(userId)), received = Buffer.from(binding);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new NativeBillingError("ACCOUNT_CONFLICT", 409);
}
/** Caller supplies only server-verified normalized evidence. No receipt/token is persisted. */
export async function deliverNativePurchase(purchase: VerifiedNativePurchase, userId?: string): Promise<"active" | "revoked"> {
  if (purchase.provider === "google_test") requireGoogleBilling();
  if (purchase.state === "purchased") {
    if (!userId) throw new NativeBillingError("INVALID_PURCHASE", 400);
    assertAccountBinding(purchase.binding, userId);
  }
  return getDb().transaction(async tx => {
    const key = `${purchase.provider}:${purchase.transactionKey}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    // Recheck after waiting for the transaction lock, before any durable write.
    if (purchase.provider === "google_test") requireGoogleBilling();
    const [order] = await tx.select().from(commerceOrders).where(and(eq(commerceOrders.provider, purchase.provider), eq(commerceOrders.providerPaymentIntentId, purchase.transactionKey))).limit(1);
    const revocationId = `revoked:${purchase.transactionKey}`;
    if (purchase.state === "revoked") {
      // Tombstone even when notification precedes first delivery. Terminal revocation
      // prevents a previously verified success racing this transaction from granting.
      await tx.insert(commerceProviderEvents).values({ provider: purchase.provider, providerEventId: revocationId, eventType: "native_revoked", outcome: "processed" }).onConflictDoNothing();
      if (order) {
        await tx.update(commerceOrders).set({ status: "refunded", refundedAt: new Date() }).where(eq(commerceOrders.id, order.id));
        await tx.update(commerceEntitlements).set({ status: "revoked", revokedAt: new Date(), revocationReason: "store_revocation" }).where(eq(commerceEntitlements.sourceOrderId, order.id));
      }
      return "revoked";
    }
    if (order && order.userId !== userId) throw new NativeBillingError("ACCOUNT_CONFLICT", 409);
    const [revoked] = await tx.select({ id: commerceProviderEvents.id }).from(commerceProviderEvents).where(and(eq(commerceProviderEvents.provider, purchase.provider), eq(commerceProviderEvents.providerEventId, revocationId))).limit(1);
    if (revoked || (order && order.status !== "paid")) return "revoked";
    const slug = "luebeck-native-sandbox-unlock";
    await tx.insert(commerceProducts).values({ slug, name: "Unlock Lübeck (sandbox)", kind: "feature_bundle", active: false }).onConflictDoNothing();
    const [product] = await tx.select().from(commerceProducts).where(eq(commerceProducts.slug, slug)).limit(1);
    if (!product || (order && order.productId !== product.id)) throw new NativeBillingError("INVALID_PURCHASE", 400);
    await tx.insert(commerceProductGrants).values({ productId: product.id, scopeType: "feature", scopeKey: nativeProduct.entitlement, durationDays: null }).onConflictDoNothing();
    const orderId = order?.id ?? randomUUID();
    if (!order) await tx.insert(commerceOrders).values({ id: orderId, userId, productId: product.id, priceId: null, provider: purchase.provider, providerPaymentIntentId: purchase.transactionKey, status: "paid", currency: null, amountTotal: null, paidAt: new Date() });
    await tx.insert(commerceEntitlements).values({ userId: userId!, productId: product.id, sourceOrderId: orderId, scopeType: "feature", scopeKey: nativeProduct.entitlement, status: "active", expiresAt: null }).onConflictDoNothing();
    const [grant] = await tx.select().from(commerceEntitlements).where(and(eq(commerceEntitlements.sourceOrderId, orderId), eq(commerceEntitlements.scopeType, "feature"), eq(commerceEntitlements.scopeKey, nativeProduct.entitlement))).limit(1);
    await tx.insert(commerceProviderEvents).values({ provider: purchase.provider, providerEventId: `verified:${purchase.transactionKey}`, eventType: "native_verified", outcome: "processed" }).onConflictDoNothing();
    return grant?.status === "active" && (!grant.expiresAt || grant.expiresAt > new Date()) ? "active" : "revoked";
  });
}
