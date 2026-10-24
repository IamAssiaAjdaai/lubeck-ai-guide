// Reuses the canonical services and acceptance journeys. No provider credentials or deployments.
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export function isolatedDatabaseUrl(value) {
  if (!value) throw Error("ISOLATED_MARKETING_CI_DATABASE_REQUIRED");
  const url = new URL(value);
  if (!/^postgres(?:ql)?:$/.test(url.protocol) || url.hostname !== "127.0.0.1" || !/^marketing_[a-z0-9_]+$/.test(url.pathname.slice(1)) || !url.port || Number(url.port) < 1024 || url.port === "5432") throw Error("ISOLATED_MARKETING_CI_DATABASE_REQUIRED");
  return value;
}
export function offlineEnvironment(input, privateDirectory) {
  const env = { ...input };
  for (const key of Object.keys(env)) if (/API_KEY|OPENAI|BYTEPLUS|SEEDANCE/.test(key)) delete env[key];
  const database = isolatedDatabaseUrl(env.MARKETING_DATABASE_URL);
  const origin = env.MARKETING_ORIGIN ?? "http://127.0.0.1:3208";
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw Error("LOCAL_ORIGIN_REQUIRED");
  return { ...env, MARKETING_DATABASE_URL: database, MARKETING_TEST_DATABASE_URL: database, MARKETING_CREATIVE_TEST_DATABASE_URL: database,
    MARKETING_ORIGIN: origin, MARKETING_BROWSER_ORIGIN: origin, MARKETING_API_PORT: env.MARKETING_API_PORT ?? "3209",
    MARKETING_AUTH_SECRET: randomBytes(48).toString("hex"), MARKETING_MAIL_DIRECTORY: join(privateDirectory, "mail"),
    MARKETING_QA_PRIVATE_DIRECTORY: privateDirectory, MARKETING_QA_STORAGE_STATE: join(privateDirectory, "auth.json"),
    MARKETING_CREATIVE_OBSERVATIONS_PATH: join(privateDirectory, "observations.json"),
    MARKETING_DEMO_MODE: "true", MARKETING_WORKSPACE_UX_ENABLED: "true", MARKETING_CREATIVE_QA_ENABLED: "true",
    MARKETING_LOCAL_REGISTRATION_ENABLED: "false", MARKETING_AI_ENABLED: "false", MARKETING_REAL_IMAGE_TRANSPORT_ENABLED: "false",
    MARKETING_REAL_IMAGE_SPEND_APPROVED: "false", MARKETING_REAL_IMAGE_PRICE_BOUND_VERIFIED: "false", MARKETING_REAL_IMAGE_AUTHORIZED_UNTIL: "",
    // Explicitly allowed local mocks; real-provider gates above remain independently closed.
    MARKETING_CREATIVE_KILL_SWITCH: "false" };
}
export const databaseTests = [
  "src/intake/pdf.integration.test.ts", "src/auth.integration.test.ts", "src/packs.integration.test.ts", "src/workspace.integration.test.ts", "src/consolidation.integration.test.ts",
  "qa/service.integration.test.ts", "src/creative/creative.test.ts", "qa-creative-acceptance/acceptance.integration.test.ts",
  "qa-creative-hardening/hardening.integration.test.ts", "qa-creative-provider/provider.integration.test.ts", "qa-creative-transport/transport.integration.test.ts",
].map(path => "apps/marketing-saas-api/" + path);
async function main() {
  const privateDirectory = process.env.MARKETING_CI_PRIVATE_DIRECTORY ?? await mkdtemp(join(tmpdir(), "marketing-ci-"));
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 }); await chmod(privateDirectory, 0o700);
  const evidence = resolve(process.env.MARKETING_CI_EVIDENCE_ROOT ?? join(privateDirectory, "evidence"));
  await mkdir(evidence, { recursive: true });
  const env = offlineEnvironment(process.env, privateDirectory);
  const summary = { status: "RUNNING", provider: "mock-only", liveRequests: 0, billing: "disabled", stages: [], unit: null, database: null };
  const guard = resolve(root, "scripts/marketing-creative-offline-guard.mjs");
  let server;
  function run(args, extra = {}) {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(process.execPath, ["--import", guard, ...args], { cwd: root, env: { ...env, ...extra }, stdio: "inherit" });
      child.once("error", reject); child.once("exit", code => code === 0 ? resolvePromise() : reject(Error(`MARKETING_CI_STAGE_FAILED:${args[0]}:${code}`)));
    });
  }
  async function stage(name, args, extra) { await run(args, extra); summary.stages.push({ name, status: "PASS" }); }
  async function stop() {
    if (!server || server.exitCode !== null) { server = undefined; return; }
    const child = server; server = undefined;
    await new Promise(resolvePromise => {
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      child.once("exit", () => { clearTimeout(timer); resolvePromise(); }); child.kill("SIGTERM");
    });
  }
  async function start(registration) {
    server = spawn(process.execPath, ["scripts/marketing-consolidate-local.mjs", "start"], { cwd: root, env: { ...env, MARKETING_LOCAL_REGISTRATION_ENABLED: registration ? "true" : "false" }, stdio: "inherit" });
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw Error("MARKETING_CI_SERVER_EXITED");
      try { const response = await fetch(env.MARKETING_ORIGIN + "/api/health", { signal: AbortSignal.timeout(1000) }); const health = await response.json(); if (health.demo === true && health.localRegistration === registration) return; } catch {}
      await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
    }
    throw Error("MARKETING_CI_LOCAL_START_TIMEOUT");
  }
  try {
    await stage("migrations", ["--conditions=react-server", "--import", "tsx", "apps/marketing-saas-api/src/migrate.ts"]);
    await stage("migration-idempotency", ["--conditions=react-server", "--import", "tsx", "apps/marketing-saas-api/src/migrate.ts"]);
    const unitEnv = { ...env }; delete unitEnv.MARKETING_TEST_DATABASE_URL; delete unitEnv.MARKETING_CREATIVE_TEST_DATABASE_URL;
    const unitFile = join(privateDirectory, "unit.json");
    await new Promise((resolvePromise, reject) => {
      const child = spawn(process.execPath, ["--import", guard, "node_modules/vitest/vitest.mjs", "run", "apps/marketing-saas/src", "apps/marketing-saas-api/src", "apps/marketing-saas-api/qa-creative-acceptance", "apps/marketing-saas-api/qa-creative-hardening", "apps/marketing-saas-api/qa-creative-provider", "apps/marketing-saas-api/qa-creative-transport", "scripts/marketing-consolidate-ci.test.mjs", "--reporter=json", "--outputFile=" + unitFile], { cwd: root, env: unitEnv, stdio: "inherit" });
      child.once("error", reject); child.once("exit", code => code === 0 ? resolvePromise() : reject(Error("MARKETING_CI_UNIT_FAILED")));
    });
    const counts = data => ({ passed: data.numPassedTests, failed: data.numFailedTests, skipped: data.numPendingTests });
    summary.unit = counts(JSON.parse(await readFile(unitFile, "utf8"))); summary.stages.push({ name: "marketing-unit-security", status: "PASS" });
    const dbFile = join(privateDirectory, "database.json");
    await stage("marketing-database", ["node_modules/vitest/vitest.mjs", "run", "--no-file-parallelism", ...databaseTests, "--reporter=json", "--outputFile=" + dbFile], { MARKETING_LOCAL_REGISTRATION_ENABLED: "true" });
    summary.database = counts(JSON.parse(await readFile(dbFile, "utf8")));
    for (const [name, config] of [["api-types", "apps/marketing-saas-api/tsconfig.json"], ["ui-types", "apps/marketing-saas/tsconfig.json"]]) await stage(name, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", config]);
    await stage("marketing-lint", ["node_modules/eslint/bin/eslint.js", "apps/marketing-saas/src", "apps/marketing-saas-api/src", "apps/marketing-saas-api/qa-creative-acceptance", "apps/marketing-saas-api/qa-creative-hardening", "apps/marketing-saas-api/qa-creative-provider", "apps/marketing-saas-api/qa-creative-transport", "scripts/marketing-consolidate-ci.mjs", "scripts/marketing-consolidate-ci.test.mjs", "scripts/marketing-consolidate-browser.mjs", "scripts/marketing-consolidate-demo-browser.mjs", "scripts/marketing-consolidate-closed-browser.mjs"]);
    await stage("core-types", ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "packages/marketing-core/tsconfig.json"]);
    await stage("marketing-build", ["node_modules/vite/bin/vite.js", "build", "--config", "apps/marketing-saas/vite.config.ts"]);
    await stage("test-database-integrity", ["--conditions=react-server", "--import", "tsx", "apps/marketing-saas-api/src/verify.ts"]);
    // Quota/unknown-charge fixtures must retain their holds. Never clear ledgers to make a journey pass.
    // This operator-only local CI setup creates a separate empty synthetic database instead.
    const browserDatabase = new URL(env.MARKETING_DATABASE_URL);
    const browserName = "marketing_ci_journey_" + randomBytes(6).toString("hex");
    const pool = new Pool({ connectionString: env.MARKETING_DATABASE_URL });
    try { await pool.query('CREATE DATABASE "' + browserName + '"'); } finally { await pool.end(); }
    browserDatabase.pathname = "/" + browserName;
    env.MARKETING_DATABASE_URL = isolatedDatabaseUrl(browserDatabase.href);
    summary.browserDatabaseIsolatedFromQuotaFixtures = true;
    await stage("browser-database-migrations", ["--conditions=react-server", "--import", "tsx", "apps/marketing-saas-api/src/migrate.ts"]);
    await start(true); // Synthetic local setup only; closed state is verified after restart.
    await stage("authenticated-journey", ["scripts/marketing-consolidate-browser.mjs"], { MARKETING_BROWSER_EVIDENCE_ROOT: join(evidence, "workspace") });
    await stage("pdf-intake-journey", ["scripts/marketing-bue-browser.mjs"], { MARKETING_BUE_EVIDENCE_ROOT: join(evidence, "bue") });
    await stop();
    // The real DB-backed auth limit is 30 requests/60s and intentionally survives restart.
    // Successive synthetic journeys share loopback IP; honor the window instead of resetting/relaxing it.
    console.log("Waiting for the retained auth rate window; no limiter state is cleared.");
    await new Promise(resolvePromise => setTimeout(resolvePromise, 61000));
    summary.stages.push({ name: "auth-rate-window-retained", status: "PASS" });
    await start(false);
    await stage("closed-registration", ["scripts/marketing-consolidate-closed-browser.mjs"], { MARKETING_BROWSER_EVIDENCE_ROOT: join(evidence, "closed") });
    await stage("public-d2-demo", ["scripts/marketing-consolidate-demo-browser.mjs"], { MARKETING_BROWSER_EVIDENCE_ROOT: join(evidence, "demo") });
    await stage("database-integrity", ["--conditions=react-server", "--import", "tsx", "apps/marketing-saas-api/src/verify.ts"]);
    for (const [key, file] of [["authenticated", "workspace/BROWSER-RESULTS.json"], ["closed", "closed/RESULTS.json"], ["demo", "demo/RESULTS.json"]]) {
      const data = JSON.parse(await readFile(join(evidence, file), "utf8")); summary[key] = { checks: data.checks.length, status: "PASS" };
    }
    summary.status = "PASS";
  } catch (error) { summary.status = "FAIL"; throw error; } finally { await stop(); await writeFile(join(evidence, "summary.json"), JSON.stringify(summary, null, 2) + "\n"); }
  console.log("MARKETING_CANONICAL_CI_PASS");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
