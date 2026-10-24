import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { configuration } from "./config";
const config = configuration();
const pool = new Pool({ connectionString: config.databaseUrl });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(745012321)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS mkt_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of [
    "0000_auth.sql",
    "0001_saas.sql",
    "0002_packs.sql",
    "0003_reservation_metadata.sql",
    ...(config.creative
      ? ["0004_creative.sql", "0005_creative_privacy.sql"]
      : []),
    ...(config.workspace ? ["0006_workspace.sql"] : []),
  ]) {
    const sql = await readFile(
      new URL("../migrations/" + name, import.meta.url),
      "utf8",
    );
    const digest = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query(
      "SELECT sha256 FROM mkt_migrations WHERE name=$1",
      [name],
    );
    if (previous.rows[0]) {
      if (previous.rows[0].sha256 !== digest)
        throw new Error("MIGRATION_CHECKSUM_MISMATCH");
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO mkt_migrations(name,sha256) VALUES($1,$2)",
      [name, digest],
    );
  }
  await client.query("COMMIT");
  console.log("MARKETING_SAAS_MIGRATIONS_OK");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
