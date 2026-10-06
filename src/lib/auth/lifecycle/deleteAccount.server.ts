import "server-only";
import { and, eq, getTableColumns, gt, inArray, is, like, or, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { user, account, session, verification, staffMemberships, externalAccountErasureJobs } from "@/db/authSchema";
import * as editorial from "@/db/schema";
import { sealAppleRevocationToken } from "./appleTokenRevocation.server";
import { hasFreshSocialDeleteSession } from "./deleteReauth";
import { LifecycleError } from "./rateLimit.server";

export const WEB_DELETE_VERIFICATION_PREFIX = "account-delete-web:";

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Editorial actor references are plain text, not FKs. Cover former staff too.
// Identifiers are from the committed schema only, never request data.
const retainedTables = (Object.values(editorial) as unknown[]).filter((value): value is PgTable => is(value, PgTable))
  .map(table => ({ table, columns: Object.entries(getTableColumns(table)).filter(([name]) => /(?:ByUserId|actorUserId)$/.test(name)).map(([, column]) => column) }))
  .filter(entry => entry.columns.length);

async function lockDeletionScope(tx: Transaction, userId: string) {
  // Plain-text audit references cannot take FK locks. Hold a short, read-compatible
  // table lock during the eligibility check/delete to prevent an audit-write race.
  for (const { table } of retainedTables) await tx.execute(sql`LOCK TABLE ${table} IN SHARE MODE`);
  const [owner] = await tx.select().from(user).where(eq(user.id, userId)).for("update");
  return owner;
}

async function assertRetentionEligible(tx: Transaction, userId: string) {
  if ((await tx.select({ id: staffMemberships.id }).from(staffMemberships).where(or(eq(staffMemberships.userId, userId), eq(staffMemberships.createdByUserId, userId))).limit(1)).length) throw new LifecycleError("RETENTION_REVIEW_REQUIRED", 409);
  for (const { table, columns } of retainedTables) {
    if ((await tx.select({ found: sql`1` }).from(table).where(or(...columns.map(column => eq(column, userId)))).limit(1)).length) throw new LifecycleError("RETENTION_REVIEW_REQUIRED", 409);
  }
}

async function hardDeleteTravelerAccount(tx: Transaction, userId: string) {
  // Capture an Apple refresh/access token before the Better Auth account row cascades.
  // The outbox stores only an authenticated-encryption envelope, never the raw token.
  const [apple] = await tx.select({
    refreshToken: account.refreshToken,
    accessToken: account.accessToken,
  }).from(account).where(and(eq(account.userId, userId), eq(account.providerId, "apple"))).limit(1).for("update");
  const appleToken = apple?.refreshToken || apple?.accessToken;
  if (appleToken) {
    const tokenTypeHint = apple.refreshToken ? "refresh_token" as const : "access_token" as const;
    await tx.insert(externalAccountErasureJobs).values({
      provider: "apple",
      externalCustomerId: sealAppleRevocationToken({ token: appleToken, tokenTypeHint }),
    }).onConflictDoNothing();
  }

  // RevenueCat identifies authenticated customers by the immutable Better Auth user id.
  // Persist the remote-erasure intent in the same transaction as the hard delete so a
  // later worker can retry without keeping the user row or making network calls here.
  await tx.insert(externalAccountErasureJobs).values({
    provider: "revenuecat",
    externalCustomerId: userId,
  }).onConflictDoNothing();

  // Lifecycle verification rows have no user FK. Remove only account-owned lifecycle
  // records; unrelated verification plugins stay outside this deletion contract.
  await tx.delete(verification).where(and(
    eq(verification.value, userId),
    or(
      like(verification.identifier, "reset-password:%"),
      like(verification.identifier, `${WEB_DELETE_VERIFICATION_PREFIX}%`),
    ),
  ));

  // Commerce retention is encoded in the committed FKs: customer mappings and
  // entitlements cascade away, while orders/subscriptions survive with user_id NULL.
  // Auth/traveler-owned rows cascade atomically with this user delete.
  await tx.delete(user).where(eq(user.id, userId));
}

export async function deleteTravelerAccount(input: {
  userId: string; sessionId: string; password?: string;
  verify: (input: { hash: string; password: string }) => Promise<boolean>;
}) {
  await getDb().transaction(async tx => {
    await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
    const owner = await lockDeletionScope(tx, input.userId);
    const [active] = await tx.select({ id: session.id, createdAt: session.createdAt }).from(session).where(and(eq(session.id, input.sessionId), eq(session.userId, input.userId), gt(session.expiresAt, new Date()))).for("update");
    if (!owner || !active) throw new LifecycleError("REAUTH_REQUIRED", 401);

    const [credential] = await tx.select().from(account).where(and(eq(account.userId, input.userId), eq(account.providerId, "credential"))).for("update");
    if (credential) {
      if (!credential.password || !input.password || !await input.verify({ hash: credential.password, password: input.password })) throw new LifecycleError("REAUTH_REQUIRED", 401);
    } else {
      const [social] = await tx.select({ id: account.id }).from(account).where(and(eq(account.userId, input.userId), inArray(account.providerId, ["google", "apple"]))).limit(1).for("update");
      if (!hasFreshSocialDeleteSession({ sessionCreatedAt: active.createdAt, hasSocialProvider: Boolean(social) })) throw new LifecycleError("REAUTH_REQUIRED", 401);
    }

    await assertRetentionEligible(tx, input.userId);
    await hardDeleteTravelerAccount(tx, input.userId);
  });
}

/**
 * Complete an externally requested deletion only after a one-time email token has
 * been verified. The token lookup and hard delete share one transaction, so the
 * same token cannot be consumed twice and a retention failure does not consume it.
 */
export async function deleteTravelerAccountByWebVerification(verificationIdentifier: string) {
  await getDb().transaction(async tx => {
    await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
    const [proof] = await tx.select({ id: verification.id, userId: verification.value })
      .from(verification)
      .where(and(
        eq(verification.identifier, verificationIdentifier),
        gt(verification.expiresAt, new Date()),
      ))
      .for("update");
    if (!proof) throw new LifecycleError("INVALID_REQUEST", 400);

    const owner = await lockDeletionScope(tx, proof.userId);
    if (!owner) throw new LifecycleError("INVALID_REQUEST", 400);
    await assertRetentionEligible(tx, proof.userId);
    await hardDeleteTravelerAccount(tx, proof.userId);
  });
}
