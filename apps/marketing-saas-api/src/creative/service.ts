import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { brandContextSchema } from "@marketing/core";
import { ProjectStore, transaction, type Principal } from "../store";
import { ApiError } from "../errors";
import type { Pack } from "../pack.contract";
import {
  assetMetadata,
  imageCommand,
  initialState,
  kitSchema,
  limits,
  type Asset,
  type Brief,
  type CreativeState,
  type Job,
} from "./contract";
import { compose, digest, normalizeImage } from "./provider";
import { PrivateMedia } from "./storage";

import {
  applicationMockProvider,
  executeImageProvider,
  ImageProviderError,
  type CreativeImageProvider,
  type Reference,
} from "./image-adapter";
import {
  defaultGlobalImagePolicy,
  globalPolicySchema,
  type GlobalImagePolicy,
} from "./policy";
type ProjectRow = { organization_id: string; revision: number; role: string };
type Work = {
  projectId: string;
  client: PoolClient;
  project: ProjectRow;
  state: CreativeState;
  revision: number;
};
const fail = (code: string, status = 409): never => {
  throw new ApiError(status, code);
};
const month = (date: Date) => date.toISOString().slice(0, 7);
export class CreativeService {
  readonly store: ProjectStore;
  constructor(
    readonly pool: Pool,
    readonly media: PrivateMedia,
    readonly clock = () => new Date(),
    readonly options: {
      killSwitch?: () => boolean;
      global?: GlobalImagePolicy;
      provider?: CreativeImageProvider;
      timeoutMs?: number;
    } = {},
  ) {
    globalPolicySchema.parse(options.global ?? defaultGlobalImagePolicy);
    this.store = new ProjectStore(pool);
  }
  get imageProvider() {
    return this.options.provider?.id === "openai"
      ? ("openai" as const)
      : ("mock" as const);
  }
  private async work<T>(
    actor: Principal,
    projectId: string,
    action: string | null,
    fn: (w: Work) => Promise<T>,
  ): Promise<T> {
    return transaction(this.pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock_shared(745012324)");
      const project = (await this.store.authorize(
        client,
        actor,
        projectId,
        action !== null,
        true,
      )) as ProjectRow;
      // All creative operations follow the same project -> organization lock order.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 42))",
        [project.organization_id],
      );
      const row = (
        await client.query(
          "SELECT state,revision FROM mkt_creative_projects WHERE project_id=$1",
          [projectId],
        )
      ).rows[0];
      const w: Work = {
        projectId,
        client,
        project,
        state: row?.state ?? initialState(),
        revision: row?.revision ?? 0,
      };
      if (
        w.state.erasure &&
        action &&
        ![
          "creative_erasure",
          "media_cleanup",
          "creative_expiry",
          "local_job_recovery",
          "metadata_retention",
        ].includes(action)
      )
        fail("CREATIVE_ERASED");
      const recoveryBefore =
        action &&
        [
          "local_job_recovery",
          "creative_expiry",
          "media_cleanup",
          "creative_erasure",
          "metadata_retention",
        ].includes(action)
          ? digest(w.state)
          : null;
      const result = await fn(w);
      if (
        action &&
        (recoveryBefore === null || recoveryBefore !== digest(w.state))
      ) {
        await client.query(
          `INSERT INTO mkt_creative_projects(project_id,organization_id,revision,state) VALUES($1,$2,$3,$4)
          ON CONFLICT(project_id) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state`,
          [projectId, project.organization_id, w.revision + 1, w.state],
        );
        if (!w.state.erasure)
          await client.query(
            "INSERT INTO mkt_creative_versions(project_id,revision,actor_id,action,state) VALUES($1,$2,$3,$4,$5)",
            [projectId, w.revision + 1, actor.id, action, w.state],
          );
      }
      return result;
    });
  }
  private asset(state: CreativeState, id: string) {
    return (
      state.assets.find((a) => a.id === id && a.status !== "deleted") ??
      fail("ASSET_NOT_FOUND", 404)
    );
  }
  private async verifiedSource(asset: Asset) {
    try {
      const bytes = await this.media.read(asset.id);
      if (digest(bytes) !== asset.hash) fail("ASSET_INTEGRITY_FAILED");
      return bytes;
    } catch {
      return fail("ASSET_INTEGRITY_FAILED");
    }
  }
  private job(state: CreativeState, id: string) {
    return (
      state.jobs.find((j) => j.id === id) ?? fail("CREATIVE_NOT_FOUND", 404)
    );
  }
  private async snapshot(w: Work, raw: unknown): Promise<Brief> {
    const command = imageCommand.parse(raw);
    const generation = (
      await w.client.query(
        "SELECT context_revision,output_revision,status FROM mkt_generations WHERE id=$1 AND project_id=$2 AND organization_id=$3",
        [command.generationId, w.projectId, w.project.organization_id],
      )
    ).rows[0];
    if (
      !generation ||
      generation.status !== "completed" ||
      generation.output_revision !== command.expectedVersion ||
      generation.context_revision !== w.project.revision
    )
      fail("CREATIVE_SNAPSHOT_STALE");
    const contextRow = (
      await w.client.query(
        "SELECT context FROM mkt_brand_versions WHERE project_id=(SELECT project_id FROM mkt_generations WHERE id=$1) AND revision=$2",
        [command.generationId, w.project.revision],
      )
    ).rows[0];
    const context = brandContextSchema.parse(contextRow?.context);
    const pack: Pack = (
      await w.client.query(
        "SELECT content FROM mkt_pack_versions WHERE generation_id=$1 AND version=$2",
        [command.generationId, command.expectedVersion],
      )
    ).rows[0]?.content;
    const post = pack?.posts[command.postIndex];
    if (!post) fail("POST_NOT_FOUND", 404);
    const approved = context.facts.filter(
      (f) => f.confirmation && post.factIds.includes(f.id),
    );
    if (
      !approved.length ||
      post.factIds.some((id) => !approved.some((f) => f.id === id))
    )
      fail("CONFIRMED_FACTS_REQUIRED");
    if (
      command.creative?.operation === "generate" &&
      command.creative.referenceIds.length
    )
      fail("REFERENCES_REQUIRE_EDIT");
    if (
      command.creative?.operation === "edit" &&
      !command.creative.referenceIds.length
    )
      fail("EDIT_REFERENCE_REQUIRED");
    if (
      command.creative?.referenceIds.some(
        (id) => !w.state.kit.photoIds.includes(id),
      )
    )
      fail("APPROVED_ASSET_REQUIRED");
    const refs = [
      ...new Set(
        [
          w.state.kit.logoId,
          ...(command.creative?.referenceIds ?? w.state.kit.photoIds),
        ].filter((v): v is string => !!v),
      ),
    ].map((id) => this.asset(w.state, id));
    if (refs.some((a) => a.status !== "approved"))
      fail("APPROVED_ASSET_REQUIRED");
    for (const asset of refs) await this.verifiedSource(asset);
    return {
      schemaVersion: 1,
      ...(command.creative
        ? { creative: structuredClone(command.creative) }
        : {}),
      synthetic: true,
      objective: command.objective,
      ratio: command.ratio,
      facts: approved.map((f) => ({ id: f.id, statement: f.statement })),
      editorialText: post.text,
      constraints: [
        "Abstrakte Illustration, kein dokumentarisches Foto.",
        "Keine erfundenen Mitarbeiter, Räume, Produkte, Ergebnisse, Preise, Zertifikate oder Garantien.",
        "Post-Text ist redaktioneller Inhalt, keine verifizierte Tatsachenquelle.",
        "Referenzfotos bleiben Quellenmaterial; das Mock verwendet nur das freigegebene Logo.",
        "Nur manuelle Veröffentlichung nach gemeinsamer Bild- und Textprüfung.",
      ],
      kit: structuredClone(w.state.kit),
      binding: {
        generationId: command.generationId,
        version: command.expectedVersion,
        postIndex: command.postIndex,
        postHash: digest(post.text),
        contextRevision: w.project.revision,
        contextHash: digest(context),
        kitRevision: w.state.kit.revision,
        assets: refs.map((a) => ({
          id: a.id,
          revision: a.revision,
          hash: a.hash,
        })),
      },
    };
  }
  private async bound(w: Work, projectId: string, job: Job) {
    const b = job.brief.binding;
    const gen = await w.client.query(
      "SELECT id FROM mkt_generations WHERE id=$1 AND project_id=$2",
      [b.generationId, projectId],
    );
    if (!gen.rowCount) fail("CREATIVE_SNAPSHOT_STALE");
    const current = await this.snapshot(w, {
      generationId: b.generationId,
      expectedVersion: b.version,
      postIndex: b.postIndex,
      objective: job.brief.objective,
      ratio: job.brief.ratio,
      idempotencyKey: job.id,
      creative: job.brief.creative,
    });
    if (digest(current) !== digest(job.brief)) fail("CREATIVE_SNAPSHOT_STALE");
  }
  async read(actor: Principal, projectId: string) {
    return this.work(actor, projectId, null, async (w) => {
      const contextRow = (
        await w.client.query(
          "SELECT context FROM mkt_brand_versions WHERE project_id=$1 AND revision=$2",
          [projectId, w.project.revision],
        )
      ).rows[0];
      const context = contextRow
        ? brandContextSchema.parse(contextRow.context)
        : null;
      const charges = await w.client.query(
        `SELECT kind,count(*) FILTER(WHERE month=$2)::int AS attempts,COALESCE(sum(CASE WHEN uncertain THEN GREATEST(reserved_micro_eur,COALESCE(finalized_micro_eur,0)) ELSE finalized_micro_eur END) FILTER(WHERE month=$2 OR uncertain),0)::int AS committed, count(*) FILTER(WHERE uncertain)::int AS uncertain, count(*) FILTER(WHERE active)::int AS active FROM mkt_creative_charges WHERE organization_id=$1 GROUP BY kind`,
        [w.project.organization_id, month(this.clock())],
      );
      // Binding checks are computed rather than persisted, so old approvals stay auditable.
      const jobs = [];
      for (const job of w.state.jobs) {
        let stale = false;
        try {
          await this.bound(w, projectId, job);
        } catch {
          stale = true;
        }
        const expired = this.clock().getTime() >= Date.parse(job.expiresAt);
        const legacyDisclosure =
          job.kind === "image" &&
          job.state === "completed" &&
          job.disclosureVersion !== (job.provider === "openai" ? 3 : 2);
        stale ||= legacyDisclosure;
        const available =
          job.state === "completed" && !!job.outputKey && !expired && !stale;
        const { outputKey: _key, review, ...publicJob } = job;
        void _key;
        jobs.push({
          ...publicJob,
          state:
            expired && ["completed", "queued", "processing"].includes(job.state)
              ? "expired"
              : job.state,
          reviewed: !!review && available,
          stale,
          legacyDisclosure,
          attached: !!job.attached && available,
          expired,
        });
      }
      return {
        erasure: w.state.erasure,
        revision: w.revision,
        kit: w.state.kit,
        assets: w.state.assets.filter((a) => a.status !== "deleted"),
        jobs,
        contextRevision: w.project.revision,
        facts: w.state.erasure
          ? []
          : (context?.facts
              .filter((f) => f.confirmation)
              .map((f) => ({ id: f.id, statement: f.statement })) ?? []),
        usage: {
          limits,
          entries: charges.rows,
          simulation: this.imageProvider === "mock",
        },
        localOnly: true,
        provider: this.options.provider?.id === "openai" ? "openai" : "mock",
      };
    });
  }
  async saveKit(actor: Principal, projectId: string, raw: unknown) {
    const command = kitSchema.parse(raw);
    return this.work(actor, projectId, "brand_kit", async (w) => {
      if (w.state.kit.revision !== command.expectedRevision)
        fail("BRAND_KIT_STALE");
      if (command.logoId) {
        const a = this.asset(w.state, command.logoId);
        if (a.status !== "approved" || a.role !== "logo")
          fail("APPROVED_LOGO_REQUIRED");
      }
      for (const id of command.photoIds) {
        const a = this.asset(w.state, id);
        if (a.status !== "approved" || a.role !== "business_photo")
          fail("APPROVED_PHOTO_REQUIRED");
      }
      const { expectedRevision, ...kit } = command;
      w.state.kit = { ...kit, revision: expectedRevision + 1 };
      return w.state.kit;
    });
  }
  async upload(
    actor: Principal,
    projectId: string,
    bytes: Buffer,
    mime: string,
  ) {
    // Authorize before decoding; normalized file is private and ownership comes from the session.
    await this.store.authorize(this.pool, actor, projectId, true);
    let normalized: Awaited<ReturnType<typeof normalizeImage>>;
    try {
      normalized = await normalizeImage(bytes, mime);
    } catch {
      fail("IMAGE_UPLOAD_REJECTED", 400);
    }
    const key = randomUUID();
    try {
      return await this.work(actor, projectId, "asset_upload", async (w) => {
        if (w.state.assets.filter((a) => a.status !== "deleted").length >= 50)
          fail("MEDIA_LIBRARY_LIMIT", 429);
        await this.media.write(key, normalized.data);
        const asset: Asset = {
          id: key,
          revision: 1,
          name: "Neues QA-Bild",
          alt: "Noch nicht beschrieben",
          role: "business_photo",
          origin: "owner_uploaded",
          rights: "owner_declared",
          status: "pending",
          hash: digest(normalized.data),
          bytes: normalized.data.length,
          width: normalized.info.width,
          height: normalized.info.height,
          createdAt: this.clock().toISOString(),
        };
        w.state.assets.push(asset);
        return asset;
      });
    } catch (e) {
      await this.media.remove(key);
      throw e;
    }
  }
  async metadata(
    actor: Principal,
    projectId: string,
    assetId: string,
    raw: unknown,
  ) {
    const command = assetMetadata.parse(raw);
    return this.work(actor, projectId, "asset_metadata", async (w) => {
      const a = this.asset(w.state, assetId);
      if (a.revision !== command.expectedRevision) fail("ASSET_REVISION_STALE");
      Object.assign(a, {
        name: command.name,
        alt: command.alt,
        role: command.role,
        revision: a.revision + 1,
        status: "pending",
      });
      delete a.approvedBy;
      delete a.approvedAt;
      return a;
    });
  }
  async approveAsset(
    actor: Principal,
    projectId: string,
    assetId: string,
    raw: unknown,
  ) {
    const c = z
      .strictObject({
        expectedRevision: z.number().int().positive(),
        rightsConfirmed: z.literal(true),
        sourceConfirmed: z.literal(true),
      })
      .parse(raw);
    return this.work(actor, projectId, "asset_approval", async (w) => {
      const a = this.asset(w.state, assetId);
      if (
        a.revision !== c.expectedRevision ||
        a.alt === "Noch nicht beschrieben"
      )
        fail("ASSET_REVIEW_REQUIRED");
      await this.verifiedSource(a);
      a.revision++;
      a.status = "approved";
      a.approvedBy = actor.id;
      a.approvedAt = this.clock().toISOString();
      return a;
    });
  }
  async deleteAsset(
    actor: Principal,
    projectId: string,
    assetId: string,
    raw: unknown,
  ) {
    const c = z
      .strictObject({ expectedRevision: z.number().int().positive() })
      .parse(raw);
    await this.work(actor, projectId, "asset_delete", async (w) => {
      const a =
        w.state.assets.find((a) => a.id === assetId) ??
        fail("ASSET_NOT_FOUND", 404);
      if (a.status === "deleted") {
        if (![a.revision, a.revision - 1].includes(c.expectedRevision))
          fail("ASSET_REVISION_STALE");
      } else {
        if (a.revision !== c.expectedRevision) fail("ASSET_REVISION_STALE");
        a.revision++;
        a.status = "deleted";
        a.deletedAt = this.clock().toISOString();
        a.name = "Gelöschtes QA-Medium";
        a.alt = "Gelöscht";
      }
      w.state.pendingDeletes = [
        ...new Set([...(w.state.pendingDeletes ?? []), assetId]),
      ];
    });
    const result = await this.drainDeletes(actor, projectId);
    return { deleted: true, cleanupPending: result.pending > 0 };
  }
  async assetBytes(actor: Principal, projectId: string, assetId: string) {
    return this.work(actor, projectId, null, async (w) => ({
      bytes: await this.verifiedSource(this.asset(w.state, assetId)),
      mime: "image/png",
    }));
  }
  async drainDeletes(actor: Principal, projectId: string) {
    return this.work(actor, projectId, "media_cleanup", async (w) => {
      const pending = w.state.pendingDeletes ?? [],
        remaining: string[] = [];
      let removed = 0;
      for (const key of pending) {
        const owned =
          !!w.state.erasure ||
          w.state.assets.some((a) => a.id === key && a.status === "deleted") ||
          w.state.jobs.some(
            (j) => j.outputKey === key && j.state === "expired",
          );
        const live =
          w.state.assets.some((a) => a.id === key && a.status !== "deleted") ||
          w.state.jobs.some(
            (j) => j.outputKey === key && j.state !== "expired",
          );
        if (!owned || live) {
          remaining.push(key);
          continue;
        }
        try {
          await this.media.remove(key);
          removed++;
          for (const j of w.state.jobs)
            if (j.outputKey === key && j.state === "expired")
              delete j.outputKey;
        } catch {
          remaining.push(key);
        }
      }
      w.state.pendingDeletes = remaining;
      if (
        w.state.erasure &&
        !remaining.length &&
        !w.state.erasure.completedAt
      ) {
        w.state.erasure.completedAt = this.clock().toISOString();
        await w.client.query(
          "UPDATE mkt_creative_erasures SET completed_at=$2 WHERE project_id=$1",
          [projectId, this.clock()],
        );
      }
      return { removed, pending: remaining.length };
    });
  }
  async previewBrief(actor: Principal, projectId: string, raw: unknown) {
    return this.work(actor, projectId, null, async (w) => {
      if (w.state.erasure) fail("CREATIVE_ERASED");
      const brief = await this.snapshot(w, raw);
      return { brief, briefHash: digest(brief) };
    });
  }
  /** Explicit owner-only Creative erasure; original v1 business/Pack records are outside this scope. */
  async eraseCreative(actor: Principal, projectId: string, raw: unknown) {
    const c = z
      .strictObject({
        expectedRevision: z.number().int().min(0),
        idempotencyKey: z.uuid(),
        confirmation: z.literal("CREATIVE_QA_LOESCHEN"),
      })
      .parse(raw);
    await this.work(actor, projectId, "creative_erasure", async (w) => {
      if (w.project.role !== "owner") fail("OWNER_REQUIRED", 403);
      const requestHash = digest(c);
      const previous = (
        await w.client.query(
          "SELECT request_hash FROM mkt_creative_erasures WHERE project_id=$1",
          [projectId],
        )
      ).rows[0];
      if (previous) {
        if (previous.request_hash !== requestHash) fail("IDEMPOTENCY_CONFLICT");
        return;
      }
      if (c.expectedRevision !== w.revision) fail("CREATIVE_REVISION_STALE");
      const versions = await w.client.query(
        "DELETE FROM mkt_creative_versions WHERE project_id=$1",
        [projectId],
      );
      if ((await w.client.query("SELECT to_regclass('public.mkt_workspace_reviews') AS name")).rows[0].name)
        await w.client.query("DELETE FROM mkt_workspace_reviews WHERE image IS NOT NULL AND generation_id IN (SELECT id FROM mkt_generations WHERE project_id=$1)",[projectId]);
      const keys = [
        ...new Set([
          ...w.state.assets.map((a) => a.id),
          ...w.state.jobs.flatMap((j) => (j.outputKey ? [j.outputKey] : [])),
          ...(w.state.pendingDeletes ?? []),
        ]),
      ];
      await w.client.query(
        "INSERT INTO mkt_creative_erasures(project_id,organization_id,request_hash,requested_at,erased_versions,erased_assets,erased_jobs) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          projectId,
          w.project.organization_id,
          requestHash,
          this.clock(),
          versions.rowCount,
          w.state.assets.length,
          w.state.jobs.length,
        ],
      );
      await w.client.query(
        "UPDATE mkt_creative_charges SET metadata_erased_at=$2 WHERE project_id=$1",
        [projectId, this.clock()],
      );
      w.state = {
        ...initialState(),
        pendingDeletes: keys,
        erasure: { requestedAt: this.clock().toISOString(), policyVersion: 1 },
      };
    });
    const cleanup = await this.drainDeletes(actor, projectId);
    await this.work(actor, projectId, "creative_erasure", async (w) => {
      if (!w.state.pendingDeletes?.length && !w.state.erasure!.completedAt) {
        w.state.erasure!.completedAt = this.clock().toISOString();
        await w.client.query(
          "UPDATE mkt_creative_erasures SET completed_at=$2 WHERE project_id=$1",
          [projectId, this.clock()],
        );
      }
    });
    return {
      erased: true,
      pendingFiles: cleanup.pending,
      downloadedCopiesRecallable: false,
    };
  }
  /** Owner-scoped rolling retention. This deliberately removes expired private snapshots, never edits them in place. */
  async retainMetadata(actor: Principal, projectId: string) {
    return this.work(actor, projectId, "metadata_retention", async (w) => {
      if (w.project.role !== "owner") fail("OWNER_REQUIRED", 403);
      const cutoff = new Date(+this.clock() - 30 * 86400000);

      const assets = w.state.assets.filter(
        (a) =>
          a.status === "deleted" &&
          a.deletedAt &&
          Date.parse(a.deletedAt) < +cutoff &&
          !w.state.pendingDeletes?.includes(a.id),
      );
      const jobs = w.state.jobs.filter(
        (j) =>
          Date.parse(j.expiresAt) < +cutoff &&
          !j.outputKey &&
          !["queued", "processing"].includes(j.state),
      );
      const versions = await w.client.query(
        "DELETE FROM mkt_creative_versions WHERE project_id=$1 AND (revision<>$2 OR $4) AND created_at<$3",
        [projectId, w.revision, cutoff, !!(assets.length || jobs.length)],
      );
      if (assets.length) {
        const ids = new Set(assets.map((a) => a.id));
        if (
          (w.state.kit.logoId && ids.has(w.state.kit.logoId)) ||
          w.state.kit.photoIds.some((id) => ids.has(id))
        ) {
          w.state.kit = {
            ...w.state.kit,
            logoId:
              w.state.kit.logoId && ids.has(w.state.kit.logoId)
                ? null
                : w.state.kit.logoId,
            photoIds: w.state.kit.photoIds.filter((id) => !ids.has(id)),
            revision: w.state.kit.revision + 1,
          };
        }
      }
      if (jobs.length)
        await w.client.query(
          "UPDATE mkt_creative_charges SET metadata_erased_at=COALESCE(metadata_erased_at,$2) WHERE id=ANY($1::uuid[])",
          [jobs.map((j) => j.id), this.clock()],
        );
      w.state.assets = w.state.assets.filter((a) => !assets.includes(a));
      w.state.jobs = w.state.jobs.filter((j) => !jobs.includes(j));
      const counts = {
        versions: versions.rowCount ?? 0,
        assets: assets.length,
        jobs: jobs.length,
      };
      if (Object.values(counts).some(Boolean))
        await w.client.query(
          "INSERT INTO mkt_creative_retention_events(id,project_id,created_at,erased_versions,erased_assets,erased_jobs) VALUES($1,$2,$3,$4,$5,$6)",
          [
            randomUUID(),
            projectId,
            this.clock(),
            counts.versions,
            counts.assets,
            counts.jobs,
          ],
        );
      const old = new Date(+this.clock() - 90 * 86400000);
      await w.client.query(
        "UPDATE mkt_creative_erasures SET erased_versions=0,erased_assets=0,erased_jobs=0 WHERE project_id=$1 AND completed_at<$2",
        [projectId, old],
      );
      await w.client.query(
        "DELETE FROM mkt_creative_retention_events WHERE project_id=$1 AND created_at<$2",
        [projectId, old],
      );
      await w.client.query(
        "DELETE FROM mkt_creative_charges WHERE project_id=$1 AND metadata_erased_at IS NOT NULL AND NOT uncertain AND NOT active AND created_at<$2 AND month<$3",
        [projectId, old, month(this.clock())],
      );
      return counts;
    });
  }
  async enqueue(
    actor: Principal,
    projectId: string,
    kind: Job["kind"],
    raw: unknown,
  ) {
    const command = imageCommand.parse(raw);
    return this.work(actor, projectId, "creative_reserve", async (w) => {
      if (kind === "image" && this.options.killSwitch?.())
        fail("CREATIVE_KILL_SWITCH", 503);
      const requestHash = digest({ projectId, kind, command });
      const prior = (
        await w.client.query(
          "SELECT * FROM mkt_creative_charges WHERE organization_id=$1 AND kind=$2 AND idempotency_key=$3",
          [w.project.organization_id, kind, command.idempotencyKey],
        )
      ).rows[0];
      if (prior) {
        if (
          prior.request_hash !== requestHash ||
          prior.project_id !== projectId
        )
          fail("IDEMPOTENCY_CONFLICT");
        return this.job(w.state, prior.id);
      }
      const gen = (
        await w.client.query(
          "SELECT id FROM mkt_generations WHERE id=$1 AND project_id=$2",
          [command.generationId, projectId],
        )
      ).rows[0];
      if (!gen) fail("PACK_NOT_FOUND", 404);
      const brief = await this.snapshot(w, command);
      if (kind === "image" && this.imageProvider === "openai") {
        if (
          !command.creative ||
          command.creative.operation !== "generate" ||
          command.creative.referenceIds.length ||
          command.creative.outputFormat !== "png"
        )
          fail("LIVE_IMAGE_TEXT_ONLY_PNG_REQUIRED");
        if (command.reviewedBriefHash !== digest(brief))
          fail("CREATIVE_BRIEF_REVIEW_REQUIRED");
      }
      if (command.creative && command.reviewedBriefHash !== digest(brief))
        fail("CREATIVE_BRIEF_REVIEW_REQUIRED");
      if (kind === "image") {
        await w.client.query("SELECT pg_advisory_xact_lock(745012325)");
        const global = (
          await w.client.query(
            `SELECT count(*) FILTER(WHERE month=$1)::int AS attempts,
        count(*) FILTER(WHERE active)::int AS active,
        COALESCE(sum(CASE WHEN uncertain THEN GREATEST(reserved_micro_eur,COALESCE(finalized_micro_eur,0)) ELSE finalized_micro_eur END) FILTER(WHERE month=$1 OR uncertain),0)::bigint AS committed FROM mkt_creative_charges WHERE kind='image'`,
            [month(this.clock())],
          )
        ).rows[0];
        const cap = this.options.global ?? defaultGlobalImagePolicy;
        if (
          global.attempts >= cap.attempts ||
          global.active >= cap.concurrent ||
          Number(global.committed) + limits.image.reservation > cap.budget
        )
          fail("CREATIVE_GLOBAL_LIMIT", 429);
      }
      const usage = (
        await w.client.query(
          `SELECT count(*) FILTER(WHERE month=$2)::int AS attempts,
        COALESCE(sum(CASE WHEN uncertain THEN GREATEST(reserved_micro_eur,COALESCE(finalized_micro_eur,0)) ELSE finalized_micro_eur END) FILTER(WHERE month=$2 OR uncertain),0)::int AS committed,
        count(*) FILTER(WHERE active)::int AS active FROM mkt_creative_charges WHERE organization_id=$1 AND kind=$3`,
          [w.project.organization_id, month(this.clock()), kind],
        )
      ).rows[0];
      const l = limits[kind];
      if (
        usage.attempts >= l.attempts ||
        usage.committed + l.reservation > l.budget ||
        usage.active >= l.concurrent ||
        w.state.jobs.length >= 500
      )
        fail("CREATIVE_QUOTA_EXCEEDED", 429);
      const now = this.clock();
      const job: Job = {
        id: randomUUID(),
        kind,
        state: "queued",
        provider:
          kind === "image" && this.options.provider?.id === "openai"
            ? "openai"
            : "mock",
        createdAt: now.toISOString(),
        phaseAt: now.toISOString(),
        expiresAt: new Date(+now + 24 * 60 * 60 * 1000).toISOString(),
        providerPending: false,
        brief,
      };
      await w.client.query(
        "INSERT INTO mkt_creative_charges(id,organization_id,project_id,kind,month,idempotency_key,request_hash,reserved_micro_eur) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          job.id,
          w.project.organization_id,
          projectId,
          kind,
          month(now),
          command.idempotencyKey,
          requestHash,
          l.reservation,
        ],
      );
      w.state.jobs.push(job);
      return job;
    });
  }
  private async settle(w: Work, job: Job, known: boolean, cost = 0) {
    // Unknown vendor costs keep BOTH reservation and concurrency until operator reconciliation.
    await w.client.query(
      "UPDATE mkt_creative_charges SET uncertain=$2,active=$2,finalized_micro_eur=$3 WHERE id=$1",
      [job.id, !known, known ? cost : null],
    );
    job.providerPending = !known;
  }
  async processImage(actor: Principal, projectId: string, jobId: string) {
    const claimed = await this.work(
      actor,
      projectId,
      "image_start",
      async (w) => {
        const j = this.job(w.state, jobId);
        if (j.kind !== "image") fail("WRONG_CREATIVE_KIND");
        if (j.state !== "queued") return null;
        if (this.options.killSwitch?.()) {
          j.state = "failed";
          j.error = "CREATIVE_KILL_SWITCH";
          await this.settle(w, j, true);
          return null;
        }
        if (this.clock().getTime() >= Date.parse(j.expiresAt)) {
          j.state = "expired";
          await this.settle(w, j, true);
          return null;
        }
        try {
          await this.bound(w, projectId, j);
        } catch {
          j.state = "failed";
          j.error = "CREATIVE_SNAPSHOT_STALE";
          await this.settle(w, j, true);
          return null;
        }
        j.state = "processing";
        j.providerPending = true;
        const logo = j.brief.kit.logoId
          ? await this.verifiedSource(this.asset(w.state, j.brief.kit.logoId))
          : undefined;
        j.phaseAt = this.clock().toISOString();
        const references: Reference[] = [];
        for (const id of j.brief.creative?.referenceIds ?? []) {
          const asset = this.asset(w.state, id);
          references.push({
            id,
            hash: asset.hash,
            role: asset.role,
            bytes: await this.verifiedSource(asset),
          });
        }
        return { job: structuredClone(j), logo, references };
      },
    );
    if (!claimed) return;
    let output: Buffer;
    let providerOutputHash: string | undefined;
    let providerModel: string | undefined;
    // After dispatch, local composition/storage/cancellation never proves a vendor charge was zero.
    let knownZero = claimed.job.provider === "mock";
    try {
      const provider = this.options.provider ?? applicationMockProvider;
      if ((provider.id === "openai") !== (claimed.job.provider === "openai"))
        throw new ImageProviderError("IMAGE_PROVIDER_CHANGED", "known_zero");
      const result = await executeImageProvider(
        provider,
        {
          brief: claimed.job.brief,
          references: claimed.references,
          idempotencyKey: claimed.job.id,
          maximumChargeMicroEur: limits.image.reservation,
        },
        this.options.timeoutMs,
      );
      knownZero = result.charge === "known_zero";
      providerModel = result.providerModel;
      providerOutputHash = result.providerOutputHash ?? digest(result.bytes);
      output = await compose(
        claimed.job.brief,
        result.bytes,
        claimed.logo,
        result.mock,
      );
    } catch (error) {
      await this.work(actor, projectId, "image_failed", async (w) => {
        const j = this.job(w.state, jobId);
        if (j.error === "LOCAL_JOB_INTERRUPTED") return;
        if (j.state !== "cancelled") j.state = "failed";
        j.error =
          error instanceof ImageProviderError
            ? error.code
            : j.provider === "openai"
              ? "IMAGE_COMPOSITION_FAILED"
              : "MOCK_RENDER_FAILED";
        await this.settle(
          w,
          j,
          error instanceof ImageProviderError
            ? error.charge === "known_zero"
            : knownZero,
        );
      });
      return;
    }
    await this.work(actor, projectId, "image_complete", async (w) => {
      const j = this.job(w.state, jobId);
      if (j.error === "LOCAL_JOB_INTERRUPTED") return; // recovery never silently finalizes an unknown hold
      if (this.options.killSwitch?.()) {
        j.state = "failed";
        j.error = "CREATIVE_KILL_SWITCH";
        await this.settle(w, j, knownZero);
        return;
      }
      if (
        j.state !== "processing" ||
        this.clock().getTime() >= Date.parse(j.expiresAt)
      ) {
        if (j.state !== "cancelled") j.state = "expired";
        await this.settle(w, j, knownZero);
        return;
      }
      try {
        await this.bound(w, projectId, j);
      } catch {
        j.state = "failed";
        j.error = "CREATIVE_SNAPSHOT_STALE";
        await this.settle(w, j, knownZero);
        return;
      }
      const key = randomUUID();
      await this.media.write(key, output);
      j.outputKey = key;
      j.outputHash = digest(output);
      j.outputMime = "image/png";
      j.disclosureVersion = j.provider === "openai" ? 3 : 2;
      j.providerOutputHash = providerOutputHash;
      j.providerModel = providerModel;
      j.state = "completed";
      await this.settle(w, j, knownZero);
    });
  }
  async review(
    actor: Principal,
    projectId: string,
    jobId: string,
    raw: unknown,
  ) {
    const c = z
      .strictObject({
        outputHash: z.string().regex(/^[a-f0-9]{64}$/),
        imageReviewed: z.literal(true),
        textReviewed: z.literal(true),
        syntheticAcknowledged: z.literal(true),
      })
      .parse(raw);
    return this.work(actor, projectId, "creative_review", async (w) => {
      const j = this.job(w.state, jobId);
      await this.ready(w, projectId, j);
      if (j.kind !== "image" || j.outputHash !== c.outputHash)
        fail("CREATIVE_REVIEW_STALE");
      j.review = {
        bindingHash: digest({ brief: j.brief, outputHash: j.outputHash }),
        actor: actor.id,
        at: this.clock().toISOString(),
      };
      return { reviewed: true };
    });
  }
  private async ready(w: Work, projectId: string, j: Job) {
    if (
      j.state !== "completed" ||
      !j.outputKey ||
      this.clock().getTime() >= Date.parse(j.expiresAt)
    )
      fail("CREATIVE_UNAVAILABLE");
    if (
      j.kind === "image" &&
      j.disclosureVersion !== (j.provider === "openai" ? 3 : 2)
    )
      fail("MOCK_DISCLOSURE_REGENERATION_REQUIRED");
    await this.bound(w, projectId, j);
  }
  private approved(j: Job) {
    if (
      !j.review ||
      j.review.bindingHash !==
        digest({ brief: j.brief, outputHash: j.outputHash })
    )
      fail("CREATIVE_REVIEW_REQUIRED");
  }
  async attach(actor: Principal, projectId: string, jobId: string) {
    return this.work(actor, projectId, "creative_attach", async (w) => {
      const j = this.job(w.state, jobId);
      await this.ready(w, projectId, j);
      this.approved(j);
      for (const old of w.state.jobs)
        if (
          old.brief.binding.generationId === j.brief.binding.generationId &&
          old.brief.binding.postIndex === j.brief.binding.postIndex
        )
          old.attached = false;
      j.attached = true;
      return { attached: true };
    });
  }
  async output(
    actor: Principal,
    projectId: string,
    jobId: string,
    exporting = false,
  ) {
    return this.work(
      actor,
      projectId,
      exporting ? "creative_export" : null,
      async (w) => {
        const j = this.job(w.state, jobId);
        await this.ready(w, projectId, j);
        if (exporting) {
          this.approved(j);
          if (!j.attached) fail("CREATIVE_ATTACHMENT_REQUIRED");
        }
        let bytes: Buffer;
        try {
          bytes = await this.media.read(j.outputKey!);
        } catch {
          return fail("CREATIVE_OUTPUT_INTEGRITY_FAILED");
        }
        if (digest(bytes) !== j.outputHash)
          fail("CREATIVE_OUTPUT_INTEGRITY_FAILED");
        return {
          bytes,
          mime: j.outputMime!,
          metadata: {
            manifestVersion: 2,
            ...(j.brief.creative
              ? {
                  creative: {
                    operation: j.brief.creative.operation,
                    style: j.brief.creative.style,
                    referenceCount: j.brief.creative.referenceIds.length,
                    requestedFormat: j.brief.creative.outputFormat,
                  },
                }
              : {}),
            demo: true,
            synthetic: true,
            provider: j.provider,
            ...(j.provider === "openai"
              ? {
                  providerOutputHash: j.providerOutputHash,
                  providerModel: j.providerModel,
                }
              : {}),
            generationMethod:
              j.provider === "openai" ? "ai_generated" : "deterministic_mock",
            disclosure:
              j.kind === "image"
                ? j.provider === "openai"
                  ? "KI – SYNTHETISCHE ILLUSTRATION"
                  : "MOCK – OHNE KI GENERIERT"
                : "MOCK-VIDEOMANIFEST – KEIN VIDEO",
            notDocumentaryEvidence: true,
            outputHash: j.outputHash,
            post: {
              index: j.brief.binding.postIndex,
              version: j.brief.binding.version,
              text: j.brief.editorialText,
            },
            snapshot: {
              contextHash: j.brief.binding.contextHash,
              contextRevision: j.brief.binding.contextRevision,
              postHash: j.brief.binding.postHash,
              kitRevision: j.brief.binding.kitRevision,
            },
            sourceHashes: j.brief.binding.assets.map((a) => a.hash),
            review: j.review
              ? {
                  approved: true,
                  bindingHash: j.review.bindingHash,
                  at: j.review.at,
                }
              : undefined,
            manualPublishingOnly: true,
            expiresAt: j.expiresAt,
          },
        };
      },
    );
  }
  /** Reuse valid pixels after a text edit; never regenerate or reset the expiry/cost ledger.
   * The new brief is an immutable Creative history revision, with approval cleared. */
  async rebindForWorkspace(actor:Principal,projectId:string,jobId:string,raw:unknown){
    const c=z.strictObject({expectedVersion:z.number().int().positive()}).parse(raw);
    return this.work(actor,projectId,"creative_rebind",async w=>{
      const j=this.job(w.state,jobId);
      if(j.kind!=="image"||j.state!=="completed"||!j.outputKey||this.clock().getTime()>=Date.parse(j.expiresAt))fail("CREATIVE_UNAVAILABLE");
      if(j.disclosureVersion!==(j.provider==="openai"?3:2))fail("MOCK_DISCLOSURE_REGENERATION_REQUIRED");
      const next=await this.snapshot(w,{generationId:j.brief.binding.generationId,expectedVersion:c.expectedVersion,postIndex:j.brief.binding.postIndex,objective:j.brief.objective,ratio:j.brief.ratio,...(j.brief.creative?{creative:j.brief.creative}:{}),idempotencyKey:randomUUID()});
      const old=j.brief.binding;
      if(next.binding.contextHash!==old.contextHash||next.binding.kitRevision!==old.kitRevision||digest(next.binding.assets)!==digest(old.assets))fail("CREATIVE_SNAPSHOT_STALE");
      for(const a of old.assets)await this.verifiedSource(this.asset(w.state,a.id));
      const bytes=await this.media.read(j.outputKey!);
      if(digest(bytes)!==j.outputHash)fail("CREATIVE_OUTPUT_INTEGRITY_FAILED");
      if(digest(next)!==digest(j.brief)){j.brief=next;delete j.review;j.attached=false;}
      return {reused:true,reviewRequired:!j.review};
    });
  }
  async workspace<T>(actor: Principal, projectId: string, write: boolean,
    fn: (client: PoolClient, revision: number, image: (ref: {kind: "asset" | "job"; id: string}, generationId: string, version: number, postIndex: number) => Promise<{bytes: Buffer; mime: string; binding: string; synthetic: boolean}>) => Promise<T>) {
    return this.work(actor, projectId, null, async w => {
      if(write && w.project.role === "viewer") fail("READ_ONLY",403);
      return fn(w.client, w.project.revision, async (ref,generationId,version,postIndex)=>{
        if(w.state.erasure) fail("CREATIVE_ERASED");
        if(ref.kind === "asset") {
          const a=this.asset(w.state,ref.id);
          if(a.status!=="approved") fail("APPROVED_ASSET_REQUIRED");
          const bytes=await this.verifiedSource(a);
          return {bytes,mime:"image/png",binding:digest({asset:a.id,hash:a.hash,revision:a.revision,kit:w.state.kit.revision}),synthetic:false};
        }
        const j=this.job(w.state,ref.id);
        if(j.brief.binding.generationId!==generationId || j.brief.binding.version!==version || j.brief.binding.postIndex!==postIndex) fail("CREATIVE_REVIEW_STALE");
        await this.ready(w,projectId,j); this.approved(j);
        if(!j.attached)fail("CREATIVE_ATTACHMENT_REQUIRED");
        const bytes=await this.media.read(j.outputKey!);
        if(digest(bytes)!==j.outputHash)fail("CREATIVE_OUTPUT_INTEGRITY_FAILED");
        return {bytes,mime:j.outputMime!,binding:digest({brief:j.brief,outputHash:j.outputHash}),synthetic:true};
      });
    });
  }
  async cancel(actor: Principal, projectId: string, jobId: string) {
    return this.work(actor, projectId, "creative_cancel", async (w) => {
      const j = this.job(w.state, jobId);
      if (!["queued", "processing"].includes(j.state))
        return { state: j.state };
      const queued = j.state === "queued";
      j.state = "cancelled";
      await this.settle(w, j, queued);
      return { state: j.state };
    });
  }
  /** Internal mock worker only. No HTTP endpoint accepts outcomes, prices or vendor state. */
  async advanceVideo(
    actor: Principal,
    projectId: string,
    jobId: string,
    outcome: "success" | "failure" | "timeout" = "success",
  ) {
    return this.work(actor, projectId, "video_mock_tick", async (w) => {
      const j = this.job(w.state, jobId);
      if (j.kind !== "video") fail("WRONG_CREATIVE_KIND");
      const expired = this.clock().getTime() >= Date.parse(j.expiresAt);
      if (j.state === "queued" && !expired) {
        j.state = "processing";
        j.providerPending = true;
        j.phaseAt = this.clock().toISOString();
        return { state: j.state };
      }
      if (j.state === "queued" && expired) {
        j.state = "expired";
        await this.settle(w, j, true);
        return { state: j.state };
      }
      if (!j.providerPending) return { state: j.state };
      if (outcome === "timeout") {
        if (j.state !== "cancelled") j.state = expired ? "expired" : "failed";
        j.error = "PROVIDER_COST_UNKNOWN";
        await this.settle(w, j, false);
        return { state: j.state };
      }
      if (
        j.state === "cancelled" ||
        expired ||
        j.state === "failed" ||
        j.state === "expired"
      ) {
        if (expired && j.state !== "cancelled") j.state = "expired";
        // Mock reconciliation positively confirms zero spend; a real adapter must supply trusted receipts.
        await this.settle(w, j, true);
        return { state: j.state };
      }
      if (outcome === "failure") {
        j.state = "failed";
        j.error = "MOCK_PROVIDER_FAILED";
        await this.settle(w, j, true);
        return { state: j.state };
      }
      try {
        await this.bound(w, projectId, j);
      } catch {
        j.state = "failed";
        j.error = "CREATIVE_SNAPSHOT_STALE";
        await this.settle(w, j, true);
        return { state: j.state };
      }
      const bytes = Buffer.from(
        JSON.stringify({
          demo: true,
          synthetic: true,
          kind: "mock-video-manifest",
          playableVideo: false,
          durationSeconds: 5,
          disclosure: "MOCK-VIDEOMANIFEST – KEIN VIDEO",
          notDocumentaryEvidence: true,
          postIndex: j.brief.binding.postIndex,
          postVersion: j.brief.binding.version,
          contextHash: j.brief.binding.contextHash,
          postHash: j.brief.binding.postHash,
        }),
      );
      j.outputKey = randomUUID();
      await this.media.write(j.outputKey, bytes);
      j.outputHash = digest(bytes);
      j.outputMime = "application/json";
      j.state = "completed";
      await this.settle(w, j, true);
      return { state: j.state };
    });
  }
  async expire(actor: Principal, projectId: string) {
    await this.work(actor, projectId, "creative_expiry", async (w) => {
      for (const j of w.state.jobs)
        if (this.clock().getTime() >= Date.parse(j.expiresAt)) {
          if (j.state === "queued") await this.settle(w, j, true);
          if (j.outputKey)
            w.state.pendingDeletes = [
              ...new Set([...(w.state.pendingDeletes ?? []), j.outputKey]),
            ];
          if (j.state !== "cancelled") j.state = "expired";
          j.attached = false;
        }
    });
    return this.drainDeletes(actor, projectId);
  }
  /** Explicit local recovery: interruption does NOT prove zero charge. */
  async recoverInterrupted(actor: Principal, projectId: string) {
    return this.work(actor, projectId, "local_job_recovery", async (w) => {
      let interrupted = 0;
      for (const j of w.state.jobs)
        if (
          j.state === "processing" &&
          this.clock().getTime() - Date.parse(j.phaseAt) > 15 * 60 * 1000
        ) {
          j.state = "failed";
          j.error = "LOCAL_JOB_INTERRUPTED";
          j.attached = false;
          await this.settle(w, j, false);
          interrupted++;
        }
      return { interrupted };
    });
  }
}
