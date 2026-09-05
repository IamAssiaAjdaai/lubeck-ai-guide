import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseUrl } from "@/db/env";
import * as schema from "@/db/schema";

let pool: Pool | undefined;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return drizzle(pool, { schema });
}

export async function closeDb(): Promise<void> {
  const activePool = pool;
  pool = undefined;

  if (activePool) {
    await activePool.end();
  }
}
