import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import * as schema from "./schema";
import {
  createBrandContext,
  confirmBrandFacts,
  rawBusinessBriefSchema,
  brandContextSchema,
  type BrandContext,
} from "@marketing/core";
import { ApiError } from "./errors";
import type { PdfPreview } from "./intake/pdf";
export type Principal = { id: string };
export async function transaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export class ProjectStore {
  private db: NodePgDatabase<typeof schema>;
  constructor(readonly pool: Pool) {
    this.db = drizzle(pool, { schema });
  }
  async authorize(
    client: Pool | PoolClient,
    actor: Principal,
    projectId: string,
    write = false,
    lock = false,
  ) {
    const result = await client.query(
      `SELECT p.*, m.role FROM mkt_projects p JOIN mkt_memberships m ON m.organization_id=p.organization_id WHERE p.id=$1 AND m.user_id=$2 ${lock ? "FOR UPDATE OF p" : ""}`,
      [projectId, actor.id],
    );
    const row = result.rows[0];
    if (!row) throw new ApiError(404, "PROJECT_NOT_FOUND");
    if (write && row.role === "viewer") throw new ApiError(403, "READ_ONLY");
    return row;
  }
  async bootstrap(actor: Principal) {
    return transaction(this.pool, async (client) => {
      // Per-user lock prevents duplicate personal organizations in concurrent tabs.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [actor.id],
      );
      const existing = await client.query(
        "SELECT organization_id FROM mkt_memberships WHERE user_id=$1 ORDER BY organization_id",
        [actor.id],
      );
      if (existing.rowCount) return existing.rows[0].organization_id as string;
      const id = randomUUID();
      await client.query(
        "INSERT INTO mkt_organizations(id,name) VALUES($1,'Mein Unternehmen')",
        [id],
      );
      await client.query(
        "INSERT INTO mkt_memberships(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [id, actor.id],
      );
      return id;
    });
  }
  async list(actor: Principal) {
    return this.db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        organization_id: schema.projects.organizationId,
        revision: schema.projects.revision,
        role: schema.memberships.role,
      })
      .from(schema.projects)
      .innerJoin(
        schema.memberships,
        eq(schema.memberships.organizationId, schema.projects.organizationId),
      )
      .where(eq(schema.memberships.userId, actor.id))
      .orderBy(desc(schema.projects.createdAt));
  }
  async create(actor: Principal, name: string) {
    const organizationId = await this.bootstrap(actor);
    return transaction(this.pool, async (client) => {
      const membership = await client.query(
        "SELECT role FROM mkt_memberships WHERE organization_id=$1 AND user_id=$2 FOR UPDATE",
        [organizationId, actor.id],
      );
      if (!membership.rows[0] || membership.rows[0].role === "viewer")
        throw new ApiError(403, "READ_ONLY");
      const id = randomUUID();
      await client.query(
        "INSERT INTO mkt_projects(id,organization_id,name) VALUES($1,$2,$3)",
        [id, organizationId, name],
      );
      return { id, name, organization_id: organizationId, revision: 0 };
    });
  }
  async read(actor: Principal, projectId: string) {
    return transaction(this.pool, async (client) => {
      const project = await this.authorize(
        client,
        actor,
        projectId,
        false,
        true,
      );
      const revisions = await client.query(
        "SELECT revision,context,evidence FROM mkt_brand_versions WHERE project_id=$1 ORDER BY revision DESC",
        [projectId],
      );
      return {
        ...project,
        context: revisions.rows[0]?.context ?? null,
        evidence: revisions.rows[0]?.evidence ?? [],
        history: revisions.rows.map((r) => r.revision),
      };
    });
  }
  async revise(
    actor: Principal,
    projectId: string,
    expectedRevision: number,
    rawBrief: unknown,
    evidence: unknown[] = [],
  ) {
    const brief = rawBusinessBriefSchema.parse(rawBrief);
    return transaction(this.pool, async (client) => {
      const project = await this.authorize(
        client,
        actor,
        projectId,
        true,
        true,
      );
      if (project.revision !== expectedRevision)
        throw new ApiError(409, "STALE_REVISION");
      const timestamp = new Date().toISOString();
      const first = (
        await client.query(
          "SELECT context->>'createdAt' AS created_at FROM mkt_brand_versions WHERE project_id=$1 ORDER BY revision LIMIT 1",
          [projectId],
        )
      ).rows[0];
      const context = createBrandContext(brief, {
        contextId: projectId,
        projectId,
        briefSourceId: "manual-brief",
        createdAt: first?.created_at ?? timestamp,
      });
      context.revision = expectedRevision + 1;
      context.updatedAt = timestamp;
      // A correction starts a fresh evidence-bound review; no old approval survives.
      return this.append(client, actor, project, context, "revise", evidence);
    });
  }
  async appendDocument(actor: Principal, projectId: string, expectedRevision: number, preview: PdfPreview) {
    return transaction(this.pool, async client => {
      const project = await this.authorize(client, actor, projectId, true, true);
      if (project.revision !== expectedRevision || preview.expectedRevision !== expectedRevision) throw new ApiError(409, "STALE_REVISION");
      const row = (await client.query("SELECT context,evidence FROM mkt_brand_versions WHERE project_id=$1 AND revision=$2", [projectId, expectedRevision])).rows[0];
      const now = new Date().toISOString();
      const context = row ? brandContextSchema.parse(row.context) : createBrandContext({ rawText: 'Unternehmensprofil mit geprüfter Dokumentauswahl', identity: { name: project.name } }, {contextId: projectId, projectId, briefSourceId: 'manual-brief', createdAt: now});
      const added = preview.candidates.filter(c => !context.facts.some(f => f.id === c.id || f.statement === c.statement));
      if (!added.length) throw new ApiError(409, 'PDF_ALREADY_SAVED');
      if (context.facts.length + added.length > 100) throw new ApiError(422, 'PDF_CONTEXT_LIMIT');
      const sourceId = (page: number) => `document-${preview.digest}-p${page}`;
      const sources = [...new Set(added.map(c=>c.page))].filter(page=>!context.provenance.some(s=>s.id===sourceId(page))).map(page=>({id:sourceId(page),kind:'document' as const,label:`${preview.label} · Seite ${page}`.slice(0,200),observedAt:preview.extractedAt}));
      if (context.provenance.length + sources.length > 100) throw new ApiError(422, 'PDF_CONTEXT_LIMIT');
      const merged = brandContextSchema.parse({...context,revision:expectedRevision+1,updatedAt:now,
        provenance:[...context.provenance,...sources],missingInformation:context.missingInformation.filter(g=>g.field!=='facts'),
        facts:[...context.facts,...added.map(c=>({id:c.id,statement:c.statement,basis:'source_backed',provenanceIds:[sourceId(c.page)],confirmation:null}))]});
      return this.append(client,actor,project,merged,'revise',[
        ...(row?.evidence??[]),...added.map(c=>({factId:c.id,snippet:c.snippet,documentLabel:preview.label,page:c.page,documentDigest:preview.digest,extractedAt:preview.extractedAt,importStatus:'saved_unconfirmed'})),
      ]);
    });
  }
  async confirm(
    actor: Principal,
    projectId: string,
    expectedRevision: number,
    factIds: string[],
  ) {
    return transaction(this.pool, async (client) => {
      const project = await this.authorize(
        client,
        actor,
        projectId,
        true,
        true,
      );
      if (project.revision !== expectedRevision)
        throw new ApiError(409, "STALE_REVISION");
      const stored = await client.query(
        "SELECT context,evidence FROM mkt_brand_versions WHERE project_id=$1 AND revision=$2",
        [projectId, expectedRevision],
      );
      if (!stored.rows[0]) throw new ApiError(409, "BRIEF_REQUIRED");
      const context = confirmBrandFacts(
        stored.rows[0].context,
        { expectedRevision, factIds },
        { actorId: actor.id, confirmedAt: new Date().toISOString() },
      );
      return this.append(
        client,
        actor,
        project,
        context,
        "confirm",
        stored.rows[0].evidence,
      );
    });
  }
  private async append(
    client: PoolClient,
    actor: Principal,
    project: { id: string },
    context: BrandContext,
    action: string,
    evidence: unknown[],
  ) {
    brandContextSchema.parse(context);
    await client.query(
      "INSERT INTO mkt_brand_versions(project_id,revision,context,evidence,actor_id,action) VALUES($1,$2,$3,$4,$5,$6)",
      [
        project.id,
        context.revision,
        JSON.stringify(context),
        JSON.stringify(evidence),
        actor.id,
        action,
      ],
    );
    await client.query("UPDATE mkt_projects SET revision=$2 WHERE id=$1", [
      project.id,
      context.revision,
    ]);
    return context;
  }
}
