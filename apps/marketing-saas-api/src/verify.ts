import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { brandContextSchema } from "@marketing/core";
import { configuration } from "./config";
const config = configuration();
const pool = new Pool({ connectionString: config.databaseUrl });
try {
  const journal = await pool.query(
    "SELECT name,sha256 FROM mkt_migrations ORDER BY name",
  );
  if (
    ![4, 5, 6, 7].includes(journal.rows.length) ||
    (config.creative && journal.rows.length !== (config.workspace ? 7 : 6))
  )
    throw new Error("EXPECTED_SAAS_MIGRATIONS");
  for (const row of journal.rows) {
    if (!/^000[0-6]_[a-z_]+\.sql$/.test(row.name))
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
  if (journal.rows.some((r) => r.name === "0004_creative.sql")) {
    const creative =
      await pool.query(`SELECT p.project_id FROM mkt_creative_projects p
      WHERE (p.state->'erasure' IS NULL AND p.revision <> (SELECT COALESCE(max(v.revision),0) FROM mkt_creative_versions v WHERE v.project_id=p.project_id))
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.state->'jobs') j
        WHERE NOT EXISTS(SELECT 1 FROM mkt_creative_charges c WHERE c.id=(j->>'id')::uuid AND c.project_id=p.project_id AND c.organization_id=p.organization_id AND c.kind=j->>'kind'))`);
    const orphanCharges =
      await pool.query(`SELECT c.id FROM mkt_creative_charges c WHERE NOT EXISTS(
      SELECT 1 FROM mkt_creative_projects p, jsonb_array_elements(p.state->'jobs') j
      WHERE p.project_id=c.project_id AND (j->>'id')::uuid=c.id) ${journal.rows.some((r) => r.name === "0005_creative_privacy.sql") ? "AND c.metadata_erased_at IS NULL" : ""}`);
    if (creative.rowCount || orphanCharges.rowCount)
      throw new Error("CREATIVE_LEDGER_MISMATCH");
    if (journal.rows.some((r) => r.name === "0005_creative_privacy.sql")) {
      const invalid =
        await pool.query(`SELECT p.project_id FROM mkt_creative_projects p WHERE p.state ? 'erasure' AND (
        NOT EXISTS(SELECT 1 FROM mkt_creative_erasures e WHERE e.project_id=p.project_id AND e.organization_id=p.organization_id)
        OR jsonb_array_length(p.state->'assets')<>0 OR jsonb_array_length(p.state->'jobs')<>0
        OR EXISTS(SELECT 1 FROM mkt_creative_versions v WHERE v.project_id=p.project_id)
        OR EXISTS(SELECT 1 FROM mkt_creative_charges c WHERE c.project_id=p.project_id AND c.metadata_erased_at IS NULL))`);
      if (invalid.rowCount)
        throw new Error("CREATIVE_ERASURE_INTEGRITY_MISMATCH");
    }
  }
  console.log(
    `MARKETING_SAAS_DB_VERIFY_OK migrations=${journal.rowCount} contexts=${contexts.rowCount}`,
  );
} finally {
  await pool.end();
}
