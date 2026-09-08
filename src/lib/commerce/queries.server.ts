import { and, desc, eq } from "drizzle-orm";

import { user } from "@/db/authSchema";
import {
  commerceEntitlements,
  commerceOrders,
  commercePrices,
  commerceProductGrants,
  commerceProducts,
} from "@/db/commerceSchema";
import { getDb } from "@/db/client";
import { LUBECK_CITY_PASS_PRODUCT_SLUG } from "@/lib/commerce/cityPassAccess.server";

export async function listActiveCommerceOffers() {
  return getDb()
    .select({
      priceId: commercePrices.id,
      productId: commerceProducts.id,
      productSlug: commerceProducts.slug,
      productName: commerceProducts.name,
      description: commerceProducts.description,
      kind: commerceProducts.kind,
      currency: commercePrices.currency,
      unitAmount: commercePrices.unitAmount,
    })
    .from(commercePrices)
    .innerJoin(
      commerceProducts,
      eq(commercePrices.productId, commerceProducts.id),
    )
    .where(
      and(
        eq(commercePrices.active, true),
        eq(commerceProducts.active, true),
      ),
    )
    .orderBy(commerceProducts.id, commercePrices.id);
}

export async function getLubeckCityPassOffer() {
  const [offer] = await getDb()
    .select({
      priceId: commercePrices.id,
      productSlug: commerceProducts.slug,
      productName: commerceProducts.name,
      description: commerceProducts.description,
      currency: commercePrices.currency,
      unitAmount: commercePrices.unitAmount,
      durationDays: commerceProductGrants.durationDays,
    })
    .from(commercePrices)
    .innerJoin(
      commerceProducts,
      eq(commercePrices.productId, commerceProducts.id),
    )
    .innerJoin(
      commerceProductGrants,
      eq(commerceProductGrants.productId, commerceProducts.id),
    )
    .where(
      and(
        eq(commerceProducts.slug, LUBECK_CITY_PASS_PRODUCT_SLUG),
        eq(commerceProducts.kind, "city_pass"),
        eq(commerceProducts.active, true),
        eq(commercePrices.active, true),
        eq(commerceProductGrants.scopeType, "city"),
        eq(commerceProductGrants.scopeKey, "lubeck"),
      ),
    )
    .limit(1);
  return offer;
}

export async function listUserCommerceState(userId: string) {
  const db = getDb();
  const [orders, entitlements] = await Promise.all([
    db
      .select({
        id: commerceOrders.id,
        productName: commerceProducts.name,
        productSlug: commerceProducts.slug,
        status: commerceOrders.status,
        currency: commerceOrders.currency,
        amountTotal: commerceOrders.amountTotal,
        createdAt: commerceOrders.createdAt,
        paidAt: commerceOrders.paidAt,
        refundedAt: commerceOrders.refundedAt,
      })
      .from(commerceOrders)
      .innerJoin(
        commerceProducts,
        eq(commerceOrders.productId, commerceProducts.id),
      )
      .where(eq(commerceOrders.userId, userId))
      .orderBy(desc(commerceOrders.createdAt))
      .limit(100),
    db
      .select({
        id: commerceEntitlements.id,
        productName: commerceProducts.name,
        scopeType: commerceEntitlements.scopeType,
        scopeKey: commerceEntitlements.scopeKey,
        status: commerceEntitlements.status,
        grantedAt: commerceEntitlements.grantedAt,
        expiresAt: commerceEntitlements.expiresAt,
        revokedAt: commerceEntitlements.revokedAt,
      })
      .from(commerceEntitlements)
      .innerJoin(
        commerceProducts,
        eq(commerceEntitlements.productId, commerceProducts.id),
      )
      .where(eq(commerceEntitlements.userId, userId))
      .orderBy(desc(commerceEntitlements.grantedAt))
      .limit(100),
  ]);

  return { orders, entitlements } as const;
}

export async function getAdminCommerceOverview() {
  const db = getDb();
  const [orders, entitlements] = await Promise.all([
    db
      .select({
        id: commerceOrders.id,
        userEmail: user.email,
        productName: commerceProducts.name,
        status: commerceOrders.status,
        provider: commerceOrders.provider,
        currency: commerceOrders.currency,
        amountTotal: commerceOrders.amountTotal,
        createdAt: commerceOrders.createdAt,
      })
      .from(commerceOrders)
      .innerJoin(
        commerceProducts,
        eq(commerceOrders.productId, commerceProducts.id),
      )
      .leftJoin(user, eq(commerceOrders.userId, user.id))
      .orderBy(desc(commerceOrders.createdAt))
      .limit(100),
    db
      .select({
        id: commerceEntitlements.id,
        userEmail: user.email,
        productName: commerceProducts.name,
        scopeType: commerceEntitlements.scopeType,
        scopeKey: commerceEntitlements.scopeKey,
        status: commerceEntitlements.status,
        grantedAt: commerceEntitlements.grantedAt,
        expiresAt: commerceEntitlements.expiresAt,
      })
      .from(commerceEntitlements)
      .innerJoin(
        commerceProducts,
        eq(commerceEntitlements.productId, commerceProducts.id),
      )
      .leftJoin(user, eq(commerceEntitlements.userId, user.id))
      .orderBy(desc(commerceEntitlements.grantedAt))
      .limit(100),
  ]);

  return { orders, entitlements } as const;
}

export function formatMinorCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}
