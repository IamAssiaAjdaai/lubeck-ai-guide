import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();
process.env.BETTER_AUTH_SECRET ??= "citywalk-rate-limit-integration-secret";

async function main(): Promise<void> {
  const [
    { closeDb, getDb },
    { rateLimitEventsTable },
    { consumeDatabaseRateLimit },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/db/rateLimitSchema"),
    import("@/lib/databaseRateLimit.server"),
  ]);

  const db = getDb();
  const runId = randomUUID();
  const sequentialScope = `integration-rate-limit-sequential-${runId}`;
  const concurrentScope = `integration-rate-limit-concurrent-${runId}`;
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

    console.log(
      "Verified PostgreSQL rate limits: sliding windows, keyed identifiers, and concurrent atomicity passed.",
    );
  } finally {
    await db
      .delete(rateLimitEventsTable)
      .where(eq(rateLimitEventsTable.scope, sequentialScope));
    await db
      .delete(rateLimitEventsTable)
      .where(eq(rateLimitEventsTable.scope, concurrentScope));
    await closeDb();
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
