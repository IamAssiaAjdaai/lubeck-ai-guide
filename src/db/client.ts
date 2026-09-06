import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseUrl } from "@/db/env";
import * as authSchema from "@/db/authSchema";
import * as citywalkSchema from "@/db/schema";

export const databaseSchema = {
  ...citywalkSchema,
  ...authSchema,
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
