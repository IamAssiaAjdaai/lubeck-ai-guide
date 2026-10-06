import { spawnSync } from "node:child_process";

import { Client } from "pg";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

const baseDatabaseUrl = process.env.DATABASE_URL;
if (!baseDatabaseUrl) {
  throw new Error("DATABASE_URL is required for lifecycle integration tests.");
}

const baseUrl = new URL(baseDatabaseUrl);
if (!["127.0.0.1", "localhost", "::1"].includes(baseUrl.hostname)) {
  throw new Error("Lifecycle integration tests require a loopback PostgreSQL server.");
}

const databaseName = `cw_lifecycle_${Date.now()}${process.pid}`;
const lifecycleUrl = new URL(baseUrl);
lifecycleUrl.hostname = "127.0.0.1";
lifecycleUrl.pathname = `/${databaseName}`;

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status ?? "unknown"}.`);
  }
}

async function main(): Promise<void> {
  const admin = new Client({ connectionString: baseUrl.toString() });
  await admin.connect();

  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const env = {
      ...process.env,
      DATABASE_URL: lifecycleUrl.toString(),
      LIFECYCLE_DB_INTEGRATION: "1",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET
        ?? "citywalk-lifecycle-integration-secret-at-least-32-characters",
    };

    run(npmCommand, ["run", "db:migrate"], env);
    run(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "src/lib/auth/lifecycle/lifecycle.integration.test.ts",
        "src/lib/auth/lifecycle/externalAccountErasureWorker.integration.test.ts",
      ],
      env,
    );
  } finally {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [databaseName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  }
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Account lifecycle integration test failed.",
  );
  process.exitCode = 1;
});
