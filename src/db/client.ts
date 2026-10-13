import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";

import { getDatabaseUrl } from "@/db/env";
import * as authSchema from "@/db/authSchema";
import * as citywalkSchema from "@/db/schema";
import * as commerceSchema from "@/db/commerceSchema";
import * as travelerSchema from "@/db/travelerSchema";
import * as rateLimitSchema from "@/db/rateLimitSchema";
import * as marketingSchema from "@/db/marketingSchema";
import * as marketingGenerationSchema from "@/db/marketingGenerationSchema";

import * as brandContextSchema from "@/db/brandContextSchema";

import * as citywalkBrandContextSchema from "@/db/citywalkBrandContextSchema";

export const databaseSchema = {
  ...citywalkSchema,
  ...authSchema,
  ...travelerSchema,
  ...commerceSchema,
  ...rateLimitSchema,
  ...marketingSchema,
  ...marketingGenerationSchema,
  ...brandContextSchema,
  ...citywalkBrandContextSchema,
};

function createPoolDatabase(databasePool: Pool) {
  return drizzle(databasePool, { schema: databaseSchema });
}

export type Database = NodePgDatabase<typeof databaseSchema>;

const requestDatabase = new AsyncLocalStorage<Database>();
let pool: Pool | undefined;

export function createRequestDatabase(client: Client): Database {
  return drizzle(client, { schema: databaseSchema });
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
