import "server-only";
import { and, eq, gt, getTableColumns, is, or, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { user, account, session, verification, staffMemberships } from "@/db/authSchema";
import * as editorial from "@/db/schema";
import { commerceCustomers, commerceOrders, commerceEntitlements } from "@/db/commerceSchema";
import { LifecycleError } from "./rateLimit.server";

// Editorial actor references are plain text, not FKs. Cover former staff too.
// Identifiers are from the committed schema only, never request data.
const retainedTables = (Object.values(editorial) as unknown[]).filter((value): value is PgTable => is(value, PgTable))
  .map(table => ({ table, columns: Object.entries(getTableColumns(table)).filter(([name]) => /(?:ByUserId|actorUserId)$/.test(name)).map(([, column]) => column) }))
  .filter(entry => entry.columns.length);

export async function deleteTravelerAccount(input: {
  userId: string; sessionId: string; password: string;
  verify: (input: { hash: string; password: string }) => Promise<boolean>;
}) {
  await getDb().transaction(async tx => {
    await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
    // Plain-text audit references cannot take FK locks. Hold a short, read-compatible
    // table lock during the eligibility check/delete to prevent an audit-write race.
    for (const { table } of retainedTables) await tx.execute(sql`LOCK TABLE ${table} IN SHARE MODE`);
    const [owner] = await tx.select().from(user).where(eq(user.id, input.userId)).for("update");
    const [active] = await tx.select({ id: session.id }).from(session).where(and(eq(session.id, input.sessionId), eq(session.userId, input.userId), gt(session.expiresAt, new Date()))).for("update");
    if (!owner || !active) throw new LifecycleError("REAUTH_REQUIRED", 401);
    const [credential] = await tx.select().from(account).where(and(eq(account.userId, input.userId), eq(account.providerId, "credential"))).for("update");
    if (!credential?.password || !await input.verify({ hash: credential.password, password: input.password })) throw new LifecycleError("REAUTH_REQUIRED", 401);
    // Existing FKs serialize inserts behind the parent user lock. Never apply the
    // commerce CASCADE/SET NULL rules without an approved financial retention policy.
    for (const table of [commerceCustomers, commerceOrders, commerceEntitlements]) {
      if ((await tx.select({ id: table.id }).from(table).where(eq(table.userId, input.userId)).limit(1)).length) throw new LifecycleError("RETENTION_REVIEW_REQUIRED", 409);
    }
    if ((await tx.select({ id: staffMemberships.id }).from(staffMemberships).where(or(eq(staffMemberships.userId, input.userId), eq(staffMemberships.createdByUserId, input.userId))).limit(1)).length) throw new LifecycleError("RETENTION_REVIEW_REQUIRED", 409);
    for (const { table, columns } of retainedTables) {
      if ((await tx.select({ found: sql`1` }).from(table).where(or(...columns.map(column => eq(column, input.userId)))).limit(1)).length) throw new LifecycleError("RETENTION_REVIEW_REQUIRED", 409);
    }
    // The enabled lifecycle creates only reset-password verification rows. Other
    // verification plugins are disabled. These rows have no user FK.
    await tx.delete(verification).where(and(eq(verification.value, input.userId), sql`${verification.identifier} LIKE 'reset-password:%'`));
    // Existing FKs cascade credential accounts, sessions, account_saved_walks,
    // traveler_profiles and traveler_guest_links atomically with this user delete.
    await tx.delete(user).where(eq(user.id, input.userId));
  });
}
