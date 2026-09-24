import { spawnSync } from "node:child_process";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "src/lib/commerce/webhook.integration.test.ts",
  ],
  {
    env: { ...process.env, COMMERCE_DB_INTEGRATION: "1" },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(
    `Unable to start the commerce PostgreSQL integration test: ${result.error.message}`,
  );
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
