import { Pool } from "pg";
import { verifyNativeBillingUpgrade } from "./native-billing-upgrade-fixture.mjs";
import { spawnSync } from "node:child_process";
import { loadDatabaseEnvironment } from "../src/db/loadEnvironment";
import { withDisposablePostgres } from "./lib/disposable-postgres";

loadDatabaseEnvironment();
const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("DATABASE_URL is required for isolated beta integration tests.");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error(`Beta integration command failed: ${args.join(" ")}`);
}

const groups = [
  { name: "savedwalk", flag: "SAVED_WALK_DB_INTEGRATION", files: ["src/lib/account/savedWalks.integration.test.ts"] },
  { name: "billing", flag: "NATIVE_BILLING_DB_INTEGRATION", files: ["src/lib/commerce/native/ledger.integration.test.ts", "src/lib/commerce/native/phase3b.integration.test.ts"] },
  { name: "commerce", command: "commerce:test:integration" },
  { name: "cms", command: "cms:test:integration" },
  { name: "media", command: "media:test:integration" },
  { name: "knowledge", command: "knowledge:test:integration" },
  { name: "content", command: "content:test:integration" },
  { name: "ratelimit", command: "rate-limit:test:integration" },
  { name: "brand", command: "brand-context:test:integration" },
  { name: "marketingmigration", empty: true, flag: "MARKETING_MIGRATION_INTEGRATION", files: ["src/db/marketingGenerationMigration.integration.test.ts"] },
  { name: "brandmigration", empty: true, flag: "BRAND_CONTEXT_MIGRATION_INTEGRATION", files: ["src/db/brandContextMigration.integration.test.ts"] },
] as const;

async function main() {
  const failed: string[] = [];
  for (const group of groups) {
    try {
      await withDisposablePostgres(baseUrl!, `cw_${group.name}`, async databaseUrl => {
        console.log(`Isolated beta integration group: ${group.name}`);
        const env: NodeJS.ProcessEnv = {
          ...process.env, DATABASE_URL: databaseUrl,
          CITYWALK_DATABASE_RUNTIME: "node", CITYWALK_RUNTIME_ENV: "test",
          BETTER_AUTH_SECRET: "citywalk-beta-integration-synthetic-secret-at-least-32-characters",
          BETTER_AUTH_URL: "https://preview.example.test",
        };
        if (group.name === "billing") {
          const pool = new Pool({ connectionString: databaseUrl });
          try { await verifyNativeBillingUpgrade(pool); } finally { await pool.end(); }
        }
        if (!("empty" in group)) {
          run(npm, ["run", "db:migrate"], env);
          // Explicit fixtures in a newly created database only; no existing data touched.
          run(npm, ["run", "cms:import-lubeck"], env);
          run(npm, ["run", "db:verify"], env);
        }
        if ("command" in group) run(npm, ["run", group.command], env);
        else run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", ...group.files, "--maxWorkers=1"], { ...env, [group.flag]: "1" });
      });
      console.log(`PASS beta integration group: ${group.name}`);
    } catch {
      failed.push(group.name);
      console.error(`FAIL beta integration group: ${group.name} (see preceding output)`);
    }
  }
  if (failed.length) throw new Error(`Failed beta integration groups: ${failed.join(", ")}`);
}

void main().catch(error => { console.error(error.message); process.exitCode = 1; });
