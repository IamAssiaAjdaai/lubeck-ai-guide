import { writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { configuration } from "./config";
import { createSaasAuth } from "./auth";
const config = configuration();
if (!new URL(config.databaseUrl).pathname.endsWith("_schema"))
  throw new Error("EMPTY_SCHEMA_REVIEW_DATABASE_REQUIRED");
const pool = new Pool({ connectionString: config.databaseUrl });
try {
  const plan = await getMigrations(createSaasAuth(pool, config).options);
  if (plan.toBeCreated.length !== 5 || plan.toBeAdded.length)
    throw new Error("EXPECTED_EMPTY_AUTH_SCHEMA");
  await writeFile(
    new URL("../migrations/0000_auth.sql", import.meta.url),
    "-- Generated from installed Better Auth 1.7.7; isolated SaaS database only.\n" +
      (await plan.compileMigrations()),
  );
  console.log("MARKETING_AUTH_SQL_GENERATED");
} finally {
  await pool.end();
}
