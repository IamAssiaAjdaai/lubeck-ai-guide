import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

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

let pool: Pool | undefined;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return drizzle(pool, { schema: databaseSchema });
}

export async function closeDb(): Promise<void> {
  const activePool = pool;
  pool = undefined;

  if (activePool) {
    await activePool.end();
  }
}
