// @vitest-environment node
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

describe.runIf(process.env.BRAND_CONTEXT_MIGRATION_INTEGRATION === "1")("Brand context committed SQL 0024 to 0025 upgrade", () => {
  it("preserves CMS and generation contracts, adds empty persistence and rolls back only the new migration", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Migration acceptance requires empty disposable local PostgreSQL");
    const client = new Client({ connectionString: url.toString() }); await client.connect();
    try {
      expect((await client.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n).toBe(0);
      await client.query("BEGIN");
      const entries = (JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: { idx: number; tag: string }[] }).entries;
      for (const e of entries.filter(e => e.idx < 25)) await client.query(readFileSync(`drizzle/${e.tag}.sql`, "utf8"));
      const city = (await client.query("INSERT INTO cities(slug,name) VALUES('brand-upgrade','Fixture') RETURNING id")).rows[0].id;
      const campaign = (await client.query("INSERT INTO marketing_campaigns(city_id,slug,name,objective,audience,message,cta) VALUES($1,'brand-upgrade','Existing','Existing','Existing','Existing','Existing') RETURNING *", [city])).rows[0];
      const page = (await client.query("INSERT INTO marketing_pages(city_id,campaign_id,kind,slug,path,title,body,publication_status) VALUES($1,$2,'blog','upgrade','/brand-upgrade','Existing','Existing','published') RETURNING *", [city, campaign.id])).rows[0];
      const generationFunctions = async () => (await client.query("SELECT proname,pg_get_functiondef(oid) definition FROM pg_proc WHERE proname LIKE 'marketing_%' ORDER BY proname")).rows;
      const beforeFunctions = await generationFunctions();
      const beforeTables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
      await client.query("SAVEPOINT before_brand");
      const sql = readFileSync("drizzle/0025_brand_context_persistence.sql", "utf8");
      await client.query(sql);
      expect((await client.query("SELECT * FROM marketing_campaigns WHERE id=$1", [campaign.id])).rows[0]).toEqual(campaign);
      expect((await client.query("SELECT * FROM marketing_pages WHERE id=$1", [page.id])).rows[0]).toEqual(page);
      expect(await generationFunctions()).toEqual(beforeFunctions);
      for (const table of ["brand_projects", "brand_contexts", "brand_context_revisions", "brand_context_audit", "citywalk_brand_projects", "citywalk_brand_project_campaigns", "citywalk_brand_reviewers"]) expect((await client.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n).toBe(0);
      expect((await client.query("SELECT count(*)::int n FROM pg_trigger WHERE tgname='citywalk_brand_owner_erasure'")).rows[0].n).toBe(0);
      expect((await client.query("SELECT confdeltype FROM pg_constraint WHERE conname='citywalk_brand_projects_city_id_cities_id_fk'")).rows[0].confdeltype).toBe("r");
      await client.query("ROLLBACK TO SAVEPOINT before_brand");
      expect((await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows).toEqual(beforeTables);
      expect((await client.query("SELECT * FROM marketing_pages WHERE id=$1", [page.id])).rows[0]).toEqual(page);
      expect((await client.query("SELECT count(*)::int n FROM pg_proc WHERE proname LIKE 'brand_%' OR proname IN ('citywalk_brand_binding_guard','citywalk_brand_reviewer_guard')")).rows[0].n).toBe(0);
      await client.query(sql); // Reapplication after rollback must also work.
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");
      await client.query("ROLLBACK");
      expect((await client.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n).toBe(0);
    } finally { await client.query("ROLLBACK"); await client.end(); }
  }, 30_000);
});
