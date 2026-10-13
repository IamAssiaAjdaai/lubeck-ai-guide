// @vitest-environment node
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// All fixtures and successful mutations are rolled back, including immutable
// rows. Never disable the snapshot trigger to clean up integration fixtures.
describe.runIf(process.env.CMS_DB_INTEGRATION === "1")("Marketing generation PostgreSQL boundaries", () => {
  let client: Client;
  let city: number;
  let otherCity: number;
  let campaign: number;
  let otherCampaign: number;
  let place: number;
  let source: number;
  let chunk: string;
  let media: number;
  let mediaKey: string;
  let snapshot: number;
  let job: number;
  let page: number;
  let otherPage: number;
  let content: number;
  let otherMedia: number;
  const actor = randomUUID();

  async function id(sql: string, values: unknown[] = []): Promise<number> {
    return (await client.query(sql + " RETURNING id", values)).rows[0].id;
  }
  function snapshotValues() {
    return [campaign, city, "en", JSON.stringify([{ id: chunk, placeId: place, sourceId: source, statement: "A verified fact." }]), JSON.stringify([place]), JSON.stringify([{ sourceId: source, title: "Evidence", canonicalUrl: "https://example.test/evidence" }]), JSON.stringify([{ assetId: media, assetKey: mediaKey }]), "{}", actor];
  }
  const insertSnapshot = `INSERT INTO marketing_source_snapshots
    (campaign_id,city_id,locale,facts_json,places_json,references_json,media_json,brand_rules_json,created_by_user_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
  async function rejects(sql: string, values: unknown[] = [], code = "23514") {
    await client.query("SAVEPOINT expected_failure");
    try {
      await expect(client.query(sql, values)).rejects.toMatchObject({ code });
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT expected_failure");
      await client.query("RELEASE SAVEPOINT expected_failure");
    }
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error("Generation integration refuses non-local PostgreSQL.");
    }
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await client.query("BEGIN");
    await client.query('INSERT INTO "user" (id,name,email) VALUES ($1,$2,$3)', [actor, "Generation test", actor + "@example.test"]);
    city = await id("INSERT INTO cities (slug,name) VALUES ($1,'Test city')", [actor]);
    otherCity = await id("INSERT INTO cities (slug,name) VALUES ($1,'Other city')", [actor + "-other"]);
    campaign = await id("INSERT INTO marketing_campaigns (city_id,slug,name,objective,audience,message,cta) VALUES ($1,'test','Test','Test','Test','Test','Test')", [city]);
    otherCampaign = await id("INSERT INTO marketing_campaigns (city_id,slug,name,objective,audience,message,cta) VALUES ($1,'other','Other','Test','Test','Test','Test')", [city]);
    place = await id("INSERT INTO places (city_id,slug,category,latitude,longitude,duration_minutes,environment,pricing,tags,publication_status) VALUES ($1,'test','see',53,10,20,'outdoor','unknown','{}','published')", [city]);
    source = await id("INSERT INTO content_sources (publisher,title,canonical_url,verified_at) VALUES ('Test','Evidence','https://example.test/evidence',CURRENT_DATE)");
    await client.query("INSERT INTO place_sources (place_id,source_id) VALUES ($1,$2)", [place, source]);
    chunk = (await client.query("INSERT INTO verified_knowledge_chunks (place_id,source_id,locale,text) VALUES ($1,$2,'en','A verified fact.') RETURNING id", [place, source])).rows[0].id;
    mediaKey = randomUUID();
    media = await id("INSERT INTO media_assets (asset_key,city_id,kind,source_type,original_filename,mime_type,approval_status) VALUES ($1,$2,'image','upload','test.jpg','image/jpeg','approved')", [mediaKey, city]);
    otherMedia = await id("INSERT INTO media_assets (asset_key,city_id,kind,source_type,original_filename,mime_type) VALUES ($1,$2,'image','upload','other.jpg','image/jpeg')", [randomUUID(), otherCity]);
    snapshot = await id(insertSnapshot, snapshotValues());
    job = await id("INSERT INTO marketing_generation_jobs (campaign_id,city_id,source_snapshot_id,type,requested_outputs,language,created_by_user_id) VALUES ($1,$2,$3,'campaign_pack','{blog,social}','en',$4)", [campaign, city, snapshot, actor]);
    page = await id("INSERT INTO marketing_pages (city_id,campaign_id,kind,slug,path,title,body) VALUES ($1,$2,'blog','test',$3,'Test','Test')", [city, campaign, "/" + actor]);
    otherPage = await id("INSERT INTO marketing_pages (city_id,campaign_id,kind,slug,path,title,body) VALUES ($1,$2,'blog','other',$3,'Other','Test')", [city, otherCampaign, "/" + actor + "-other"]);
    content = await id("INSERT INTO marketing_content (city_id,campaign_id,content_code,platform,format,hook) VALUES ($1,$2,$3,'test','test','test')", [city, campaign, actor]);
  });
  beforeEach(async () => { await client.query("SAVEPOINT test_case"); });
  afterEach(async () => { await client.query("ROLLBACK TO SAVEPOINT test_case"); });
  afterAll(async () => {
    if (client) { await client.query("ROLLBACK"); await client.end(); }
  });
  it("creates queued jobs and draft outputs without publishing linked CMS rows", async () => {
    const output = await id("INSERT INTO marketing_generation_outputs (job_id,campaign_id,city_id,kind,language,text_content,marketing_page_id,marketing_content_id) VALUES ($1,$2,$3,'blog','en','Draft',$4,$5)", [job, campaign, city, page, content]);
    expect((await client.query("SELECT status FROM marketing_generation_jobs WHERE id=$1", [job])).rows[0].status).toBe("queued");
    expect((await client.query("SELECT status,version FROM marketing_generation_outputs WHERE id=$1", [output])).rows[0]).toEqual({ status: "draft", version: 1 });
    await client.query("UPDATE marketing_generation_outputs SET status='approved' WHERE id=$1", [output]);
    expect((await client.query("SELECT publication_status FROM marketing_pages WHERE id=$1", [page])).rows[0].publication_status).toBe("draft");
    expect((await client.query("SELECT status FROM marketing_content WHERE id=$1", [content])).rows[0].status).toBe("idea");
  });
  it("rejects all snapshot mutations and cascading owner deletion", async () => {
    await rejects("UPDATE marketing_source_snapshots SET brand_rules_json='{}' WHERE id=$1", [snapshot]);
    await rejects("DELETE FROM marketing_source_snapshots WHERE id=$1", [snapshot]);
    await rejects("TRUNCATE marketing_source_snapshots CASCADE");
    await rejects("DELETE FROM marketing_campaigns WHERE id=$1", [campaign], "23503");
    await rejects('DELETE FROM "user" WHERE id=$1', [actor], "23503");
  });
  it("rejects missing and cross-city/campaign snapshot ownership", async () => {
    for (const owner of [otherCity, 2147483647]) {
      const values = snapshotValues(); values[1] = owner;
      // Facts fail closed before the FK when their city is wrong.
      await rejects(insertSnapshot, values);
    }
    const values = snapshotValues(); values[0] = 2147483647;
    await rejects(insertSnapshot, values, "23503");
  });
  it("rejects mismatched snapshot/job context and unknown requesters", async () => {
    for (const [column, value] of [["campaign_id", otherCampaign], ["city_id", otherCity], ["language", "de"], ["source_snapshot_id", 2147483647], ["created_by_user_id", "missing"]]) {
      await rejects(`UPDATE marketing_generation_jobs SET ${column}=$1 WHERE id=$2`, [value, job], "23503");
    }
  });
  it("enforces lifecycles, lease shape, attempts, request bounds and sanitized errors", async () => {
    await rejects("UPDATE marketing_generation_jobs SET status='published' WHERE id=$1", [job], "22P02");
    for (const change of ["attempts=-1", "requested_outputs='{}'", "requested_outputs=ARRAY[NULL]::marketing_generation_kind[]", "status='claimed'", "error_code='secret provider error'"]) {
      await rejects(`UPDATE marketing_generation_jobs SET ${change} WHERE id=$1`, [job]);
    }
    await client.query("SAVEPOINT lease_test");
    await client.query("UPDATE marketing_generation_jobs SET status='claimed',worker_id='local-test',lease_expires_at=now()+interval '1 minute',attempts=1 WHERE id=$1", [job]);
    await client.query("UPDATE marketing_generation_jobs SET status='processing',started_at=now() WHERE id=$1", [job]);
    await client.query("UPDATE marketing_generation_jobs SET status='completed',lease_expires_at=NULL,completed_at=now() WHERE id=$1", [job]);
    await client.query("ROLLBACK TO SAVEPOINT lease_test");
  });
  it("rejects unverified, fabricated and wrong-locale facts and altered references", async () => {
    for (const fact of [
      { id: chunk, placeId: place, sourceId: source, statement: "Fabricated" },
      { id: randomUUID(), placeId: place, sourceId: source, statement: "A verified fact." },
    ]) {
      const values = snapshotValues(); values[3] = JSON.stringify([fact]);
      await rejects(insertSnapshot, values);
    }
    const values = snapshotValues(); values[2] = "de";
    await rejects(insertSnapshot, values);
    values[2] = "en"; values[5] = JSON.stringify([{ sourceId: source, title: "Changed", canonicalUrl: "https://example.test/evidence" }]);
    await rejects(insertSnapshot, values);
    for (const change of ["is_active=false", "locale='fr'"]) {
      await client.query("SAVEPOINT evidence_test");
      await client.query(`UPDATE verified_knowledge_chunks SET ${change} WHERE id=$1`, [chunk]);
      await rejects(insertSnapshot, snapshotValues());
      await client.query("ROLLBACK TO SAVEPOINT evidence_test");
    }
    for (const change of ["valid_until='2000-01-01'", "verified_at='2099-01-01'"]) {
      await client.query("SAVEPOINT evidence_test");
      await client.query(`UPDATE content_sources SET ${change} WHERE id=$1`, [source]);
      await rejects(insertSnapshot, snapshotValues());
      await client.query("ROLLBACK TO SAVEPOINT evidence_test");
    }
  });
  it("rejects unsupported fact fields and preserves input after source revocation", async () => {
    const values = snapshotValues();
    values[3] = JSON.stringify([{ id: chunk, placeId: place, sourceId: source, statement: "A verified fact.", unsupportedClaim: "Unverified" }]);
    await rejects(insertSnapshot, values);
    await client.query("UPDATE verified_knowledge_chunks SET is_active=false, text='Changed live fact' WHERE id=$1", [chunk]);
    expect((await client.query("SELECT facts_json FROM marketing_source_snapshots WHERE id=$1", [snapshot])).rows[0].facts_json).toEqual([{ id: chunk, placeId: place, sourceId: source, statement: "A verified fact." }]);
    await rejects(insertSnapshot, snapshotValues());
  });
  it("rejects unapproved, archived and foreign selected media", async () => {
    for (const change of ["approval_status='pending_review'", "archived_at=now()", `city_id=${otherCity}`]) {
      await client.query("SAVEPOINT media_test");
      await client.query(`UPDATE media_assets SET ${change} WHERE id=$1`, [media]);
      await rejects(insertSnapshot, snapshotValues());
      await client.query("ROLLBACK TO SAVEPOINT media_test");
    }
  });
  it("bounds snapshot data and rejects unsupported locales", async () => {
    for (const [position, value] of [[3, "[]"], [3, JSON.stringify(Array(101).fill({}))], [7, JSON.stringify({ tone: "x".repeat(16384) })], [2, "ar"]] as const) {
      const values = snapshotValues(); values[position] = value;
      await rejects(insertSnapshot, values);
    }
  });
  it("requires draft-first, requested kinds, payloads and valid versions", async () => {
    const base = "INSERT INTO marketing_generation_outputs (job_id,campaign_id,city_id,kind,language,text_content,status,version) VALUES ($1,$2,$3,$4,'en',$5,$6,$7)";
    for (const tail of [["blog", "Draft", "approved", 1], ["video", "Draft", "draft", 1], ["blog", null, "draft", 1], ["blog", "Draft", "draft", 0]]) {
      await rejects(base, [job, campaign, city, ...tail]);
    }
    await rejects(base, [job, campaign, city, "blog", "Draft", "published", 1], "22P02");
  });
  it("rejects cross-context CMS/media associations and missing jobs", async () => {
    const base = "INSERT INTO marketing_generation_outputs (job_id,campaign_id,city_id,kind,language,text_content,marketing_page_id,media_asset_id) VALUES ($1,$2,$3,'blog','en','Draft',$4,$5)";
    await rejects(base, [job, campaign, city, otherPage, null], "23503");
    await rejects(base, [job, campaign, city, null, otherMedia], "23503");
    await rejects(base, [job, otherCampaign, city, null, null], "23503");
    await rejects(base, [job, campaign, otherCity, null, null], "23503");
    await rejects(base, [2147483647, campaign, city, null, null]);
  });
});
