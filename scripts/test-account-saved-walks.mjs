// Isolated local integration gate. Never loads .env or connects to remote databases.
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const base = new URL(process.env.CITYWALK_TEST_DATABASE_URL ?? "postgresql://citywalk:citywalk@127.0.0.1:5432/postgres");
if (base.hostname !== "127.0.0.1" || !["postgres:", "postgresql:"].includes(base.protocol)) throw new Error("Disposable tests require loopback PostgreSQL.");
const name = `cw_savedwalk_${Date.now()}`;
const admin = new Client({ connectionString: base.toString() });
let created = false;
let baselineFolder;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`); created = true;
  const target = new URL(base); target.pathname = `/${name}`;
  const pool = new Pool({ connectionString: target.toString() });
  try {
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
    assert.equal(journal.entries.at(-1).tag, "0014_orange_vision");
    baselineFolder = await mkdtemp(join(tmpdir(), "citywalk-saved-migration-"));
    await mkdir(join(baselineFolder, "meta"));
    const previous = journal.entries.slice(0, -1);
    await writeFile(join(baselineFolder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: previous }));
    for (const entry of previous) await copyFile(`drizzle/${entry.tag}.sql`, join(baselineFolder, `${entry.tag}.sql`));
    await migrate(drizzle(pool), { migrationsFolder: baselineFolder });
    assert.equal((await pool.query("select to_regclass('public.account_saved_walks') as relation")).rows[0].relation, null);
    // Synthetic existing-data fixture only in this newly created disposable DB.
    await pool.query('insert into "user" (id, name, email) values ($1, $2, $3)', ["migration-existing-user", "Preserve me", "migration@example.test"]);
    await pool.query("insert into traveler_profiles (user_id, preferred_locale) values ($1, $2)", ["migration-existing-user", "de"]);
    const preserved = 'select row_to_json(u) as account, row_to_json(p) as profile from "user" u join traveler_profiles p on p.user_id = u.id where u.id = $1';
    const before = (await pool.query(preserved, ["migration-existing-user"])).rows;
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    assert.deepEqual((await pool.query(preserved, ["migration-existing-user"])).rows, before);
    assert.equal((await pool.query("select count(*)::int as count from account_saved_walks")).rows[0].count, 0);
    assert.equal((await pool.query('select count(*)::int as count from drizzle.__drizzle_migrations')).rows[0].count, journal.entries.length);
    console.log("Migration upgrade and rerun PASS; pre-existing synthetic account/profile unchanged, no saves fabricated.");
  }
  finally { await pool.end(); }
  console.log("All migrations applied to a new disposable loopback database.");
  const run = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/account/savedWalks.integration.test.ts", "--maxWorkers=1"], {
    env: { ...process.env, DATABASE_URL: target.toString(), CITYWALK_CONTENT_SOURCE: "code", SAVED_WALK_DB_INTEGRATION: "1" }, stdio: "inherit",
  });
  process.exitCode = run.status === 0 ? 0 : 1;
} catch {
  console.error("Isolated saved-walk database gate failed. No connection details logged."); process.exitCode = 1;
} finally {
  if (created) {
    // Only the database allocated by this process is removed, including on a failed test.
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    console.log("Disposable database removed; existing databases untouched.");
  }
  await admin.end();
  if (baselineFolder) await rm(baselineFolder, { recursive: true });
}
