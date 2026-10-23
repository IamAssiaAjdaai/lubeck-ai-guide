import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { confirmBrandFacts, createBrandContext, type BrandContext } from "@marketing/core";

import { getDb, type Database } from "@/db/client";
import { staffCityAccess, staffMemberships, user } from "@/db/authSchema";
import { brandContextAudit, brandContextRevisions, brandContexts, brandProjects } from "@/db/brandContextSchema";
import { citywalkBrandProjects, citywalkBrandProjectCampaigns, citywalkBrandReviewers } from "@/db/citywalkBrandContextSchema";
import { marketingCampaignsTable } from "@/db/marketingSchema";
import { citiesTable } from "@/db/schema";
import { z } from "zod";
import { AdminAuthorizationError, requireAdminCapability, type AdminContext } from "@/lib/admin/authorization.server";
import { hasCityCapability, type AdminCapability } from "@/lib/admin/permissions";
import { associateRequest, canonicalJson, confirmRequest, correctRequest, createRequest, purgeRequest, readRequest, validateStoredContext } from "./validation";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export class BrandContextPersistenceError extends Error {
  constructor(readonly code: "NOT_FOUND" | "STALE_REVISION" | "INVALID_STORED_CONTEXT") {
    super(code);
    this.name = "BrandContextPersistenceError";
  }
}
const digest = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");

/** Server-only DI port for trusted host authentication, never request metadata. */
export function createBrandContextService(db: Database, authenticate: (capability: AdminCapability) => Promise<AdminContext>) {
  // Reload and lock active membership/scope in the SAME transaction as data access.
  // The authenticated user is authoritative; ignore role/scope supplied by callers.
  async function authorize(tx: Transaction, auth: AdminContext, cityId: number, capability: AdminCapability) {
    const [owner] = await tx.select({ id: user.id }).from(user).where(eq(user.id, auth.user.id)).for("share");
    const [member] = await tx.select().from(staffMemberships).where(eq(staffMemberships.userId, auth.user.id)).for("share");
    if (!owner || !member) throw new AdminAuthorizationError(403, "FORBIDDEN");
    const scopes = await tx.select().from(staffCityAccess).where(eq(staffCityAccess.staffMembershipId, member.id)).for("share");
    if (!hasCityCapability({ ...member, membershipId: member.id, cityIds: scopes.map(s => s.cityId) }, cityId, capability)) throw new AdminAuthorizationError(403, "FORBIDDEN");
  }
  async function actor(tx: Transaction, userId: string) {
    const [row] = await tx.insert(citywalkBrandReviewers).values({ actorId: randomUUID(), userId }).onConflictDoUpdate({ target: citywalkBrandReviewers.userId, set: { userId } }).returning();
    return row.actorId;
  }
  async function time(tx: Transaction) {
    const result = await tx.execute<{ now: string }>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS now`);
    return result.rows[0].now;
  }
  async function scope(tx: Transaction, projectId: string, auth: AdminContext, capability: AdminCapability) {
    // Lock the independent project before inspecting its entire durable scope.
    const [project] = await tx.select().from(brandProjects).where(eq(brandProjects.id, projectId)).for("update");
    if (!project) throw new BrandContextPersistenceError("NOT_FOUND");
    const bindings = await tx.select().from(citywalkBrandProjects).where(eq(citywalkBrandProjects.projectId, projectId)).orderBy(asc(citywalkBrandProjects.cityId));
    if (!bindings.length) throw new AdminAuthorizationError(403, "FORBIDDEN");
    for (const binding of bindings) await authorize(tx, auth, binding.cityId, capability);
  }

  function validate(row: typeof brandContextRevisions.$inferSelect) {
    try {
      const context = validateStoredContext(row.contextJson);
      if (context.contextId !== row.contextId || context.projectId !== row.projectId || context.revision !== row.revision || context.schemaVersion !== row.schemaVersion || digest(context) !== row.digest) throw new Error();
      return context;
    } catch { throw new BrandContextPersistenceError("INVALID_STORED_CONTEXT"); }
  }
  async function current(tx: Transaction, projectId: string, contextId: string) {
    const [row] = await tx.select({ revision: brandContextRevisions }).from(brandContexts)
      .innerJoin(brandContextRevisions, and(eq(brandContextRevisions.contextId, brandContexts.id), eq(brandContextRevisions.revision, brandContexts.currentRevision)))
      .where(and(eq(brandContexts.id, contextId), eq(brandContexts.projectId, projectId)));
    if (!row) throw new BrandContextPersistenceError("NOT_FOUND");
    return validate(row.revision);
  }
  async function append(tx: Transaction, context: BrandContext, event: typeof brandContextAudit.$inferInsert["event"], actorId: string, occurredAt: string, factIds: string[]) {
    await tx.insert(brandContextRevisions).values({ contextId: context.contextId, projectId: context.projectId, revision: context.revision, schemaVersion: context.schemaVersion, contextJson: { ...context }, digest: digest(context) });
    await tx.insert(brandContextAudit).values({ contextId: context.contextId, revision: context.revision, event, actorId, occurredAt: new Date(occurredAt), factIds });
  }
  async function advance(tx: Transaction, context: BrandContext, expectedRevision: number) {
    const rows = await tx.update(brandContexts).set({ currentRevision: expectedRevision + 1 }).where(and(eq(brandContexts.id, context.contextId), eq(brandContexts.projectId, context.projectId), eq(brandContexts.currentRevision, expectedRevision))).returning({ id: brandContexts.id });
    if (!rows.length) throw new BrandContextPersistenceError("STALE_REVISION");
  }
  return {
    async list(input: unknown = {}) {
      const auth = await authenticate("marketing:view");
      const request = z.strictObject({ after: z.uuid().optional() }).parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        const [account] = await tx.select().from(user).where(eq(user.id, auth.user.id)).for("share");
        const [member] = await tx.select().from(staffMemberships).where(eq(staffMemberships.userId, auth.user.id)).for("share");
        if (!account || !member || !member.active) throw new AdminAuthorizationError(403, "FORBIDDEN");
        const cityAccess = await tx.select().from(staffCityAccess).where(eq(staffCityAccess.staffMembershipId, member.id)).for("share");
        const access = { ...member, membershipId: member.id, cityIds: cityAccess.map(s => s.cityId) };
        const global = member.role === "super_admin" || member.globalAccess;
        const allowed = cityAccess.filter(s => hasCityCapability(access, s.cityId, "marketing:view")).map(s => s.cityId);
        if (!hasCityCapability(access, allowed[0] ?? 0, "marketing:view") && !allowed.length) return { items: [], next: null };
        const boundary = global ? sql`true` : allowed.length ? sql`NOT EXISTS (SELECT 1 FROM citywalk_brand_projects s WHERE s.project_id = ${brandProjects.id} AND s.city_id NOT IN (${sql.join(allowed.map(id => sql`${id}`), sql`, `)}))` : sql`false`;
        // Filter ALL scopes in SQL before even selecting context IDs. Never fetch private JSON first.
        const candidates = await tx.select({ projectId: brandProjects.id, contextId: brandContexts.id }).from(brandProjects)
          .innerJoin(brandContexts, eq(brandContexts.projectId, brandProjects.id))
          .where(and(sql`EXISTS (SELECT 1 FROM citywalk_brand_projects s WHERE s.project_id = ${brandProjects.id})`, boundary, request.after ? gt(brandProjects.id, request.after) : undefined))
          .orderBy(asc(brandProjects.id)).limit(21);
        const items: { projectId: string; contextId: string; name: string; revision: number }[] = [];
        for (const row of candidates) {
          try { await scope(tx, row.projectId, auth, "marketing:view"); }
          catch (error) { if (error instanceof AdminAuthorizationError || error instanceof BrandContextPersistenceError && error.code === "NOT_FOUND") continue; throw error; }
          const context = await current(tx, row.projectId, row.contextId);
          items.push({ ...row, name: context.identity.name, revision: context.revision });
        }
        return { items: items.slice(0, 20), next: items.length > 20 ? items[19].projectId : null };
      });
    },
    async workspace(input: unknown) {
      const auth = await authenticate("marketing:view"), request = readRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "marketing:view");
        const context = await current(tx, request.projectId, request.contextId);
        const scopes = await tx.select({ cityId: citiesTable.id, name: citiesTable.name }).from(citywalkBrandProjects)
          .innerJoin(citiesTable, eq(citiesTable.id, citywalkBrandProjects.cityId)).where(eq(citywalkBrandProjects.projectId, request.projectId)).orderBy(asc(citiesTable.id));
        const campaigns = await tx.select({ id: marketingCampaignsTable.id, name: marketingCampaignsTable.name, cityId: marketingCampaignsTable.cityId }).from(citywalkBrandProjectCampaigns)
          .innerJoin(marketingCampaignsTable, eq(marketingCampaignsTable.id, citywalkBrandProjectCampaigns.campaignId)).where(eq(citywalkBrandProjectCampaigns.projectId, request.projectId));
        const [member] = await tx.select().from(staffMemberships).where(eq(staffMemberships.userId, auth.user.id));
        const cityAccess = await tx.select().from(staffCityAccess).where(eq(staffCityAccess.staffMembershipId, member.id));
        const access = { ...member, membershipId: member.id, cityIds: cityAccess.map(s => s.cityId) };
        const rows = await tx.select({ revision: brandContextRevisions, audit: brandContextAudit }).from(brandContextRevisions)
          .innerJoin(brandContextAudit, and(eq(brandContextAudit.contextId, brandContextRevisions.contextId), eq(brandContextAudit.revision, brandContextRevisions.revision)))
          .where(eq(brandContextRevisions.contextId, request.contextId)).orderBy(desc(brandContextRevisions.revision)).limit(20);
        const history = rows.reverse().map(row => {
          const snapshot = validate(row.revision);
          return { revision: snapshot.revision, event: row.audit.event, actorId: row.audit.actorId, occurredAt: row.audit.occurredAt.toISOString(), facts: row.audit.factIds.map(id => snapshot.facts.find(f => f.id === id)!.statement) };
        });
        return { context, scopes, campaigns, history, historyTruncated: context.revision > 20,
          canManage: scopes.every(s => hasCityCapability(access, s.cityId, "marketing:manage")),
          canConfirm: scopes.every(s => hasCityCapability(access, s.cityId, "publishing:review")) };
      });
    },
    async create(input: unknown) {
      const auth = await authenticate("marketing:manage");
      const request = createRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        const [campaign] = await tx.select().from(marketingCampaignsTable).where(eq(marketingCampaignsTable.id, request.campaignId)).for("share");
        if (!campaign) throw new BrandContextPersistenceError("NOT_FOUND");
        await authorize(tx, auth, campaign.cityId, "marketing:manage");
        const now = await time(tx), actorId = await actor(tx, auth.user.id);
        const context = createBrandContext(request.brief, { contextId: randomUUID(), projectId: randomUUID(), briefSourceId: randomUUID(), createdAt: now });
        await tx.insert(brandProjects).values({ id: context.projectId });
        await tx.insert(citywalkBrandProjects).values({ projectId: context.projectId, cityId: campaign.cityId });
        await tx.insert(citywalkBrandProjectCampaigns).values({ projectId: context.projectId, campaignId: campaign.id, cityId: campaign.cityId });
        await tx.insert(brandContexts).values({ id: context.contextId, projectId: context.projectId, currentRevision: 1 });
        await append(tx, context, "created", actorId, now, []);
        return context;
      });
    },
    async associateCampaign(input: unknown) {
      const auth = await authenticate("marketing:manage"), request = associateRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "marketing:manage");
        await current(tx, request.projectId, request.contextId);
        const [campaign] = await tx.select().from(marketingCampaignsTable).where(eq(marketingCampaignsTable.id, request.campaignId)).for("share");
        if (!campaign) throw new BrandContextPersistenceError("NOT_FOUND");
        await authorize(tx, auth, campaign.cityId, "marketing:manage");
        await tx.insert(citywalkBrandProjects).values({ projectId: request.projectId, cityId: campaign.cityId }).onConflictDoNothing();
        await tx.insert(citywalkBrandProjectCampaigns).values({ projectId: request.projectId, campaignId: campaign.id, cityId: campaign.cityId }).onConflictDoNothing();
      });
    },
    async read(input: unknown) {
      const auth = await authenticate("marketing:view"), request = readRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "marketing:view");
        return current(tx, request.projectId, request.contextId);
      });
    },
    async history(input: unknown) {
      const auth = await authenticate("marketing:view"), request = readRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "marketing:view");
        await current(tx, request.projectId, request.contextId);
        const rows = await tx.select({ revision: brandContextRevisions, audit: brandContextAudit }).from(brandContextRevisions)
          .innerJoin(brandContextAudit, and(eq(brandContextAudit.contextId, brandContextRevisions.contextId), eq(brandContextAudit.revision, brandContextRevisions.revision)))
          .where(and(eq(brandContextRevisions.contextId, request.contextId), eq(brandContextRevisions.projectId, request.projectId))).orderBy(asc(brandContextRevisions.revision));
        return rows.map(row => ({ context: validate(row.revision), audit: row.audit }));
      });
    },
    async confirm(input: unknown) {
      const auth = await authenticate("publishing:review"), request = confirmRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "publishing:review");
        const context = await current(tx, request.projectId, request.contextId);
        if (context.revision !== request.command.expectedRevision) throw new BrandContextPersistenceError("STALE_REVISION");
        await advance(tx, context, request.command.expectedRevision);
        const now = await time(tx), actorId = await actor(tx, auth.user.id);
        const next = confirmBrandFacts(context, request.command, { actorId, confirmedAt: now });
        await append(tx, next, "facts_confirmed", actorId, now, request.command.factIds);
        return next;
      });
    },
    // Replace declared input in a NEW revision; clear every old approval.
    async correct(input: unknown) {
      const auth = await authenticate("marketing:manage"), request = correctRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "marketing:manage");
        const context = await current(tx, request.projectId, request.contextId);
        if (context.revision !== request.expectedRevision) throw new BrandContextPersistenceError("STALE_REVISION");
        await advance(tx, context, request.expectedRevision);
        const now = await time(tx), actorId = await actor(tx, auth.user.id);
        const next = validateStoredContext({ ...createBrandContext(request.brief, { contextId: context.contextId, projectId: context.projectId, briefSourceId: randomUUID(), createdAt: now }), createdAt: context.createdAt, revision: context.revision + 1 });
        await append(tx, next, "corrected", actorId, now, []);
        return next;
      });
    },
    // Deliberate complete erasure; history remains durable until this policy is used.
    async purge(input: unknown) {
      const auth = await authenticate("marketing:manage"), request = purgeRequest.parse(input);
      return db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
        await scope(tx, request.projectId, auth, "marketing:manage");
        if (auth.user.id !== auth.staff.userId) throw new AdminAuthorizationError(403, "FORBIDDEN");
        const [member] = await tx.select().from(staffMemberships).where(eq(staffMemberships.userId, auth.user.id));
        if (!member || !["admin", "super_admin"].includes(member.role)) throw new AdminAuthorizationError(403, "FORBIDDEN");
        // Lock the context via the same compare-and-swap used by writers.
        const context = await current(tx, request.projectId, request.contextId);
        if (context.revision !== request.expectedRevision) throw new BrandContextPersistenceError("STALE_REVISION");
        await advance(tx, context, request.expectedRevision);
        await tx.delete(brandProjects).where(eq(brandProjects.id, request.projectId));
      });
    },
  };
}
// No Server Actions or public endpoints; only trusted server callers can invoke this layer.
export const createPersistedBrandContext = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).create(input);
export const readPersistedBrandContext = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).read(input);
export const readBrandContextHistory = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).history(input);
export const confirmPersistedBrandFacts = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).confirm(input);
export const correctPersistedBrandContext = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).correct(input);
export const purgeBrandProject = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).purge(input);

export const associateBrandProjectCampaign = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).associateCampaign(input);

export const listBrandProjects = (input: unknown = {}) => createBrandContextService(getDb(), requireAdminCapability).list(input);
export const getBrandWorkspace = (input: unknown) => createBrandContextService(getDb(), requireAdminCapability).workspace(input);
