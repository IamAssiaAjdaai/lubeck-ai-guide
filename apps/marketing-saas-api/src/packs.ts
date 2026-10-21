import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getApprovedBrandFacts, brandContextSchema } from "@marketing/core";
import { ApiError } from "./errors";
import { ProjectStore, transaction, type Principal } from "./store";
import {
  assemblePack,
  campaignCommandSchema,
  editPackSchema,
  packMarkdown,
  type Pack,
  type PackInput,
} from "./pack.contract";
import {
  createPackProvider,
  maxOutputTokens,
  type PackProvider,
} from "./pack.provider";
import { packMessages, promptVersion } from "./pack.prompt";
export const plans = {
  starter: { price: 79, packs: 4, budget: 5_000_000 },
  growth: { price: 149, packs: 12, budget: 12_000_000 },
} as const;
const month = () => new Date().toISOString().slice(0, 7);
export class PackService {
  private store: ProjectStore;
  constructor(
    private pool: Pool,
    private demo = false,
    private providerFactory: () => PackProvider = () =>
      createPackProvider(demo),
    private globalBudget = 10_000_000,
  ) {
    this.store = new ProjectStore(pool);
  }
  private async rate(client: PoolClient, scope: string, limit: number) {
    const minute = Math.floor(Date.now() / 60000);
    const result = await client.query(
      "INSERT INTO mkt_rate_windows(scope,minute,total) VALUES($1,$2,1) ON CONFLICT(scope,minute) DO UPDATE SET total=mkt_rate_windows.total+1 RETURNING total",
      [scope, minute],
    );
    if (result.rows[0].total > limit) throw new ApiError(429, "RATE_LIMITED");
  }
  async usage(actor: Principal, projectId: string) {
    const project = await this.store.authorize(this.pool, actor, projectId);
    const result = await this.pool.query(
      "SELECT o.plan,u.packs,u.cost_micro_eur FROM mkt_organizations o LEFT JOIN mkt_usage_month u ON u.organization_id=o.id AND u.month=$2 WHERE o.id=$1",
      [project.organization_id, month()],
    );
    const row = result.rows[0],
      plan = plans[row.plan as keyof typeof plans];
    return {
      month: month(),
      plan: row.plan,
      allocation: plan.packs,
      used: row.packs ?? 0,
      remaining: Math.max(0, plan.packs - (row.packs ?? 0)),
      costEur: Number(row.cost_micro_eur ?? 0) / 1e6,
      budgetEur: plan.budget / 1e6,
      priceHypothesisExVat: plan.price,
      billing: "manual_invoice_only",
      demo: this.demo,
    };
  }
  async list(actor: Principal, projectId: string) {
    await this.store.authorize(this.pool, actor, projectId);
    return (
      await this.pool.query(
        "SELECT id,status,context_revision,provider,model,output_revision,created_at,error_code,cost_kind,input_tokens,output_tokens,cost_micro_eur,retries,input->>'goal' AS goal FROM mkt_generations WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100",
        [projectId],
      )
    ).rows;
  }
  async read(actor: Principal, projectId: string, generationId: string) {
    await this.store.authorize(this.pool, actor, projectId);
    const job = (
      await this.pool.query(
        "SELECT id,status,provider,model,context_revision,output_revision,error_code,cost_kind,cost_micro_eur,input_tokens,output_tokens,retries FROM mkt_generations WHERE id=$1 AND project_id=$2",
        [generationId, projectId],
      )
    ).rows[0];
    if (!job) throw new ApiError(404, "PACK_NOT_FOUND");
    const versions = (
      await this.pool.query(
        "SELECT version,content,created_at FROM mkt_pack_versions WHERE generation_id=$1 ORDER BY version DESC",
        [generationId],
      )
    ).rows;
    return { ...job, versions };
  }
  async generate(actor: Principal, projectId: string, raw: unknown) {
    const command = campaignCommandSchema.parse(raw);
    // Admission checks precede provider initialization and any side effect.
    const project = await this.store.authorize(
      this.pool,
      actor,
      projectId,
      true,
    );
    const hash = createHash("sha256")
      .update(JSON.stringify({ projectId, ...command }))
      .digest("hex");
    const prior = (
      await this.pool.query(
        "SELECT id,request_hash,status FROM mkt_generations WHERE organization_id=$1 AND idempotency_key=$2",
        [project.organization_id, command.idempotencyKey],
      )
    ).rows[0];
    if (prior) {
      if (prior.request_hash !== hash)
        throw new ApiError(409, "IDEMPOTENCY_CONFLICT");
      return this.read(actor, projectId, prior.id);
    }
    const provider = this.providerFactory();
    const reserved = await transaction(this.pool, async (client) => {
      const authorized = await this.store.authorize(
        client,
        actor,
        projectId,
        true,
        true,
      );
      if (authorized.revision !== command.expectedRevision)
        throw new ApiError(409, "STALE_REVISION");
      const stored = (
        await client.query(
          "SELECT context FROM mkt_brand_versions WHERE project_id=$1 AND revision=$2",
          [projectId, authorized.revision],
        )
      ).rows[0];
      if (!stored) throw new ApiError(409, "CONFIRMED_FACTS_REQUIRED");
      const context = brandContextSchema.parse(stored.context);
      const approved = getApprovedBrandFacts(context);
      if (!approved.length) throw new ApiError(409, "CONFIRMED_FACTS_REQUIRED");
      if (
        approved.length > 24 ||
        approved.some((f) => f.statement.length > 500)
      )
        throw new ApiError(422, "SHORTER_FACTS_REQUIRED");
      const input: PackInput = {
        businessName: context.identity.name,
        goal: command.goal,
        audience: command.audience,
        channels: command.channels,
        facts: approved.map((f) => ({
          id: f.id,
          statement: f.statement,
          sourceUrls: f.provenance.flatMap((p) =>
            p.locator ? [p.locator] : [],
          ),
        })),
      };
      const inputBound =
        Buffer.byteLength(JSON.stringify(packMessages(input))) + 1024;
      if (inputBound > 24000) throw new ApiError(422, "SHORTER_FACTS_REQUIRED");
      const estimated = Math.ceil(
        inputBound * provider.inputRate + maxOutputTokens * provider.outputRate,
      );
      if (
        !Number.isSafeInteger(estimated) ||
        estimated < 0 ||
        estimated > 750_000
      )
        throw new ApiError(503, "PER_PACK_COST_LIMIT");
      // Common global lock then organization lock: reservations/finalization serialize.
      await client.query("SELECT pg_advisory_xact_lock(745012322)");
      const existing = (
        await client.query(
          "SELECT id,request_hash FROM mkt_generations WHERE organization_id=$1 AND idempotency_key=$2",
          [authorized.organization_id, command.idempotencyKey],
        )
      ).rows[0];
      if (existing) {
        if (existing.request_hash !== hash)
          throw new ApiError(409, "IDEMPOTENCY_CONFLICT");
        return { existing: existing.id } as const;
      }
      const org = (
        await client.query(
          "SELECT plan FROM mkt_organizations WHERE id=$1 FOR UPDATE",
          [authorized.organization_id],
        )
      ).rows[0];
      const plan = plans[org.plan as keyof typeof plans];
      const period = month();
      await client.query(
        "INSERT INTO mkt_global_usage(month) VALUES($1) ON CONFLICT DO NOTHING",
        [period],
      );
      const global = (
        await client.query(
          "SELECT * FROM mkt_global_usage WHERE month=$1 FOR UPDATE",
          [period],
        )
      ).rows[0];
      if (
        global.blocked ||
        Number(global.cost_micro_eur) + estimated > this.globalBudget
      )
        throw new ApiError(429, "GLOBAL_BUDGET_EXHAUSTED");
      await client.query(
        "INSERT INTO mkt_usage_month(organization_id,month) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [authorized.organization_id, period],
      );
      const used = (
        await client.query(
          "SELECT * FROM mkt_usage_month WHERE organization_id=$1 AND month=$2 FOR UPDATE",
          [authorized.organization_id, period],
        )
      ).rows[0];
      if (
        used.packs >= plan.packs ||
        Number(used.cost_micro_eur) + estimated > plan.budget
      )
        throw new ApiError(429, "QUOTA_EXHAUSTED");
      const running = (
        await client.query(
          "SELECT count(*)::int AS n FROM mkt_generations WHERE organization_id=$1 AND status='running'",
          [authorized.organization_id],
        )
      ).rows[0].n;
      if (running >= 2) throw new ApiError(429, "CONCURRENT_LIMIT");
      await this.rate(client, "user:" + actor.id, 6);
      await this.rate(client, "org:" + authorized.organization_id, 12);
      const generationId = randomUUID();
      await client.query(
        "UPDATE mkt_usage_month SET packs=packs+1,cost_micro_eur=cost_micro_eur+$3 WHERE organization_id=$1 AND month=$2",
        [authorized.organization_id, period, estimated],
      );
      await client.query(
        "UPDATE mkt_global_usage SET cost_micro_eur=cost_micro_eur+$2 WHERE month=$1",
        [period, estimated],
      );
      await client.query(
        "INSERT INTO mkt_generations(id,organization_id,project_id,user_id,idempotency_key,request_hash,month,status,input,context_revision,provider,model,prompt_version,reserved_micro_eur,cost_micro_eur,monthly_allocation,monthly_budget_micro_eur) VALUES($1,$2,$3,$4,$5,$6,$7,'running',$8,$9,$10,$11,$12,$13,$13,$14,$15)",
        [
          generationId,
          authorized.organization_id,
          projectId,
          actor.id,
          command.idempotencyKey,
          hash,
          period,
          JSON.stringify(input),
          context.revision,
          provider.name,
          provider.model,
          promptVersion,
          estimated,
          plan.packs,
          plan.budget,
        ],
      );
      return {
        id: generationId,
        input,
        estimated,
        period,
        organizationId: authorized.organization_id,
      } as const;
    });
    if ("existing" in reserved)
      return this.read(actor, projectId, reserved.existing);
    let resolvedModel=provider.model;
    let content: Pack | undefined,
      inputTokens: number | null = null,
      outputTokens: number | null = null,
      cost = reserved.estimated,
      errorCode: string | undefined;
    try {
      const result = await provider.generate(reserved.input);
      if (
        !Number.isSafeInteger(result.inputTokens) ||
        result.inputTokens < 0 ||
        !Number.isSafeInteger(result.outputTokens) ||
        result.outputTokens < 0
      )
        throw new Error("INVALID_USAGE");
      if (provider.name === "openai" && result.inputTokens === 0)
        throw new Error("MISSING_PROVIDER_USAGE");
      if(result.model){if(result.model.length>200)throw new Error("INVALID_PROVIDER_MODEL");resolvedModel=result.model;}
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      cost = Math.ceil(
        inputTokens * provider.inputRate + outputTokens * provider.outputRate,
      );
      if (!Number.isSafeInteger(cost) || cost < 0)
        throw new Error("INVALID_COST");
      if (cost > reserved.estimated) throw new Error("RESERVATION_EXCEEDED");
      content = assemblePack(result.selection, reserved.input);
    } catch {
      errorCode = "GENERATION_FAILED";
    }
    // A transport failure may have incurred cost. Keep the full reservation and slot
    // until operator reconciliation; never grant unlimited retries by refunding it.
    await transaction(this.pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(745012322)");
      const delta = cost - reserved.estimated;
      await client.query(
        "UPDATE mkt_usage_month SET cost_micro_eur=cost_micro_eur+$3 WHERE organization_id=$1 AND month=$2",
        [reserved.organizationId, reserved.period, delta],
      );
      await client.query(
        "UPDATE mkt_global_usage SET cost_micro_eur=cost_micro_eur+$2,blocked=blocked OR $3 WHERE month=$1",
        [reserved.period, delta, cost > reserved.estimated],
      );
      await client.query(
        "UPDATE mkt_generations SET status=$2,cost_micro_eur=$3,input_tokens=$4,output_tokens=$5,cost_kind=$6,error_code=$7,output_revision=$8,model=$9,completed_at=now() WHERE id=$1",
        [
          reserved.id,
          content ? "completed" : "failed",
          cost,
          inputTokens,
          outputTokens,
          inputTokens === null
            ? "reserved_estimate"
            : "configured_rate_estimate",
          errorCode ?? null,
          content ? 1 : 0,
          resolvedModel,
        ],
      );
      if (content)
        await client.query(
          "INSERT INTO mkt_pack_versions(generation_id,version,content,actor_id) VALUES($1,1,$2,$3)",
          [reserved.id, JSON.stringify(content), actor.id],
        );
    });
    return this.read(actor, projectId, reserved.id);
  }
  async edit(
    actor: Principal,
    projectId: string,
    generationId: string,
    raw: unknown,
  ) {
    const command = editPackSchema.parse(raw);
    await transaction(this.pool, async (client) => {
      await this.store.authorize(client, actor, projectId, true, true);
      const job = (
        await client.query(
          "SELECT output_revision FROM mkt_generations WHERE id=$1 AND project_id=$2 FOR UPDATE",
          [generationId, projectId],
        )
      ).rows[0];
      if (!job) throw new ApiError(404, "PACK_NOT_FOUND");
      if (job.output_revision !== command.expectedVersion)
        throw new ApiError(409, "STALE_VERSION");
      const previous = (
        await client.query(
          "SELECT content FROM mkt_pack_versions WHERE generation_id=$1 AND version=$2",
          [generationId, command.expectedVersion],
        )
      ).rows[0]?.content as Pack | undefined;
      if (!previous) throw new ApiError(409, "PACK_NOT_READY");
      const content: Pack = {
        ...previous,
        posts: previous.posts.map((p, i) => ({ ...p, text: command.posts[i] })),
        hooks: command.hooks,
        cta: command.cta,
        editorialStatus: "human_edited",
      };
      const version = command.expectedVersion + 1;
      await client.query(
        "INSERT INTO mkt_pack_versions(generation_id,version,content,actor_id) VALUES($1,$2,$3,$4)",
        [generationId, version, JSON.stringify(content), actor.id],
      );
      await client.query(
        "UPDATE mkt_generations SET output_revision=$2 WHERE id=$1",
        [generationId, version],
      );
      await client.query(
        "INSERT INTO mkt_pack_events(id,generation_id,version,actor_id,event) VALUES($1,$2,$3,$4,'manual_edit')",
        [randomUUID(), generationId, version, actor.id],
      );
    });
    return this.read(actor, projectId, generationId);
  }
  async export(
    actor: Principal,
    projectId: string,
    generationId: string,
    version: number,
  ) {
    return transaction(this.pool, async (client) => {
      await this.store.authorize(client, actor, projectId, false, true);
      const job = (
        await client.query(
          "SELECT provider,model,output_revision FROM mkt_generations WHERE id=$1 AND project_id=$2 FOR UPDATE",
          [generationId, projectId],
        )
      ).rows[0];
      if (!job) throw new ApiError(404, "PACK_NOT_FOUND");
      if (job.output_revision !== version)
        throw new ApiError(409, "STALE_VERSION");
      const content = (
        await client.query(
          "SELECT content FROM mkt_pack_versions WHERE generation_id=$1 AND version=$2",
          [generationId, version],
        )
      ).rows[0]?.content as Pack | undefined;
      if (!content) throw new ApiError(409, "PACK_NOT_READY");
      await client.query(
        "INSERT INTO mkt_pack_events(id,generation_id,version,actor_id,event) VALUES($1,$2,$3,$4,'manual_export')",
        [randomUUID(), generationId, version, actor.id],
      );
      return {
        markdown: packMarkdown(content, job.provider, job.model, version),
      };
    });
  }
}
