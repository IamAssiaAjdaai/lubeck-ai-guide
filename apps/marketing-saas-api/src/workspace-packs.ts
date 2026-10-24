import type { Pool } from "pg";
import { getApprovedBrandFacts, brandContextSchema } from "@marketing/core";
import { PackService } from "./packs";
import { packSelectionSchema, campaignCommandSchema } from "./pack.contract";
import { createPackProvider, type PackProvider } from "./pack.provider";
import { ProjectStore, transaction, type Principal } from "./store";
import { assessThemes } from "./sufficiency";
import { ApiError } from "./errors";
/** Local additive admission. Frozen v1 and experimental v2 remain unchanged.
 * V1's own locked expectedRevision recheck closes the source TOCTOU gap before
 * quota admission: a context mutation after preflight is rejected as stale. */
export class WorkspacePackService extends PackService {
    constructor(private readonly db: Pool, demo = true, factory: () => PackProvider = () => createPackProvider(demo)) {
        super(db, demo, () => {
            if (!demo)
                throw new ApiError(503, "WORKSPACE_OFFLINE_ONLY");
            const p = factory();
            return { ...p, async generate(input) {
                    const gate = assessThemes(input.facts);
                    if (!gate.ready)
                        throw new Error("WORKSPACE_SOURCE_CHANGED");
                    const ids = gate.themes.map(t => t.factIds[0]);
                    const result=await p.generate({ ...input, facts: [...ids.map(id => input.facts.find(f => f.id === id)!), ...input.facts.filter(f => !ids.includes(f.id))] });
                    const selected=packSelectionSchema.parse(result.selection);
                    const topics=selected.posts.map(post=>gate.themes.find(t=>post.factIds.length===1&&post.factIds[0]===t.factIds[0])?.id);
                    if(topics.some(t=>!t)||new Set(topics).size!==3)throw new Error("WORKSPACE_THEME_OUTPUT_MISMATCH");
                    return result;
                } };
        });
    }
    override async list(actor: Principal, pid: string) { const rows = await super.list(actor, pid); const dates = (await this.db.query("SELECT g.id,input->'channels'->>0 AS channel,(SELECT max(v.created_at) FROM mkt_pack_versions v WHERE v.generation_id=g.id) AS updated_at FROM mkt_generations g WHERE g.project_id=$1", [pid])).rows; return rows.map(r => ({ ...r, ...dates.find(d => d.id === r.id) })); }
    override async generate(actor: Principal, pid: string, raw: unknown) {
        const command = campaignCommandSchema.parse(raw), store = new ProjectStore(this.db);
        await transaction(this.db, async (c) => {
            const project = await store.authorize(c, actor, pid, true, true);
            if (project.revision !== command.expectedRevision)
                throw new ApiError(409, "STALE_REVISION");
            const stored = (await c.query("SELECT context FROM mkt_brand_versions WHERE project_id=$1 AND revision=$2", [pid, project.revision])).rows[0];
            const facts = stored ? getApprovedBrandFacts(brandContextSchema.parse(stored.context)) : [];
            if (!facts.length)
                throw new ApiError(409, "CONFIRMED_FACTS_REQUIRED");
            const gate = assessThemes(facts.map(f => ({ id: f.id, statement: f.statement, sourceUrls: [] })));
            if (!gate.ready)
                throw new ApiError(422, "THREE_THEMES_REQUIRED");
            const d = (await c.query("SELECT data FROM mkt_workspace_drafts WHERE project_id=$1 AND user_id=$2 AND updated_at>now()-interval '30 days'", [pid, actor.id])).rows[0]?.data;
            const v1Goal = d?.goal === 'aktion_bewerben' ? 'sichtbarkeit' : d?.goal;
            if (!d?.themesReviewed || d.expectedRevision !== project.revision || v1Goal !== command.goal || d.audience !== command.audience || command.channels.length !== 1 || d.channel !== command.channels[0])
                throw new ApiError(409, "THEMES_REVIEW_REQUIRED");
        });
        return super.generate(actor, pid, raw);
    }
}
