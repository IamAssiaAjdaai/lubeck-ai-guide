import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { brandContextSchema } from "@marketing/core";
import { configuration } from "./config";
const pool = new Pool({ connectionString: configuration().databaseUrl });
try {
  const journal = await pool.query(
    "SELECT name,sha256 FROM mkt_migrations ORDER BY name",
  );
  if (journal.rows.length !== 4)
    throw new Error("EXPECTED_FOUR_SAAS_MIGRATIONS");
  for (const row of journal.rows) {
    if (!/^000[0-3]_[a-z_]+\.sql$/.test(row.name))
      throw new Error("UNKNOWN_MIGRATION");
    const digest = createHash("sha256")
      .update(
        await readFile(new URL("../migrations/" + row.name, import.meta.url)),
      )
      .digest("hex");
    if (digest !== row.sha256) throw new Error("MIGRATION_CHECKSUM_MISMATCH");
  }
  const contexts = await pool.query("SELECT context FROM mkt_brand_versions");
  for (const row of contexts.rows) brandContextSchema.parse(row.context);
  const revisions = await pool.query(
    "SELECT p.id FROM mkt_projects p WHERE p.revision<>(SELECT COALESCE(max(v.revision),0) FROM mkt_brand_versions v WHERE v.project_id=p.id)",
  );
  if (revisions.rowCount) throw new Error("BRAND_REVISION_MISMATCH");
  const usage = await pool.query(
    "SELECT u.organization_id FROM mkt_usage_month u WHERE u.packs<>(SELECT count(*) FROM mkt_generations g WHERE g.organization_id=u.organization_id AND g.month=u.month) OR u.cost_micro_eur<>(SELECT COALESCE(sum(g.cost_micro_eur),0) FROM mkt_generations g WHERE g.organization_id=u.organization_id AND g.month=u.month)",
  );
  if (usage.rowCount) throw new Error("USAGE_LEDGER_MISMATCH");
  const global = await pool.query(
    "SELECT u.month FROM mkt_global_usage u WHERE u.cost_micro_eur<>(SELECT COALESCE(sum(g.cost_micro_eur),0) FROM mkt_generations g WHERE g.month=u.month)",
  );
  if (global.rowCount) throw new Error("GLOBAL_USAGE_LEDGER_MISMATCH");
  const outputs = await pool.query(
    "SELECT id FROM mkt_generations g WHERE output_revision<>(SELECT COALESCE(max(v.version),0) FROM mkt_pack_versions v WHERE v.generation_id=g.id)",
  );
  if (outputs.rowCount) throw new Error("PACK_REVISION_MISMATCH");
  console.log(
    `MARKETING_SAAS_DB_VERIFY_OK migrations=${journal.rowCount} contexts=${contexts.rowCount}`,
  );
} finally {
  await pool.end();
}
