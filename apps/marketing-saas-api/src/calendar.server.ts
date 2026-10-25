/** Closed-pilot content calendar. Stores date/time for one existing saved post.
 * No provider calls, queue jobs, automatic posting or implicit approval. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
import { ApiError } from './errors';
import { ProjectStore, transaction, type Principal } from './store';
import type { WorkspaceService } from './workspace';

const id = z.uuid();
const when = z.iso.datetime({ offset: true });
const createCommand = z.strictObject({ generationId: id, postIndex: z.number().int().min(0).max(2), plannedAt: when });
const changeCommand = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('move'), expectedRevision: z.number().int().positive(), plannedAt: when }),
  z.strictObject({ action: z.literal('remove'), expectedRevision: z.number().int().positive() }),
  z.strictObject({ action: z.literal('mark_published'), expectedRevision: z.number().int().positive(), acknowledged: z.literal(true) }),
]);
const MAX_ROWS = 100;
const MAX_WINDOW_DAYS = 46;

type Row = {
  id: string; project_id: string; generation_id: string; post_index: number;
  pack_version: number; planned_at: string | Date; revision: number;
  published_manually_at: string | Date | null;
  output_revision: number; context_revision: number; project_revision: number;
  status: string; content: { posts?: { text?: string; channel?: string }[] } | null;
};
const asISO = (value: string | Date) => new Date(value).toISOString();
function boundedDate(value: string) {
  const parsed = when.parse(value);
  const date = new Date(parsed);
  const now = Date.now();
  if (!Number.isFinite(date.getTime()) || Math.abs(date.getTime() - now) > 2 * 366 * 86_400_000)
    throw new ApiError(400, 'CALENDAR_DATE_OUT_OF_RANGE');
  return date.toISOString();
}
function windowBounds(url: URL): {from: string; to: string} {
  const from = when.parse(url.searchParams.get('from'));
  const to = when.parse(url.searchParams.get('to'));
  const start = Date.parse(from); const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end-start > MAX_WINDOW_DAYS*86_400_000)
    throw new ApiError(400, 'CALENDAR_WINDOW_INVALID');
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}
export class CalendarService {
  private readonly store: ProjectStore;
  constructor(readonly pool: Pool, readonly workspace: WorkspaceService) { this.store = new ProjectStore(pool); }
  async authorize(actor:Principal,pid:string,write:boolean) {
    await this.store.authorize(this.pool,actor,pid,write);
  }

  async list(actor: Principal, pid: string, url: URL) {
    await this.store.authorize(this.pool, actor, pid);
    const {from,to}=windowBounds(url);
    const rows=(await this.pool.query<Row>(`
      SELECT e.*,g.output_revision,g.context_revision,g.status,
             p.revision AS project_revision,v.content
      FROM mkt_calendar_entries e
      JOIN mkt_generations g ON g.id=e.generation_id AND g.project_id=e.project_id
      JOIN mkt_projects p ON p.id=e.project_id
      LEFT JOIN mkt_pack_versions v ON v.generation_id=e.generation_id AND v.version=e.pack_version
      WHERE e.project_id=$1 AND e.planned_at >= $2 AND e.planned_at < $3
      ORDER BY e.planned_at,e.id LIMIT $4`,[pid,from,to,MAX_ROWS+1])).rows;
    const capped=rows.length>MAX_ROWS;
    const visible=rows.slice(0,MAX_ROWS);
    const data=[];
    // Bounded, conservative status reads. An error must never create a false "ready" state.
    for(const row of visible) {
      const post=row.content?.posts?.[row.post_index];
      let status:'draft'|'review'|'ready'|'published'='review';
      if(row.published_manually_at) status='published';
      else if(row.status!=='completed'||!post) status='draft';
      else if(row.output_revision===row.pack_version && row.context_revision===row.project_revision) {
        try {
          const review=await this.workspace.reviews(actor,pid,row.generation_id,row.pack_version);
          if(review.some(r=>r.postIndex===row.post_index&&r.approved===true)) status='ready';
        } catch { status='review'; }
      }
      data.push({id:row.id, generationId:row.generation_id,postIndex:row.post_index,
        plannedAt:asISO(row.planned_at),revision:row.revision,packVersion:row.pack_version,
        channel:post?.channel??'unbekannt',excerpt:(post?.text??'Gespeicherter Beitrag').slice(0,130),
        status,manualPublishedAt:row.published_manually_at?asISO(row.published_manually_at):null,
        staleVersion:row.output_revision!==row.pack_version||row.context_revision!==row.project_revision});
    }
    return { entries:data, capped, manualPublishingOnly:true };
  }

  async create(actor:Principal,pid:string,raw:unknown) {
    const cmd=createCommand.parse(raw);const plannedAt=boundedDate(cmd.plannedAt);
    return transaction(this.pool, async (c)=>{
      await this.store.authorize(c,actor,pid,true,true);
      const pack=(await c.query<{output_revision:number; content:{posts?:unknown[]}}>(`
        SELECT g.output_revision, v.content FROM mkt_generations g
        JOIN mkt_pack_versions v ON v.generation_id=g.id AND v.version=g.output_revision
        WHERE g.id=$1 AND g.project_id=$2 AND g.status='completed'`,
      [cmd.generationId,pid])).rows[0];
      if(!pack?.content?.posts?.[cmd.postIndex]) throw new ApiError(409,'CALENDAR_SAVED_POST_REQUIRED');
      const count=await c.query<{n:string}>('SELECT count(*)::text AS n FROM mkt_calendar_entries WHERE project_id=$1',[pid]);
      if(Number(count.rows[0]?.n)>=200) throw new ApiError(409,'CALENDAR_PROJECT_LIMIT');
      const result=await c.query<{id:string}>(`INSERT INTO mkt_calendar_entries
        (id,project_id,generation_id,post_index,pack_version,planned_at,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (project_id,generation_id,post_index) DO NOTHING RETURNING id`,
      [randomUUID(),pid,cmd.generationId,cmd.postIndex,pack.output_revision,plannedAt,actor.id]);
      if(!result.rows[0]) throw new ApiError(409,'CALENDAR_ALREADY_PLANNED');
      return {id:result.rows[0].id,created:true};
    });
  }

  private async lockedEntry(c:PoolClient,actor:Principal,pid:string,entryId:string,expectedRevision:number) {
    await this.store.authorize(c,actor,pid,true,true);
    const rows=await c.query<Row>('SELECT * FROM mkt_calendar_entries WHERE id=$1 AND project_id=$2 FOR UPDATE',[entryId,pid]);
    const row=rows.rows[0];
    if(!row) throw new ApiError(404,'CALENDAR_ENTRY_NOT_FOUND');
    if(row.revision!==expectedRevision) throw new ApiError(409,'CALENDAR_STALE');
    return row;
  }

  async change(actor:Principal,pid:string,entryId:string,raw:unknown) {
    const cmd=changeCommand.parse(raw);
    let checkedBinding:string|undefined;
    if(cmd.action==='mark_published') {
      // Check review state before acquiring write lock, then recheck revisions while locked.
      await this.store.authorize(this.pool,actor,pid,true);
      const probe=await this.pool.query<Row>('SELECT * FROM mkt_calendar_entries WHERE id=$1 AND project_id=$2',[entryId,pid]);
      const original=probe.rows[0];
      if(!original) throw new ApiError(404,'CALENDAR_ENTRY_NOT_FOUND');
      if(original.revision!==cmd.expectedRevision) throw new ApiError(409,'CALENDAR_STALE');
      const reviews=await this.workspace.reviews(actor,pid,original.generation_id,original.pack_version);
      if(!reviews.some(r=>r.postIndex===original.post_index&&r.approved===true))
        throw new ApiError(409,'CALENDAR_REVIEW_REQUIRED');
      // Record the current binding. The locked transaction below rejects a review
      // overwritten between this check and the calendar row update.
      const approval=(await this.pool.query<{binding_hash:string}>(
        'SELECT binding_hash FROM mkt_workspace_reviews WHERE generation_id=$1 AND version=$2 AND post_index=$3',
        [original.generation_id,original.pack_version,original.post_index],
      )).rows[0];
      if(!approval) throw new ApiError(409,'CALENDAR_REVIEW_REQUIRED');
      checkedBinding=approval.binding_hash;
    }
    return transaction(this.pool,async c=>{
      const row=await this.lockedEntry(c,actor,pid,entryId,cmd.expectedRevision);
      if(row.published_manually_at) throw new ApiError(409,'CALENDAR_ALREADY_PUBLISHED');
      if(cmd.action==='remove') {
        await c.query('DELETE FROM mkt_calendar_entries WHERE id=$1 AND project_id=$2',[entryId,pid]);
        return {deleted:true};
      }
      if(cmd.action==='move') {
        const plannedAt=boundedDate(cmd.plannedAt);
        const result=await c.query<{revision:number}>('UPDATE mkt_calendar_entries SET planned_at=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND project_id=$3 RETURNING revision',[plannedAt,entryId,pid]);
        return {revision:result.rows[0].revision};
      }
      const valid=(await c.query<{output_revision:number;context_revision:number;project_revision:number}>(`
        SELECT g.output_revision,g.context_revision,p.revision AS project_revision
        FROM mkt_generations g JOIN mkt_projects p ON p.id=g.project_id
        WHERE g.id=$1 AND g.project_id=$2 AND g.status='completed'`,[row.generation_id,pid])).rows[0];
      if(!valid||valid.output_revision!==row.pack_version||valid.context_revision!==valid.project_revision)
        throw new ApiError(409,'CALENDAR_REVIEW_REQUIRED');
      const currentApproval=(await c.query<{binding_hash:string}>(
        'SELECT binding_hash FROM mkt_workspace_reviews WHERE generation_id=$1 AND version=$2 AND post_index=$3',
        [row.generation_id,row.pack_version,row.post_index],
      )).rows[0];
      if(!checkedBinding||!currentApproval||currentApproval.binding_hash!==checkedBinding)
        throw new ApiError(409,'CALENDAR_REVIEW_REQUIRED');
      const result=await c.query<{revision:number}>('UPDATE mkt_calendar_entries SET published_manually_at=now(),published_manually_by=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND project_id=$3 RETURNING revision',[actor.id,entryId,pid]);
      return {revision:result.rows[0].revision,manualPublishingOnly:true};
    });
  }
}

/** Call after principal authentication. Restrict to closed workspace mode at the host. */
export async function calendarRoute(request:Request,actor:Principal,service:CalendarService):Promise<Response|null> {
  const pathname=new URL(request.url).pathname;
  const m=/^\/api\/projects\/([^/]+)\/calendar(?:\/([^/]+))?$/.exec(pathname);
  if(!m) return null;
  const projectId=id.parse(m[1]);const entryId=m[2]?id.parse(m[2]):null;
  if(request.method!=='GET'&&request.method!=='POST') throw new ApiError(405,'METHOD_NOT_ALLOWED');
  await service.authorize(actor,projectId,request.method==='POST');
  if(!entryId&&request.method==='GET') return Response.json(await service.list(actor,projectId,new URL(request.url)));
  if(request.method==='POST') {
    // Bound all JSON before parsing; do not accept unbounded data from a valid session.
    const reader=request.body?.getReader();
    if(!reader) throw new ApiError(400,'CALENDAR_INVALID_BODY');
    const chunks:Uint8Array[]=[];let length=0;
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;
      if(length>4096){await reader.cancel();throw new ApiError(413,'CALENDAR_BODY_TOO_LARGE');}
      chunks.push(value);
    }
    const bytes=new Uint8Array(length);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let command:unknown;
    try{command=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
    catch{throw new ApiError(400,'CALENDAR_INVALID_BODY');}
    if(!entryId) return Response.json(await service.create(actor,projectId,command),{status:201});
    return Response.json(await service.change(actor,projectId,entryId,command));
  }
  throw new ApiError(405,'METHOD_NOT_ALLOWED');
}
