// @vitest-environment node
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

// Run separately against an EMPTY disposable local database. DDL and fixtures
// roll back together. This tests the actual committed SQL, not a schema mock.
describe.runIf(process.env.MARKETING_MIGRATION_INTEGRATION === "1")("Marketing generation migration upgrade", () => {
  it("upgrades 0023 with existing marketing data and rolls back safely", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error("Migration acceptance refuses non-local PostgreSQL.");
    }
    const client = new Client({ connectionString: url.toString() });
    await client.connect();
    try {
      const existing = await client.query("SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema='public'");
      expect(existing.rows[0].count).toBe(0);
      await client.query("BEGIN");
      const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: { idx: number; tag: string }[] };
      for (const entry of journal.entries.filter((entry) => entry.idx < 24)) {
        await client.query(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"));
      }
      const city = (await client.query("INSERT INTO cities (slug,name) VALUES ('generation-upgrade','Upgrade city') RETURNING id")).rows[0].id;
      const campaign = (await client.query("INSERT INTO marketing_campaigns (city_id,slug,name,objective,audience,message,cta) VALUES ($1,'upgrade','Upgrade','Test','Test','Test','Test') RETURNING *", [city])).rows[0];
      const page = (await client.query("INSERT INTO marketing_pages (city_id,campaign_id,kind,slug,path,title,body,publication_status) VALUES ($1,$2,'blog','upgrade','/generation-upgrade','Existing','Existing body','published') RETURNING *", [city, campaign.id])).rows[0];
      await client.query(readFileSync("drizzle/0024_marketing_generation_foundation.sql", "utf8"));
      expect((await client.query("SELECT * FROM marketing_campaigns WHERE id=$1", [campaign.id])).rows[0]).toEqual(campaign);
      expect((await client.query("SELECT * FROM marketing_pages WHERE id=$1", [page.id])).rows[0]).toEqual(page);
      expect((await client.query("SELECT count(*)::integer AS count FROM marketing_source_snapshots")).rows[0].count).toBe(0);
      await client.query("ROLLBACK");
      expect((await client.query("SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema='public'")).rows[0].count).toBe(0);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  }, 30_000);
});
