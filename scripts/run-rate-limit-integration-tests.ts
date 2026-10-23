import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

import { eq } from "drizzle-orm";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();
if (!process.env.BETTER_AUTH_SECRET?.trim()) {
  process.env.BETTER_AUTH_SECRET = "citywalk-rate-limit-integration-secret";
}

async function main(): Promise<void> {
  const [
    { closeDb, getDb },
    { rateLimitEventsTable },
    { consumeDatabaseRateLimit, DatabaseRateLimitUnavailableError },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/db/rateLimitSchema"),
    import("@/lib/databaseRateLimit.server"),
  ]);

  const db = getDb();
  const runId = randomUUID();
  const sequentialScope = `integration-rate-limit-sequential-${runId}`;
  const concurrentScope = `integration-rate-limit-concurrent-${runId}`;
  const rollingScope = `integration-rate-limit-rolling-${runId}`;
  const isolatedScope = `integration-rate-limit-isolated-${runId}`;
  const testScopes = [sequentialScope, concurrentScope, rollingScope, isolatedScope];
  const identity = "private@example.test";

  try {
    const sequential = [];
    for (let index = 0; index < 3; index += 1) {
      sequential.push(
        await consumeDatabaseRateLimit({
          scope: sequentialScope,
          identifier: identity,
          maxRequests: 2,
          windowMs: 15 * 60 * 1_000,
        }),
      );
    }

    if (
      sequential[0]?.success !== true ||
      sequential[0]?.remaining !== 1 ||
      sequential[1]?.success !== true ||
      sequential[1]?.remaining !== 0 ||
      sequential[2]?.success !== false
    ) {
      throw new Error("Sequential PostgreSQL rate-limit behavior is incorrect.");
    }

    const stored = await db
      .select({ identifierHash: rateLimitEventsTable.identifierHash })
      .from(rateLimitEventsTable)
      .where(eq(rateLimitEventsTable.scope, sequentialScope));

    if (stored.length !== 2) {
      throw new Error("Rejected requests must not add extra rate-limit events.");
    }
    if (
      stored.some(
        ({ identifierHash }) =>
          identifierHash.includes(identity) ||
          !/^[a-f0-9]{64}$/.test(identifierHash),
      )
    ) {
      throw new Error("Rate-limit identifiers must be stored only as keyed digests.");
    }

    const concurrent = await Promise.all(
      Array.from({ length: 5 }, () =>
        consumeDatabaseRateLimit({
          scope: concurrentScope,
          identifier: identity,
          maxRequests: 2,
          windowMs: 15 * 60 * 1_000,
        }),
      ),
    );
    if (concurrent.filter(({ success }) => success).length !== 2) {
      throw new Error("Concurrent PostgreSQL rate limiting is not atomic.");
    }

    // Keep one recent event while aging out the other. A rolling window must
    // release exactly one slot, without resetting the entire allowance.
    const windowMs = 24 * 60 * 60 * 1_000;
    const rollingInput = {
      scope: rollingScope,
      identifier: "all-visitors",
      maxRequests: 2,
      windowMs,
    };
    await consumeDatabaseRateLimit(rollingInput);
    const recent = new Date();
    await db.update(rateLimitEventsTable)
      .set({ createdAt: recent })
      .where(eq(rateLimitEventsTable.scope, rollingScope));
    const [event] = await db.select({ identifierHash: rateLimitEventsTable.identifierHash })
      .from(rateLimitEventsTable)
      .where(eq(rateLimitEventsTable.scope, rollingScope));
    assert.ok(event);
    await db.insert(rateLimitEventsTable).values({
      scope: rollingScope,
      identifierHash: event.identifierHash,
      createdAt: new Date(recent.getTime() - windowMs - 60_000),
    });
    const contenders = await Promise.all(Array.from({ length: 5 }, () =>
      consumeDatabaseRateLimit(rollingInput),
    ));
    assert.equal(contenders.filter(({ success }) => success).length, 1,
      "Only one concurrent caller may reserve the last rolling-window slot");
    for (const result of contenders) {
      assert.equal(result.remaining, 0);
      assert.equal(result.reset, recent.getTime() + windowMs);
    }
    const isolated = await consumeDatabaseRateLimit({ ...rollingInput, scope: isolatedScope });
    assert.equal(isolated.success, true, "An exhausted scope must not consume another scope");
    assert.equal(isolated.remaining, 1);

    // Missing signing material must reject rather than silently admit a call.
    const originalSecret = process.env.BETTER_AUTH_SECRET;
    try {
      delete process.env.BETTER_AUTH_SECRET;
      await assert.rejects(() => consumeDatabaseRateLimit(rollingInput),
        DatabaseRateLimitUnavailableError);
    } finally {
      process.env.BETTER_AUTH_SECRET = originalSecret;
    }
    const rollingEvents = await db.select().from(rateLimitEventsTable)
      .where(eq(rateLimitEventsTable.scope, rollingScope));
    assert.equal(rollingEvents.length, 3,
      "Expired events remain within retention; denied calls must not insert events");

    console.log(
      "Verified PostgreSQL rate limits: rolling expiry, last-slot concurrency, scope isolation, keyed identifiers, and fail-closed missing secret passed.",
    );
  } finally {
    try {
      for (const scope of testScopes) {
        await db.delete(rateLimitEventsTable).where(eq(rateLimitEventsTable.scope, scope));
      }
    } finally {
      await closeDb();
    }
  }
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "PostgreSQL rate-limit integration test failed.",
  );
  process.exitCode = 1;
});
