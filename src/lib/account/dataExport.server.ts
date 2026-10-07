import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { account, session, user } from "@/db/authSchema";
import { accountSavedWalks, travelerGuestLinks, travelerProfiles } from "@/db/travelerSchema";
import {
  commerceCustomers,
  commerceEntitlements,
  commerceOrders,
  commerceProducts,
  commerceSubscriptions,
} from "@/db/commerceSchema";

export class AccountDataExportError extends Error {
  constructor(readonly status: number) {
    super("Account data export unavailable.");
  }
}

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export async function buildAccountDataExport(userId: string) {
  const db = getDb();
  const [
    users,
    authMethods,
    sessions,
    profiles,
    guestLinks,
    savedWalks,
    customers,
    orders,
    subscriptions,
    entitlements,
  ] = await Promise.all([
    db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }).from(user).where(eq(user.id, userId)),
    db.select({
      provider: account.providerId,
      providerAccountId: account.accountId,
      scope: account.scope,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
      refreshTokenExpiresAt: account.refreshTokenExpiresAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }).from(account).where(eq(account.userId, userId)).orderBy(asc(account.createdAt)),
    db.select({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }).from(session).where(eq(session.userId, userId)).orderBy(asc(session.createdAt)),
    db.select({
      preferredLocale: travelerProfiles.preferredLocale,
      createdAt: travelerProfiles.createdAt,
      updatedAt: travelerProfiles.updatedAt,
    }).from(travelerProfiles).where(eq(travelerProfiles.userId, userId)),
    db.select({
      visitorId: travelerGuestLinks.visitorId,
      sessionId: travelerGuestLinks.sessionId,
      createdAt: travelerGuestLinks.createdAt,
      updatedAt: travelerGuestLinks.updatedAt,
    }).from(travelerGuestLinks).where(eq(travelerGuestLinks.userId, userId)).orderBy(asc(travelerGuestLinks.createdAt)),
    db.select({
      id: accountSavedWalks.id,
      citySlug: accountSavedWalks.citySlug,
      route: accountSavedWalks.route,
      createdAt: accountSavedWalks.createdAt,
      updatedAt: accountSavedWalks.updatedAt,
    }).from(accountSavedWalks).where(eq(accountSavedWalks.userId, userId)).orderBy(asc(accountSavedWalks.createdAt)),
    db.select({
      provider: commerceCustomers.provider,
      providerCustomerId: commerceCustomers.providerCustomerId,
      createdAt: commerceCustomers.createdAt,
      updatedAt: commerceCustomers.updatedAt,
    }).from(commerceCustomers).where(eq(commerceCustomers.userId, userId)).orderBy(asc(commerceCustomers.createdAt)),
    db.select({
      id: commerceOrders.id,
      product: commerceProducts.slug,
      provider: commerceOrders.provider,
      providerCheckoutSessionId: commerceOrders.providerCheckoutSessionId,
      providerPaymentIntentId: commerceOrders.providerPaymentIntentId,
      status: commerceOrders.status,
      currency: commerceOrders.currency,
      amountTotal: commerceOrders.amountTotal,
      paidAt: commerceOrders.paidAt,
      refundedAt: commerceOrders.refundedAt,
      canceledAt: commerceOrders.canceledAt,
      createdAt: commerceOrders.createdAt,
      updatedAt: commerceOrders.updatedAt,
    }).from(commerceOrders)
      .innerJoin(commerceProducts, eq(commerceOrders.productId, commerceProducts.id))
      .where(eq(commerceOrders.userId, userId))
      .orderBy(asc(commerceOrders.createdAt)),
    db.select({
      id: commerceSubscriptions.id,
      product: commerceProducts.slug,
      provider: commerceSubscriptions.provider,
      providerSubscriptionId: commerceSubscriptions.providerSubscriptionId,
      providerProductId: commerceSubscriptions.providerProductId,
      store: commerceSubscriptions.store,
      environment: commerceSubscriptions.environment,
      status: commerceSubscriptions.status,
      currentPeriodEndsAt: commerceSubscriptions.currentPeriodEndsAt,
      willRenew: commerceSubscriptions.willRenew,
      originalTransactionId: commerceSubscriptions.originalTransactionId,
      providerEventAt: commerceSubscriptions.providerEventAt,
      createdAt: commerceSubscriptions.createdAt,
      updatedAt: commerceSubscriptions.updatedAt,
    }).from(commerceSubscriptions)
      .innerJoin(commerceProducts, eq(commerceSubscriptions.productId, commerceProducts.id))
      .where(eq(commerceSubscriptions.userId, userId))
      .orderBy(asc(commerceSubscriptions.createdAt)),
    db.select({
      id: commerceEntitlements.id,
      product: commerceProducts.slug,
      scopeType: commerceEntitlements.scopeType,
      scopeKey: commerceEntitlements.scopeKey,
      status: commerceEntitlements.status,
      sourceOrderId: commerceEntitlements.sourceOrderId,
      sourceSubscriptionId: commerceEntitlements.sourceSubscriptionId,
      grantedAt: commerceEntitlements.grantedAt,
      expiresAt: commerceEntitlements.expiresAt,
      revokedAt: commerceEntitlements.revokedAt,
      revocationReason: commerceEntitlements.revocationReason,
      createdAt: commerceEntitlements.createdAt,
      updatedAt: commerceEntitlements.updatedAt,
    }).from(commerceEntitlements)
      .innerJoin(commerceProducts, eq(commerceEntitlements.productId, commerceProducts.id))
      .where(eq(commerceEntitlements.userId, userId))
      .orderBy(asc(commerceEntitlements.createdAt)),
  ]);

  const owner = users[0];
  if (!owner) throw new AccountDataExportError(404);

  return {
    format: "citywalk-account-data",
    version: 1,
    generatedAt: new Date().toISOString(),
    scope: {
      portableAccountData: true,
      deviceOnlyDataIncluded: false,
      securitySecretsIncluded: false,
      note: "Device-only traveler state is not uploaded by this export. Password hashes, OAuth access/refresh/ID tokens, session tokens and internal security/audit records are excluded. Session metadata and provider identifiers may be included.",
    },
    account: {
      ...owner,
      createdAt: owner.createdAt.toISOString(),
      updatedAt: owner.updatedAt.toISOString(),
    },
    connectedAuthProviders: authMethods.map(row => ({
      provider: row.provider,
      providerAccountId: row.providerAccountId,
      scope: row.scope,
      accessTokenExpiresAt: iso(row.accessTokenExpiresAt),
      refreshTokenExpiresAt: iso(row.refreshTokenExpiresAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    sessions: sessions.map(row => ({
      sessionId: row.sessionId,
      expiresAt: row.expiresAt.toISOString(),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    travelerProfile: profiles[0] ? {
      preferredLocale: profiles[0].preferredLocale,
      createdAt: profiles[0].createdAt.toISOString(),
      updatedAt: profiles[0].updatedAt.toISOString(),
    } : null,
    guestLinks: guestLinks.map(row => ({
      visitorId: row.visitorId,
      sessionId: row.sessionId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    savedWalks: savedWalks.map(row => ({
      id: row.id,
      citySlug: row.citySlug,
      route: row.route,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    commerce: {
      customers: customers.map(row => ({
        provider: row.provider,
        providerCustomerId: row.providerCustomerId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      orders: orders.map(row => ({
        ...row,
        paidAt: iso(row.paidAt),
        refundedAt: iso(row.refundedAt),
        canceledAt: iso(row.canceledAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      subscriptions: subscriptions.map(row => ({
        ...row,
        currentPeriodEndsAt: iso(row.currentPeriodEndsAt),
        providerEventAt: iso(row.providerEventAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      entitlements: entitlements.map(row => ({
        ...row,
        grantedAt: row.grantedAt.toISOString(),
        expiresAt: iso(row.expiresAt),
        revokedAt: iso(row.revokedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    },
  } as const;
}
