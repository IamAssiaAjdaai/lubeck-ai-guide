import { spawnSync } from "node:child_process";

import { withDisposablePostgres } from "./lib/disposable-postgres";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

const baseDatabaseUrl = process.env.DATABASE_URL;
if (!baseDatabaseUrl) {
  throw new Error("DATABASE_URL is required for lifecycle integration tests.");
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status ?? "unknown"}.`);
  }
}

async function main(): Promise<void> {
  await withDisposablePostgres(baseDatabaseUrl!, "cw_lifecycle", async databaseUrl => {
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      LIFECYCLE_DB_INTEGRATION: "1",
      BETTER_AUTH_SECRET: "citywalk-lifecycle-integration-secret-at-least-32-characters",
    };

    run(npmCommand, ["run", "db:migrate"], env);
    run(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--config",
        "vitest.lifecycle.config.ts",
      ],
      env,
    );
  });
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Account lifecycle integration test failed.",
  );
  process.exitCode = 1;
});
