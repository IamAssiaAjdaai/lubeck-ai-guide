// Disposable loopback database only. No environment files or real emails loaded.
import { spawnSync } from "node:child_process";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const base = new URL(process.env.CITYWALK_TEST_DATABASE_URL ?? "postgresql://citywalk:citywalk@127.0.0.1:5432/postgres");
if (base.hostname !== "127.0.0.1" || !["postgres:", "postgresql:"].includes(base.protocol)) throw new Error("Disposable loopback PostgreSQL required.");
const name = `cw_lifecycle_${Date.now()}`;
const admin = new Client({ connectionString: base.toString() }); let created = false;
try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${name}"`); created = true;
  const target = new URL(base); target.pathname = `/${name}`;
  const pool = new Pool({ connectionString: target.toString() });
  try { await migrate(drizzle(pool), { migrationsFolder: "drizzle" }); } finally { await pool.end(); }
  const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/auth/lifecycle/lifecycle.integration.test.ts", "--maxWorkers=1"], {
    env: { ...process.env, DATABASE_URL: target.toString(), LIFECYCLE_DB_INTEGRATION: "1" }, stdio: "inherit",
  });
  process.exitCode = result.status === 0 ? 0 : 1;
} catch { console.error("Isolated lifecycle gate failed; no connection details logged."); process.exitCode = 1; }
finally {
  if (created) { await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); console.log("Disposable lifecycle database removed; existing databases untouched."); }
  await admin.end();
}
