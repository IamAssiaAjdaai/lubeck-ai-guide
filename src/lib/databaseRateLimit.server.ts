import "server-only";

import { createHmac } from "node:crypto";

import { and, asc, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { rateLimitEventsTable } from "@/db/rateLimitSchema";

export type DatabaseRateLimitResult = Readonly<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}>;

export class DatabaseRateLimitUnavailableError extends Error {
  constructor() {
    super("RATE_LIMIT_UNAVAILABLE");
  }
}

const RETENTION_MS = 48 * 60 * 60 * 1_000;

export async function consumeDatabaseRateLimit(
  input: Readonly<{
    scope: string;
    identifier: string;
    maxRequests: number;
    windowMs: number;
  }>,
): Promise<DatabaseRateLimitResult> {
  if (
    !input.scope.trim() ||
    !input.identifier ||
    !Number.isSafeInteger(input.maxRequests) ||
    input.maxRequests <= 0 ||
    !Number.isSafeInteger(input.windowMs) ||
    input.windowMs <= 0
  ) {
    throw new Error("INVALID_RATE_LIMIT");
  }

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new DatabaseRateLimitUnavailableError();
  }

  const identifierHash = createHmac("sha256", secret)
    .update(`${input.scope}\0${input.identifier}`)
    .digest("hex");
  const lockKey = `${input.scope}:${identifierHash}`;
  const now = new Date();
  const cutoff = new Date(now.getTime() - input.windowMs);
  const retentionCutoff = new Date(now.getTime() - RETENTION_MS);

  try {
    return await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0::bigint))`,
      );

      await tx
        .delete(rateLimitEventsTable)
        .where(lt(rateLimitEventsTable.createdAt, retentionCutoff));

      const active = await tx
        .select({ createdAt: rateLimitEventsTable.createdAt })
        .from(rateLimitEventsTable)
        .where(
          and(
            eq(rateLimitEventsTable.scope, input.scope),
            eq(rateLimitEventsTable.identifierHash, identifierHash),
            gte(rateLimitEventsTable.createdAt, cutoff),
          ),
        )
        .orderBy(asc(rateLimitEventsTable.createdAt))
        .limit(input.maxRequests);

      const oldest = active[0]?.createdAt ?? now;
      const reset = oldest.getTime() + input.windowMs;

      if (active.length >= input.maxRequests) {
        return {
          success: false,
          limit: input.maxRequests,
          remaining: 0,
          reset,
        };
      }

      await tx.insert(rateLimitEventsTable).values({
        scope: input.scope,
        identifierHash,
        createdAt: now,
      });

      return {
        success: true,
        limit: input.maxRequests,
        remaining: Math.max(0, input.maxRequests - active.length - 1),
        reset,
      };
    });
  } catch (error) {
    if (error instanceof DatabaseRateLimitUnavailableError) throw error;
    throw new DatabaseRateLimitUnavailableError();
  }
}
