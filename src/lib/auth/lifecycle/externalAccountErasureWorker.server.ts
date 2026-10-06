import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { externalAccountErasureJobs } from "@/db/authSchema";
import { getDb } from "@/db/client";
import {
  findExternalAccountEraser,
  type ExternalAccountEraser,
} from "./externalAccountErasure";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_ERROR_LENGTH = 500;

export type ExternalAccountErasureWorkerResult = Readonly<{
  claimed: number;
  completed: number;
  failed: number;
  lostLeases: number;
}>;

type ClaimedErasureJob = Readonly<{
  id: number;
  provider: string;
  externalCustomerId: string;
  attempts: number;
  leaseExpiresAt: Date;
}>;

export function externalAccountErasureRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(attempt - 1, 6));
  return Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** exponent);
}

function normalizedError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

async function claimNextJob(input: Readonly<{
  now: Date;
  leaseMs: number;
}>): Promise<ClaimedErasureJob | undefined> {
  const leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs);
  const result = await getDb().execute(sql`
    WITH candidate AS (
      SELECT id
      FROM external_account_erasure_jobs
      WHERE completed_at IS NULL
        AND next_attempt_at <= ${input.now}
        AND (lease_expires_at IS NULL OR lease_expires_at <= ${input.now})
      ORDER BY next_attempt_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE external_account_erasure_jobs AS jobs
    SET lease_expires_at = ${leaseExpiresAt},
        updated_at = ${input.now}
    FROM candidate
    WHERE jobs.id = candidate.id
    RETURNING jobs.id,
              jobs.provider,
              jobs.external_customer_id,
              jobs.attempts,
              jobs.lease_expires_at
  `);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id: Number(row.id),
    provider: String(row.provider),
    externalCustomerId: String(row.external_customer_id),
    attempts: Number(row.attempts),
    leaseExpiresAt: row.lease_expires_at instanceof Date
      ? row.lease_expires_at
      : new Date(String(row.lease_expires_at)),
  };
}

export async function processExternalAccountErasureJobs(input: Readonly<{
  erasers: readonly ExternalAccountEraser[];
  batchSize?: number;
  leaseMs?: number;
  now?: () => Date;
}>): Promise<ExternalAccountErasureWorkerResult> {
  const batchSize = Math.max(1, Math.min(input.batchSize ?? DEFAULT_BATCH_SIZE, 100));
  const leaseMs = Math.max(1_000, input.leaseMs ?? DEFAULT_LEASE_MS);
  const now = input.now ?? (() => new Date());
  const db = getDb();
  let claimed = 0;
  let completed = 0;
  let failed = 0;
  let lostLeases = 0;

  for (let index = 0; index < batchSize; index += 1) {
    const job = await claimNextJob({ now: now(), leaseMs });
    if (!job) break;
    claimed += 1;

    try {
      const eraser = findExternalAccountEraser(input.erasers, job.provider);
      await eraser.erase({ userId: job.externalCustomerId });
      const completedAt = now();
      const rows = await db
        .update(externalAccountErasureJobs)
        .set({
          completedAt,
          leaseExpiresAt: null,
          lastError: null,
          updatedAt: completedAt,
        })
        .where(and(
          eq(externalAccountErasureJobs.id, job.id),
          eq(externalAccountErasureJobs.leaseExpiresAt, job.leaseExpiresAt),
          isNull(externalAccountErasureJobs.completedAt),
        ))
        .returning({ id: externalAccountErasureJobs.id });
      if (rows.length) completed += 1;
      else lostLeases += 1;
    } catch (error) {
      const failedAt = now();
      const attempts = job.attempts + 1;
      const rows = await db
        .update(externalAccountErasureJobs)
        .set({
          attempts,
          nextAttemptAt: new Date(
            failedAt.getTime() + externalAccountErasureRetryDelayMs(attempts),
          ),
          leaseExpiresAt: null,
          lastError: normalizedError(error),
          updatedAt: failedAt,
        })
        .where(and(
          eq(externalAccountErasureJobs.id, job.id),
          eq(externalAccountErasureJobs.leaseExpiresAt, job.leaseExpiresAt),
          isNull(externalAccountErasureJobs.completedAt),
        ))
        .returning({ id: externalAccountErasureJobs.id });
      if (rows.length) failed += 1;
      else lostLeases += 1;
    }
  }

  return { claimed, completed, failed, lostLeases };
}
