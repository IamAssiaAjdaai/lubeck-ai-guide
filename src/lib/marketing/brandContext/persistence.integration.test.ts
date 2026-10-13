// @vitest-environment node
import { randomUUID } from "node:crypto";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type BrandContext } from "@marketing/core";
import { deleteTravelerAccount } from "@/lib/auth/lifecycle/deleteAccount.server";
import { runWithRequestDatabase } from "@/db/client";
import { databaseSchema } from "@/db/client";
import { type AdminContext } from "@/lib/admin/authorization.server";
import { citywalkBrief, germanSmeBrief } from "../../../../packages/marketing-core/tests/fixtures";
import { createBrandContextService } from "./service.server";

vi.mock("server-only", () => ({}));

const enabled = process.env.BRAND_CONTEXT_DB_INTEGRATION === "1";
describe.runIf(enabled)("Brand persistence PostgreSQL authorization, concurrency and erasure", () => {
  let client: Client, pool: Pool;
  let cities: number[], campaigns: number[], users: string[];
  let a: BrandContext, b: BrandContext;
  let services: ReturnType<typeof createBrandContextService>[];
  const orphanActors: string[] = [];
  const key = randomUUID();
  const owner = (id: string): AdminContext => ({ user: { id, email: `${id}@example.test`, name: "Fixture" }, staff: { userId: id, membershipId: 0, role: "super_admin", active: true, globalAccess: true, cityIds: [] } });
  const request = (c: BrandContext) => ({ projectId: c.projectId, contextId: c.contextId });
  const confirmation = (c: BrandContext, revision = 1) => ({ ...request(c), command: { expectedRevision: revision, factIds: [c.facts[0].id] } });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Brand integration requires disposable local PostgreSQL");
    client = new Client({ connectionString: url.toString() }); await client.connect();
    pool = new Pool({ connectionString: url.toString(), max: 5 });
    cities = []; campaigns = []; users = [];
    for (let i = 0; i < 2; i++) {
      const city = (await client.query("INSERT INTO cities(slug,name) VALUES($1,'Scope fixture') RETURNING id", [`${key}-${i}`])).rows[0].id;
      cities.push(city);
      campaigns.push((await client.query("INSERT INTO marketing_campaigns(city_id,slug,name,objective,audience,message,cta) VALUES($1,'brand-test','Test','Test','Test','Test','Test') RETURNING id", [city])).rows[0].id);
      const id = randomUUID(); users.push(id);
      await client.query('INSERT INTO "user"(id,name,email) VALUES($1,\'Fixture\',$2)', [id, `${id}@example.test`]);
      const member = (await client.query("INSERT INTO staff_memberships(user_id,role) VALUES($1,'admin') RETURNING id", [id])).rows[0].id;
      await client.query("INSERT INTO staff_city_access(staff_membership_id,city_id) VALUES($1,$2)", [member, city]);
    }
    services = users.map(id => createBrandContextService(drizzle(pool, { schema: databaseSchema }), async () => owner(id)));
  });
  beforeEach(async () => {
    a = await services[0].create({ campaignId: campaigns[0], brief: citywalkBrief });
    b = await services[1].create({ campaignId: campaigns[1], brief: germanSmeBrief });
  });
  afterEach(async () => {
    await client.query("DELETE FROM brand_projects WHERE id=ANY($1::uuid[])", [[a?.projectId, b?.projectId].filter(Boolean)]);
    await client.query("DELETE FROM staff_city_access WHERE city_id=$1 AND staff_membership_id IN (SELECT id FROM staff_memberships WHERE user_id=$2)", [cities[1], users[0]]);
    await client.query("UPDATE staff_memberships SET role='admin',active=true WHERE user_id=ANY($1::text[])", [users]);
  });
  afterAll(async () => {
    if (client) {
      await client.query("DELETE FROM marketing_campaigns WHERE id=ANY($1::int[])", [campaigns]);
      orphanActors.push(...(await client.query("SELECT actor_id FROM citywalk_brand_reviewers WHERE user_id=ANY($1::text[])", [users])).rows.map(r => r.actor_id));
      await client.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [users]);
      await client.query("DELETE FROM external_account_erasure_jobs WHERE external_customer_id=ANY($1::text[])", [users]);
      // Only fixture actors, captured before unlinking their account IDs.
      await client.query("DELETE FROM citywalk_brand_reviewers WHERE actor_id=ANY($1::uuid[])", [orphanActors]);
      await client.query("DELETE FROM cities WHERE id=ANY($1::int[])", [cities]);
      await client.end();
    }
    if (pool) await pool.end();
  });
  it("persists CITYWALK and an unrelated SME through identical versioned generic contracts", async () => {
    expect(await services[0].read(request(a))).toEqual(a);
    expect(await services[1].read(request(b))).toEqual(b);
    expect(a.identity.name).toBe("CITYWALK"); expect(b.identity.name).toBe("Nordlicht Metallbau GmbH");
    expect(a).not.toHaveProperty("cityId"); expect(b).not.toHaveProperty("campaignId");
    expect(a.facts.every(f => f.confirmation === null)).toBe(true);
    expect((await services[0].history(request(a)))[0].audit.event).toBe("created");
  });
  it("binds confirmation to exact evidence, server time and an opaque authenticated reviewer", async () => {
    const next = await services[0].confirm(confirmation(a));
    const history = await services[0].history(request(a));
    expect(history.map(h => h.context.revision)).toEqual([1, 2]);
    expect(history[0].context).toEqual(a);
    const proof = next.facts[0].confirmation!;
    expect(proof.actorId).not.toBe(users[0]);
    expect(proof.provenance).toEqual(a.facts[0].provenanceIds.map(id => a.provenance.find(p => p.id === id)));
    expect(proof.statement).toBe(a.facts[0].statement);
    expect(history[1].audit.actorId).toBe(proof.actorId);
    expect(history[1].audit.occurredAt.toISOString()).toBe(proof.confirmedAt);
    expect(history[1].audit.factIds).toEqual([a.facts[0].id]);
    expect((await client.query("SELECT user_id FROM citywalk_brand_reviewers WHERE actor_id=$1", [proof.actorId])).rows[0].user_id).toBe(users[0]);
  });
  it("allows exactly one of two concurrent confirmations at the same expected revision", async () => {
    const results = await Promise.allSettled([services[0].confirm(confirmation(a)), services[0].confirm(confirmation(a))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.code).toBe("STALE_REVISION");
    expect((await services[0].read(request(a))).revision).toBe(2);
    expect(await services[0].history(request(a))).toHaveLength(2);
  });
  it("rolls back the CAS, revision and confirmation when the audit INSERT fails", async () => {
    const name = "brand_fail_" + a.contextId.replaceAll("-", "");
    await client.query(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected audit failure'; END; $$`);
    await client.query(`CREATE TRIGGER ${name} BEFORE INSERT ON brand_context_audit FOR EACH ROW WHEN (NEW.context_id='${a.contextId}'::uuid AND NEW.event='facts_confirmed') EXECUTE FUNCTION ${name}()`);
    try { await expect(services[0].confirm(confirmation(a))).rejects.toThrow(); }
    finally { await client.query(`DROP TRIGGER ${name} ON brand_context_audit`); await client.query(`DROP FUNCTION ${name}()`); }
    expect(await services[0].read(request(a))).toEqual(a);
    expect(await services[0].history(request(a))).toHaveLength(1);
    expect((await services[0].confirm(confirmation(a))).revision).toBe(2);
  });
  it("rejects unauthorized cross-scope CRUD/history and mixed project/context IDs", async () => {
    await expect(services[0].create({ campaignId: campaigns[1], brief: germanSmeBrief })).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const operation of [() => services[0].read(request(b)), () => services[0].history(request(b)), () => services[0].confirm(confirmation(b)), () => services[0].correct({ ...request(b), expectedRevision: 1, brief: germanSmeBrief }), () => services[0].purge({ ...request(b), expectedRevision: 1, eraseHistory: true })]) await expect(operation()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(services[0].read({ projectId: a.projectId, contextId: b.contextId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await services[1].read(request(b))).toEqual(b);
  });
  it("reloads real membership rather than trusting forged roles and rejects unapproved identity metadata", async () => {
    await client.query("UPDATE staff_memberships SET role='content_editor' WHERE user_id=$1", [users[0]]);
    await expect(services[0].confirm(confirmation(a))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(services[0].purge({ ...request(a), expectedRevision: 1, eraseHistory: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await client.query("UPDATE staff_memberships SET active=false WHERE user_id=$1", [users[0]]);
    await expect(services[0].read(request(a))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await client.query("UPDATE staff_memberships SET active=true,role='admin' WHERE user_id=$1", [users[0]]);
    await expect(services[0].confirm({ ...confirmation(a), actorId: users[1], confirmedAt: "2099-01-01T00:00:00Z" })).rejects.toThrow();
    await expect(services[0].confirm({ ...request(a), command: { expectedRevision: 1, factIds: [a.facts[0].id], statement: "Forged evidence" } })).rejects.toThrow();
    const deny = createBrandContextService(drizzle(pool, { schema: databaseSchema }), async () => { throw new Error("UNAUTHENTICATED"); });
    await expect(deny.read(request(a))).rejects.toThrow("UNAUTHENTICATED");
  });
  it("preserves history during correction and clears every old human approval", async () => {
    await services[0].confirm(confirmation(a));
    const revised = await services[0].correct({ ...request(a), expectedRevision: 2, brief: { ...citywalkBrief, facts: [{ id: "product", statement: "Corrected declared claim" }] } });
    expect(revised.revision).toBe(3); expect(revised.facts[0].confirmation).toBeNull();
    const history = await services[0].history(request(a));
    expect(history[1].context.facts[0].confirmation).not.toBeNull();
    expect(history[2].audit.event).toBe("corrected");
    await expect(services[0].confirm(confirmation(a, 2))).rejects.toMatchObject({ code: "STALE_REVISION" });
  });
  it("rejects direct history changes/deletes and incomplete revision commits", async () => {
    await expect(client.query("UPDATE brand_context_revisions SET digest=repeat('0',64) WHERE context_id=$1", [a.contextId])).rejects.toMatchObject({ code: "23514" });
    await expect(client.query("DELETE FROM brand_context_audit WHERE context_id=$1", [a.contextId])).rejects.toMatchObject({ code: "23514" });
    await expect(client.query("DELETE FROM brand_contexts WHERE id=$1", [a.contextId])).rejects.toMatchObject({ code: "23514" });
    await expect(client.query("TRUNCATE brand_context_revisions CASCADE")).rejects.toMatchObject({ code: "23514" });
    await client.query("BEGIN");
    try {
      await client.query("UPDATE brand_contexts SET current_revision=2 WHERE id=$1", [a.contextId]);
      const next = { ...a, revision: 2 };
      await client.query("INSERT INTO brand_context_revisions(context_id,project_id,revision,schema_version,context_json,digest) VALUES($1,$2,2,1,$3,repeat('0',64))", [a.contextId, a.projectId, JSON.stringify(next)]);
      await expect(client.query("COMMIT")).rejects.toMatchObject({ code: "23514" });
    } finally { await client.query("ROLLBACK"); }
    expect(await services[0].read(request(a))).toEqual(a);
  });
  it("rejects mistyped context version JSON and reassignment of reviewer identity", async () => {
    const actors = (await client.query("SELECT actor_id FROM citywalk_brand_reviewers WHERE user_id=$1", [users[0]])).rows;
    await expect(client.query("UPDATE citywalk_brand_reviewers SET user_id=$1 WHERE actor_id=$2", [users[1], actors[0].actor_id])).rejects.toMatchObject({ code: "23514" });
    await client.query("BEGIN");
    try {
      await client.query("UPDATE brand_contexts SET current_revision=2 WHERE id=$1", [a.contextId]);
      await expect(client.query("INSERT INTO brand_context_revisions(context_id,project_id,revision,schema_version,context_json,digest) VALUES($1,$2,2,1,$3,repeat('0',64))", [a.contextId, a.projectId, JSON.stringify({ ...a, revision: 2, schemaVersion: null })])).rejects.toMatchObject({ code: "23514" });
    } finally { await client.query("ROLLBACK"); }
    expect(await services[0].read(request(a))).toEqual(a);
  });
  it("erases a complete project under policy and never crosses another scope", async () => {
    await services[0].confirm(confirmation(a));
    await expect(services[0].purge({ ...request(a), expectedRevision: 1, eraseHistory: true })).rejects.toMatchObject({ code: "STALE_REVISION" });
    await services[0].purge({ ...request(a), expectedRevision: 2, eraseHistory: true });
    for (const t of ["brand_contexts", "brand_context_revisions", "brand_context_audit"]) expect((await client.query(`SELECT count(*)::int n FROM ${t} WHERE ${t === "brand_contexts" ? "id" : "context_id"}=$1`, [a.contextId])).rows[0].n).toBe(0);
    await expect(services[0].read(request(a))).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await services[1].read(request(b))).toEqual(b);
  });
  it("unlinks erased account identity without mutating history or introducing user deletion blockers", async () => {
    // Existing staff-erasure eligibility is unchanged: remove fixture membership first.
    const confirmed = await services[0].confirm(confirmation(a));
    const actorId = confirmed.facts[0].confirmation!.actorId; orphanActors.push(actorId);
    await client.query("DELETE FROM staff_memberships WHERE user_id=$1", [users[0]]);
    const sessionId = randomUUID();
    await client.query('INSERT INTO session(id,token,user_id,expires_at) VALUES($1,$2,$3,now()+interval \'1 hour\')', [sessionId, randomUUID(), users[0]]);
    await client.query('INSERT INTO account(id,account_id,provider_id,user_id,password) VALUES($1,$2,\'credential\',$2,\'fixture-hash\')', [randomUUID(), users[0]]);
    await runWithRequestDatabase(drizzle(pool, { schema: databaseSchema }), () => deleteTravelerAccount({ userId: users[0], sessionId, password: "fixture-password", verify: async ({ hash, password }) => hash === "fixture-hash" && password === "fixture-password" }));
    expect((await client.query('SELECT count(*)::int n FROM "user" WHERE id=$1', [users[0]])).rows[0].n).toBe(0);
    expect((await client.query("SELECT user_id FROM citywalk_brand_reviewers WHERE actor_id=$1", [actorId])).rows[0].user_id).toBeNull();
    expect((await client.query("SELECT context_json FROM brand_context_revisions WHERE context_id=$1 AND revision=2", [a.contextId])).rows[0].context_json.facts[0].confirmation.actorId).toBe(actorId);
    // Restore only this fixture identity for subsequent cases; old opaque actor stays unlinked.
    await client.query('INSERT INTO "user"(id,name,email) VALUES($1,\'Fixture\',$2)', [users[0], `${users[0]}@example.test`]);
    const member = (await client.query("INSERT INTO staff_memberships(user_id,role) VALUES($1,'admin') RETURNING id", [users[0]])).rows[0].id;
    await client.query("INSERT INTO staff_city_access(staff_membership_id,city_id) VALUES($1,$2)", [member, cities[0]]);
  });
  it("refuses host scope reassignment, wrong ownership and duplicate current contexts", async () => {
    await expect(client.query("UPDATE citywalk_brand_projects SET city_id=$1 WHERE project_id=$2", [cities[1], a.projectId])).rejects.toMatchObject({ code: "23514" });
    await expect(client.query("INSERT INTO brand_contexts(id,project_id,current_revision) VALUES($1,$2,1)", [randomUUID(), a.projectId])).rejects.toMatchObject({ code: "23505" });
    await client.query("BEGIN");
    try {
      const project = randomUUID();
      await client.query("INSERT INTO brand_projects(id) VALUES($1)", [project]);
      await client.query("INSERT INTO citywalk_brand_projects(project_id,city_id) VALUES($1,$2)", [project, cities[1]]);
      await expect(client.query("INSERT INTO citywalk_brand_project_campaigns(project_id,campaign_id,city_id) VALUES($1,$2,$3)", [project, campaigns[0], cities[1]])).rejects.toMatchObject({ code: "23503", constraint: "citywalk_brand_campaign_owner_fk" });
    } finally { await client.query("ROLLBACK"); }
  });
  it("shares one context across campaigns while authorizing every durable city scope", async () => {
    const campaign = (await client.query("INSERT INTO marketing_campaigns(city_id,slug,name,objective,audience,message,cta) VALUES($1,$2,'Different goal','Retention','SME','Test','Test') RETURNING id", [cities[0], randomUUID()])).rows[0].id;
    try {
      await Promise.all([services[0].associateCampaign({ ...request(a), campaignId: campaign }), services[0].associateCampaign({ ...request(a), campaignId: campaign })]); // Concurrent idempotent association.
      expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_project_campaigns WHERE project_id=$1", [a.projectId])).rows[0].n).toBe(2);
      expect(await services[0].read(request(a))).toEqual(a);
      const before = await services[0].history(request(a));
      await client.query("DELETE FROM marketing_campaigns WHERE id=$1", [campaign]);
      expect(await services[0].history(request(a))).toEqual(before);
      expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_project_campaigns WHERE project_id=$1", [a.projectId])).rows[0].n).toBe(1);
      await expect(services[0].associateCampaign({ ...request(a), campaignId: campaigns[1] })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(services[1].associateCampaign({ ...request(a), campaignId: campaigns[1] })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await client.query("INSERT INTO staff_city_access(staff_membership_id,city_id) SELECT id,$1 FROM staff_memberships WHERE user_id=$2", [cities[1], users[0]]);
      await services[0].associateCampaign({ ...request(a), campaignId: campaigns[1] });
      expect(await services[0].read(request(a))).toEqual(a);
      await expect(services[1].read(request(a))).rejects.toMatchObject({ code: "FORBIDDEN" });
      await client.query("DELETE FROM staff_city_access WHERE city_id=$1 AND staff_membership_id IN (SELECT id FROM staff_memberships WHERE user_id=$2)", [cities[1], users[0]]);
      for (const operation of [() => services[0].read(request(a)), () => services[0].history(request(a)), () => services[0].confirm(confirmation(a)), () => services[0].correct({ ...request(a), expectedRevision: 1, brief: citywalkBrief }), () => services[0].purge({ ...request(a), expectedRevision: 1, eraseHistory: true }), () => services[0].associateCampaign({ ...request(a), campaignId: campaigns[0] })]) await expect(operation()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(client.query("DELETE FROM citywalk_brand_projects WHERE project_id=$1 AND city_id=$2", [a.projectId, cities[1]])).rejects.toMatchObject({ code: "23514" });
      // Deleting the cross-city association directly cannot shrink retained scope.
      await client.query("DELETE FROM citywalk_brand_project_campaigns WHERE project_id=$1 AND campaign_id=$2", [a.projectId, campaigns[1]]);
      await expect(services[0].read(request(a))).rejects.toMatchObject({ code: "FORBIDDEN" });
      await client.query("INSERT INTO staff_city_access(staff_membership_id,city_id) SELECT id,$1 FROM staff_memberships WHERE user_id=$2", [cities[1], users[0]]);
      const results = await Promise.allSettled([services[0].confirm(confirmation(a)), services[0].confirm(confirmation(a))]);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      expect((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe("STALE_REVISION");
      expect(await services[0].history(request(a))).toHaveLength(2);
      await services[0].purge({ ...request(a), expectedRevision: 2, eraseHistory: true });
      expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_projects WHERE project_id=$1", [a.projectId])).rows[0].n).toBe(0);
      expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_project_campaigns WHERE project_id=$1", [a.projectId])).rows[0].n).toBe(0);
      expect((await client.query("SELECT count(*)::int n FROM brand_context_audit WHERE context_id=$1", [a.contextId])).rows[0].n).toBe(0);
      expect(await services[1].read(request(b))).toEqual(b);
    } finally { await client.query("DELETE FROM marketing_campaigns WHERE id=$1", [campaign]); }
  });
  it("refuses city deletion until explicit project erasure and rolls back campaign unlinking", async () => {
    const before = await services[0].history(request(a));
    await expect(client.query("DELETE FROM cities WHERE id=$1", [cities[0]])).rejects.toMatchObject({ code: "23503" });
    expect(await services[0].history(request(a))).toEqual(before);
    expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_project_campaigns WHERE project_id=$1", [a.projectId])).rows[0].n).toBe(1);
  });
  it("retains project history and scope when every associated campaign is deleted", async () => {
    const campaign = (await client.query("INSERT INTO marketing_campaigns(city_id,slug,name,objective,audience,message,cta) VALUES($1,$2,'Test','Test','Test','Test','Test') RETURNING id", [cities[0], randomUUID()])).rows[0].id;
    const context = await services[0].create({ campaignId: campaign, brief: citywalkBrief });
    try {
      await services[0].confirm(confirmation(context));
      const before = await services[0].history(request(context));
      await client.query("DELETE FROM marketing_campaigns WHERE id=$1", [campaign]);
      expect(await services[0].history(request(context))).toEqual(before);
      expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_project_campaigns WHERE project_id=$1", [context.projectId])).rows[0].n).toBe(0);
      expect((await client.query("SELECT count(*)::int n FROM citywalk_brand_projects WHERE project_id=$1", [context.projectId])).rows[0].n).toBe(1);
      await services[0].purge({ ...request(context), expectedRevision: 2, eraseHistory: true });
      expect((await client.query("SELECT count(*)::int n FROM brand_projects WHERE id=$1", [context.projectId])).rows[0].n).toBe(0);
    } finally {
      await client.query("DELETE FROM brand_projects WHERE id=$1", [context.projectId]);
      await client.query("DELETE FROM marketing_campaigns WHERE id=$1", [campaign]);
    }
    expect(await services[1].read(request(b))).toEqual(b);
  });
});
