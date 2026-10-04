import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";

import { getDatabaseUrl } from "@/db/env";
import * as authSchema from "@/db/authSchema";
import * as citywalkSchema from "@/db/schema";
import * as commerceSchema from "@/db/commerceSchema";
import * as travelerSchema from "@/db/travelerSchema";
import * as rateLimitSchema from "@/db/rateLimitSchema";

export const databaseSchema = {
  ...citywalkSchema,
  ...authSchema,
  ...travelerSchema,
  ...commerceSchema,
  ...rateLimitSchema,
};

function createPoolDatabase(databasePool: Pool) {
  return drizzle(databasePool, { schema: databaseSchema });
}

export type Database = ReturnType<typeof createPoolDatabase>;

const requestDatabase = new AsyncLocalStorage<Database>();
let pool: Pool | undefined;

export function createRequestDatabase(client: Client): Database {
  return drizzle(client, { schema: databaseSchema }) as Database;
}

export function runWithRequestDatabase<T>(
  database: Database,
  callback: () => T,
): T {
  return requestDatabase.run(database, callback);
}

export function hasRequestDatabase(): boolean {
  return requestDatabase.getStore() !== undefined;
}

export function getDb(): Database {
  const scopedDatabase = requestDatabase.getStore();
  if (scopedDatabase) return scopedDatabase;

  if (process.env.CITYWALK_DATABASE_RUNTIME === "hyperdrive") {
    throw new Error(
      "Hyperdrive database access requires a request-scoped database client.",
    );
  }

  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return createPoolDatabase(pool);
}

export async function closeDb(): Promise<void> {
  const activePool = pool;
  pool = undefined;

  if (activePool) {
    await activePool.end();
  }
}
