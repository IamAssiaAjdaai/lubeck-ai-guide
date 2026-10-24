// @vitest-environment node
import { afterAll, describe, it, expect, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { ProjectStore } from '../store';
import { configuration } from '../config';
import { createApi } from '../server';
import type { createSaasAuth } from '../auth';
import { syntheticPdf, businessPages } from './pdf.fixtures';
const url=process.env.MARKETING_TEST_DATABASE_URL;
const pool=url?new Pool({connectionString:url}):null;
afterAll(async()=>{await pool?.end();});
async function fixture() {
  const store=new ProjectStore(pool!);const owner=randomUUID(),viewer=randomUUID(),other=randomUUID();
  for(const id of [owner,viewer,other])await pool!.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',[id,'Synthetic PDF reviewer',`${id}@example.test`]);
  const project=await store.create({id:owner},'Fiktiver Büroservice');
  await pool!.query('INSERT INTO mkt_memberships(organization_id,user_id,role) VALUES($1,$2,$3)',[project.organization_id,viewer,'viewer']);
  await store.revise({id:owner},project.id,0,{rawText:'Synthetischer Kurzbrief',identity:{name:project.name},facts:[{id:'existing',statement:'Bestehende bestätigte Büroreinigung.'}]},[{factId:'existing',snippet:'Alte Quelle'}]);
  await store.confirm({id:owner},project.id,1,['existing']);
  const auth={api:{getSession:async({headers}:{headers:Headers})=>{const id=headers.get('x-synthetic-actor');return id?{user:{id,emailVerified:true}}:null;}}} as unknown as ReturnType<typeof createSaasAuth>;
  const config=configuration({MARKETING_DATABASE_URL:url,MARKETING_AUTH_SECRET:'synthetic-pdf-test-secret-32-characters',MARKETING_DEMO_MODE:'true'});
  const api=createApi(pool!,config,auth);
  async function call(actor:string|null,action:string,data:Buffer|unknown=syntheticPdf(businessPages),revision=2) {
    const bytes=Buffer.isBuffer(data);
    const request=new Request(`${config.origin}/api/projects/${project.id}/documents/${action}`,{method:'POST',headers:{origin:config.origin,...(actor?{'x-synthetic-actor':actor}:{}),'content-type':bytes?'application/pdf':'application/json','x-context-revision':String(revision),'x-document-label':encodeURIComponent('Fiktive Leistungen.pdf')},body:bytes?new Uint8Array(data):JSON.stringify(data)});
    const read=vi.spyOn(request,'arrayBuffer');const response=await api(request);return {response,body:await response.json(),read};
  }
  return {store,project,owner,viewer,other,call};
}
describe.skipIf(!url)('PDF authorization and immutable Brand Context integration',()=>{
  it('authorizes before parsing: anonymous, unrelated tenant and viewer are denied',async()=>{
    const f=await fixture();
    for(const [actor,status] of [[null,401],[f.other,404],[f.viewer,403]] as const){const r=await f.call(actor,'preview');expect(r.response.status).toBe(status);expect(r.read).not.toHaveBeenCalled();}
    expect((await f.store.read({id:f.owner},f.project.id)).revision).toBe(2);
  });
  it('saves only selected server-backed candidates as unconfirmed, preserving old approvals/evidence and then uses normal confirmation',async()=>{
    const f=await fixture();const before=await f.store.read({id:f.owner},f.project.id);
    const p=await f.call(f.owner,'preview');expect(p.response.status).toBe(200);
    expect((await f.store.read({id:f.owner},f.project.id)).revision).toBe(2);
    const chosen=p.body.candidates.find((c:{page:number})=>c.page===2);
    const r=await f.call(f.owner,'accept',{token:p.body.token,expectedRevision:2,candidateIds:[chosen.id],acknowledged:true});expect(r.response.status).toBe(200);
    const saved=await f.store.read({id:f.owner},f.project.id);expect(saved.revision).toBe(3);
    expect(saved.context.facts.find((x:{id:string})=>x.id==='existing')).toEqual(before.context.facts[0]);
    expect(saved.context.facts).toHaveLength(2);expect(saved.context.facts[1]).toMatchObject({id:chosen.id,confirmation:null,basis:'source_backed',statement:chosen.statement});
    expect(saved.context.provenance.find((s:{kind:string})=>s.kind==='document').label).toContain('Seite 2');
    expect(saved.evidence).toContainEqual(before.evidence[0]);expect(saved.evidence[1]).toMatchObject({page:2,documentDigest:p.body.digest,snippet:chosen.snippet});
    const confirmed=await f.store.confirm({id:f.owner},f.project.id,3,[chosen.id]);expect(confirmed.facts[1].confirmation).toBeTruthy();
    expect((await f.call(f.owner,'accept',{token:p.body.token,expectedRevision:3,candidateIds:[chosen.id],acknowledged:true})).body.error).toBe('PDF_PREVIEW_EXPIRED');
  });
  it('rejects stale revisions, forged selections and cross-tenant token use without overwrite',async()=>{
    const f=await fixture();const p=await f.call(f.owner,'preview');
    const command={token:p.body.token,expectedRevision:2,candidateIds:[p.body.candidates[0].id],acknowledged:true};
    expect((await f.call(f.other,'accept',command)).response.status).toBe(404);
    expect((await f.call(f.viewer,'accept',command)).response.status).toBe(403);
    expect((await f.call(f.owner,'accept',{...command,candidateIds:['invented']})).response.status).toBe(400);
    await f.store.confirm({id:f.owner},f.project.id,2,['existing']);
    expect((await f.call(f.owner,'accept',command)).body.error).toBe('STALE_REVISION');
    const stored=await f.store.read({id:f.owner},f.project.id);expect(stored.revision).toBe(3);expect(stored.context.facts).toHaveLength(1);
  });
  it('creates a first context without a competing database or automatic confirmation',async()=>{
    const f=await fixture();const fresh=await f.store.create({id:f.owner},'Fiktiver Erstimport');
    const {PdfIntake}=await import('./pdf');const intake=new PdfIntake();const p=await intake.preview(f.owner,fresh.id,0,syntheticPdf(businessPages),'application/pdf','Fiktiv.pdf');
    const selected=intake.selected(f.owner,fresh.id,p.token,[p.candidates[0].id]);
    const context=await f.store.appendDocument({id:f.owner},fresh.id,0,selected);
    expect(context.revision).toBe(1);expect(context.facts.every(x=>x.confirmation===null)).toBe(true);
  });
  it('serializes simultaneous acceptance without overwriting the winning revision',async()=>{
    const f=await fixture();const p=await f.call(f.owner,'preview');
    const command={token:p.body.token,expectedRevision:2,candidateIds:[p.body.candidates[0].id],acknowledged:true};
    const responses=await Promise.all([f.call(f.owner,'accept',command),f.call(f.owner,'accept',command)]);
    expect(responses.filter(r=>r.response.status===200)).toHaveLength(1);
    expect(responses.filter(r=>r.response.status===409)).toHaveLength(1);
    const saved=await f.store.read({id:f.owner},f.project.id);expect(saved.revision).toBe(3);expect(saved.context.facts).toHaveLength(2);
  });
});
