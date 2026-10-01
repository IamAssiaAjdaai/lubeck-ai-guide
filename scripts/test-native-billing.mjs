// Disposable loopback-only migration/ledger gate. Does not load any env file.
import { spawnSync } from "node:child_process";
import { Client, Pool } from "pg";
import { verifyNativeBillingUpgrade } from "./native-billing-upgrade-fixture.mjs";
const base = new URL(process.env.CITYWALK_TEST_DATABASE_URL ?? "postgresql://citywalk:citywalk@127.0.0.1:5432/postgres");
if (base.hostname !== "127.0.0.1" || !["postgres:", "postgresql:"].includes(base.protocol)) throw new Error("Disposable loopback PostgreSQL required");
const name = `cw_billing_${Date.now()}`;
const admin = new Client({ connectionString: base.toString() });
let created = false;
try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${name}"`); created = true;
  const target = new URL(base); target.pathname = `/${name}`;
  const pool = new Pool({ connectionString: target.toString() });
  try { await verifyNativeBillingUpgrade(pool); }
  finally { await pool.end(); }
  const run = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/commerce/native/ledger.integration.test.ts", "src/lib/commerce/native/phase3b.integration.test.ts", "src/lib/commerce/webhook.integration.test.ts", "--maxWorkers=1"], { env: { ...process.env, DATABASE_URL: target.toString(), NATIVE_BILLING_DB_INTEGRATION: "1", COMMERCE_DB_INTEGRATION: "1" }, stdio: "inherit" });
  process.exitCode = run.status === 0 ? 0 : 1;
} catch (error) {
  console.error("Isolated native billing gate failed; no connection details logged.");
  console.error(JSON.stringify({ errorClass: error?.name, code: error?.code,
    location: error?.stack?.split("\n").find(line => line.includes("native-billing-upgrade-fixture.mjs:"))?.trim() }));
  process.exitCode = 1;
}
finally { if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end(); console.log("Disposable billing database cleaned up; no remote DB accessed."); }
