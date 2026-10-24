import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { getApprovedBrandFacts } from "@marketing/core";
import { ApiError } from "./errors";
import { ProjectStore, transaction, type Principal } from "./store";
import { assessThemes } from "./sufficiency";
import { channels, goals, type Pack } from "./pack.contract";
import type { CreativeService } from "./creative/service";
const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const imageRef = z.strictObject({ kind: z.enum(["asset", "job"]), id: z.uuid() }).nullable();
const draftSchema = z.strictObject({ goal: z.enum([...goals, "aktion_bewerben"]), audience: z.string().max(300), channel: z.enum(channels), themesReviewed: z.boolean().default(false), expectedRevision: z.number().int().min(0) });
const reviewSchema = z.strictObject({ expectedVersion: z.number().int().positive(), postIndex: z.number().int().min(0).max(2), image: imageRef, acknowledged: z.literal(true) });
export class WorkspaceService {
    readonly store: ProjectStore;
    constructor(readonly pool: Pool, readonly creative: CreativeService | null) { this.store = new ProjectStore(pool); }
    async readiness(actor: Principal, pid: string) { const p = await this.store.read(actor, pid); return { ...assessThemes(p.context ? getApprovedBrandFacts(p.context).map(f => ({ id: f.id, statement: f.statement, sourceUrls: [] })) : []), revision: p.revision }; }
    async draft(actor: Principal, pid: string, raw?: unknown) {
        return transaction(this.pool, async (c) => {
            const p = await this.store.authorize(c, actor, pid, raw !== undefined, true);
            // Bounded local draft retention; no indefinite copies of target-audience input.
            await c.query("DELETE FROM mkt_workspace_drafts WHERE project_id=$1 AND updated_at<now()-interval '30 days'", [pid]);
            if (raw !== undefined) {
                const d = draftSchema.parse(raw);
                if (d.expectedRevision !== p.revision)
                    throw new ApiError(409, "STALE_REVISION");
                await c.query("INSERT INTO mkt_workspace_drafts(project_id,user_id,data) VALUES($1,$2,$3) ON CONFLICT(project_id,user_id) DO UPDATE SET data=$3,updated_at=now()", [pid, actor.id, d]);
            }
            const row=(await c.query("SELECT data,updated_at FROM mkt_workspace_drafts WHERE project_id=$1 AND user_id=$2",[pid,actor.id])).rows[0];
            return row?{...row.data,savedAt:row.updated_at}:null;
        });
    }
    private async locked<T>(actor: Principal, pid: string, write: boolean, fn: (c: PoolClient, revision: number, image?: Parameters<Parameters<CreativeService["workspace"]>[3]>[2]) => Promise<T>) {
        if (this.creative)
            return this.creative.workspace(actor, pid, write, fn);
        return transaction(this.pool, async (c) => { const p = await this.store.authorize(c, actor, pid, write, true); return fn(c, p.revision); });
    }
    private async content(c: PoolClient, pid: string, gid: string, version: number) {
        const row = (await c.query("SELECT g.output_revision,g.context_revision,g.provider,v.content FROM mkt_generations g JOIN mkt_pack_versions v ON v.generation_id=g.id AND v.version=$3 WHERE g.id=$1 AND g.project_id=$2", [gid, pid, version])).rows[0];
        if (!row)
            throw new ApiError(404, "PACK_NOT_FOUND");
        if (row.output_revision !== version)
            throw new ApiError(409, "STALE_VERSION");
        return row as {
            content: Pack;
            context_revision: number;
            provider: string;
            output_revision: number;
        };
    }
    async reviews(actor: Principal, pid: string, gid: string, version: number) {
        return this.locked(actor, pid, false, async (c, revision, image) => {
            const p = await this.content(c, pid, gid, version);
            const rows = (await c.query("SELECT post_index,binding_hash,image FROM mkt_workspace_reviews WHERE generation_id=$1 AND version=$2", [gid, version])).rows;
            return Promise.all([0, 1, 2].map(async (i) => {
                const row = rows.find(r => r.post_index === i);
                if (!row)
                    return { version, postIndex: i, approved: false, textApproved: false, image: null };
                try {
                    const media = row.image && image ? await image(row.image, gid, version, i) : null;
                    if (row.image && !media)
                        throw Error('NO_MEDIA');
                    const hash = digest({ content: p.content, revision, postIndex: i, image: media?.binding ?? null });
                    return { version, postIndex: i, approved: p.context_revision === revision && hash === row.binding_hash, textApproved: p.context_revision === revision, image: row.image };
                }
                catch {
                    return { version, postIndex: i, approved: false, textApproved: p.context_revision === revision, image: row.image };
                }
            }));
        });
    }
    async review(actor: Principal, pid: string, gid: string, raw: unknown) {
        const d = reviewSchema.parse(raw);
        return this.locked(actor, pid, true, async (c, revision, image) => {
            const p = await this.content(c, pid, gid, d.expectedVersion);
            if (p.context_revision !== revision)
                throw new ApiError(409, "WORKSPACE_CONTEXT_STALE");
            const media = d.image && image ? await image(d.image, gid, d.expectedVersion, d.postIndex) : null;
            if (d.image && !media)
                throw new ApiError(409, "CREATIVE_QA_DISABLED");
            const hash = digest({ content: p.content, revision, postIndex: d.postIndex, image: media?.binding ?? null });
            await c.query("INSERT INTO mkt_workspace_reviews(generation_id,version,post_index,binding_hash,image,actor_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(generation_id,version,post_index) DO UPDATE SET binding_hash=$4,image=$5,actor_id=$6,created_at=now()", [gid, d.expectedVersion, d.postIndex, hash, d.image, actor.id]);
            return { postIndex: d.postIndex, approved: true };
        });
    }
    async export(actor: Principal, pid: string, gid: string, raw: unknown) {
        const d = z.strictObject({ expectedVersion: z.number().int().positive(), scope: z.enum(["texts", "campaign"]) }).parse(raw);
        return this.locked(actor, pid, false, async (c, revision, image) => {
            const p = await this.content(c, pid, gid, d.expectedVersion);
            if (p.context_revision !== revision)
                throw new ApiError(409, "WORKSPACE_CONTEXT_STALE");
            const rows = (await c.query("SELECT post_index,binding_hash,image FROM mkt_workspace_reviews WHERE generation_id=$1 AND version=$2", [gid, d.expectedVersion])).rows;
            const files: {
                name: string;
                base64: string;
            }[] = [];
            for (let i = 0; i < 3; i++) {
                const row = rows.find(r => r.post_index === i);
                if (!row)
                    throw new ApiError(409, "POST_REVIEW_REQUIRED");
                // Text-only export is intentionally independent from expiry/deletion of optional images.
                // Verify the saved text/context approval; its immutable binding is reconstructed below.
                let media: Awaited<ReturnType<NonNullable<typeof image>>> | null = null;
                if (row.image && d.scope === "campaign") {
                    if (!image)
                        throw new ApiError(409, "CREATIVE_QA_DISABLED");
                    media = await image(row.image, gid, d.expectedVersion, i);
                }
                if (d.scope === "campaign" || !row.image) {
                    if (row.binding_hash !== digest({ content: p.content, revision, postIndex: i, image: media?.binding ?? null }))
                        throw new ApiError(409, "POST_REVIEW_REQUIRED");
                }
                // For text-only with a previously approved image, version+context are still checked;
                // row was created only by server-side review of this exact immutable pack version.
                const text = `# Post ${i + 1} · ${p.content.posts[i].channel}\n\n${p.content.posts[i].text}\n\n${p.provider === 'demo' ? 'Demo-Modus: Diese Inhalte wurden nicht durch eine Live-KI erstellt.\n' : ''}Geprüfter Entwurf · Veröffentlichung erfolgt manuell.\n`;
                files.push({ name: `post-${i + 1}/beitrag.md`, base64: Buffer.from(text).toString('base64') });
                if (media)
                    files.push({ name: `post-${i + 1}/bild.png`, base64: media.bytes.toString('base64') }, { name: `post-${i + 1}/bildhinweis.txt`, base64: Buffer.from(media.synthetic ? 'MOCK – OHNE KI GENERIERT\nSynthetische Illustration, kein dokumentarischer Nachweis.' : 'Eigene, freigegebene Quelle. Rechte und Verwendungszweck vor Veröffentlichung beachten.').toString('base64') });
            }
            files.push({ name: 'marketing-aktivitaeten.md', base64: Buffer.from('# 7-Tage-Aktionsplan\n\nMarketingaktivitäten, keine sieben automatisch veröffentlichbaren Posts.\n\n' + p.content.days.map(d => `Tag ${d.day}: ${d.task}`).join('\n') + '\n\n## Hooks\n' + p.content.hooks.join('\n') + '\n\n## CTA\n' + p.content.cta).toString('base64') });
            await c.query("INSERT INTO mkt_pack_events(id,generation_id,version,actor_id,event) VALUES($1,$2,$3,$4,'manual_export')", [randomUUID(), gid, d.expectedVersion, actor.id]);
            return { files, manualPublishingOnly: true };
        });
    }
}
