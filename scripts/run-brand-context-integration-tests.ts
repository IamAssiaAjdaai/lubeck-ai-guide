import { spawnSync } from "node:child_process";
import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Brand acceptance refuses non-local PostgreSQL; use a disposable test database");
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/marketing/brandContext/persistence.integration.test.ts", "--no-file-parallelism"], { env: { ...process.env, BRAND_CONTEXT_DB_INTEGRATION: "1" }, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
