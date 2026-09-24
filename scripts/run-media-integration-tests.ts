import { spawnSync } from "node:child_process";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "src/lib/media/media.integration.test.ts"],
  { env: { ...process.env, MEDIA_DB_INTEGRATION: "1" }, stdio: "inherit" },
);

if (result.error) {
  console.error(`Unable to start the media PostgreSQL integration test: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
