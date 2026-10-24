import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from './api';
import { loadOverview, nextAction } from './overview.data';
import WorkspaceOverview from './WorkspaceOverview';
vi.mock('./api',()=>({api:vi.fn()}));
const request=vi.mocked(api);
const projects=[{id:'a',name:'Firma A'},{id:'b',name:'Firma B'}];
const gate={ready:true,reason:'ready',revision:2,questions:[]};
let failed=false, reviewVersion=2, approved=[0], hasDraft=true;
beforeEach(()=>{
 failed=false;reviewVersion=2;approved=[0];hasDraft=true;request.mockReset();
 request.mockImplementation(async path=>{
  if(failed)throw Error('OFFLINE');
  if(path.endsWith('/readiness'))return gate;
  if(path.endsWith('/draft'))return hasDraft?{goal:'mehr_anfragen',channel:'linkedin',savedAt:'2026-10-01T10:00:00Z'}:null;
  if(path.endsWith('/packs'))return [{id:'g',goal:'sichtbarkeit',created_at:'2026-10-10T10:00:00Z',status:'completed',output_revision:2}];
  if(path.includes('/workspace/reviews/'))return [0,1,2].map(postIndex=>({postIndex,version:reviewVersion,approved:approved.includes(postIndex)}));
  if(path.endsWith('/packs/g'))return {output_revision:2,versions:[{version:2,created_at:'2026-10-20T10:00:00Z',content:{posts:[{channel:'linkedin'},{channel:'linkedin'},{channel:'linkedin'}]}}]};
  return {context:{identity:{name:'Test'},facts:[{confirmation:{}}]}};
 });
});
afterEach(cleanup);
const callbacks=()=>({onCreate:vi.fn(),onMedia:vi.fn(),onProfile:vi.fn(),onDrafts:vi.fn(),onResume:vi.fn()});
describe('trustworthy Overview contract',()=>{
 it('retains older saved drafts alongside newer generations, uses actual edit dates and scopes every read',async()=>{
  const d=await loadOverview(projects);expect(d.draftCount).toBe(2);expect(d.packCount).toBe(2);expect(d.entries).toHaveLength(4);
  expect(d.entries[0]).toMatchObject({date:'2026-10-20T10:00:00Z',dateLabel:'Zuletzt bearbeitet',statusLabel:'Prüfung offen · 2 von 3 Beiträgen'});
  expect(d.entries.filter(e=>e.kind==='draft')).toHaveLength(2);
  expect(request.mock.calls.every(([path])=>/^\/api\/projects\/(a|b)(\/|$)/.test(path))).toBe(true);
 });
 it('requires all three unique exact-version review positions; completion alone never means approved',async()=>{
  approved=[0,1,2];reviewVersion=1;
  expect((await loadOverview([projects[0]])).entries[0].statusLabel).toBe('Prüfung offen · 3 von 3 Beiträgen');
  reviewVersion=2;expect((await loadOverview([projects[0]])).entries[0].statusLabel).toBe('Aktuelle Version geprüft');
  request.mockImplementation(async path=>path.includes('/workspace/reviews/')?[0,0,0].map(postIndex=>({postIndex,version:2,approved:true})):path.endsWith('/packs')?[{id:'g',status:'completed',created_at:'2026-10-20',goal:'sichtbarkeit'}]:path.endsWith('/packs/g')?{output_revision:2,versions:[{version:2,created_at:'2026-10-20',content:{posts:[{channel:'linkedin'},{channel:'linkedin'},{channel:'linkedin'}]}}]}:path.endsWith('/draft')?null:path.endsWith('/readiness')?gate:{context:null});
  expect((await loadOverview([projects[0]])).entries[0].statusLabel).toBe('Prüfung offen · 2 von 3 Beiträgen');
 });
 it('does not fetch or invent review status for failed/running/unknown generations or count them as created packs',async()=>{
  const original=request.getMockImplementation()!;request.mockImplementation(async path=>path.endsWith('/packs')?['failed','running','unknown'].map((status,i)=>({id:String(i),status,goal:'sichtbarkeit',created_at:'2026-10-20'})):original(path));
  const d=await loadOverview([projects[0]]);expect(d.packCount).toBe(0);expect(d.entries.filter(e=>e.kind==='pack').every(e=>!e.generationId)).toBe(true);expect(d.entries.filter(e=>e.pendingReview)).toHaveLength(0);expect(request.mock.calls.some(([p])=>p.includes('/reviews/'))).toBe(false);
 });
 it('follows readiness, selected project, draft and exact review priorities',async()=>{
  const d=await loadOverview(projects);const p=d.projects[0];
  expect(nextAction({...d,projects:[]}).label).toBe('Unternehmen anlegen');
  expect(nextAction({...d,projects:[{...p,context:null}]}).label).toBe('Unternehmensangaben ergänzen');
  expect(nextAction({...d,projects:[{...p,context:{identity:{name:'A'},facts:[{}]}}]}).label).toBe('Unternehmensfakten prüfen');
  expect(nextAction({...d,projects:[{...p,gate:{...gate,ready:false,reason:'specialist_required',questions:['Fachprüfung nötig.']}}]}).description).toBe('Fachprüfung nötig.');
  expect(nextAction(d,'b')).toMatchObject({projectId:'b',label:'Entwurf fortsetzen'});
  const noDraft={...d,entries:d.entries.filter(e=>e.kind!=='draft')};
  expect(nextAction(noDraft,'a')).toMatchObject({projectId:'a',generationId:'g',label:'Inhalte prüfen'});
  expect(nextAction({...noDraft,entries:[]},'a').label).toBe('Neue Inhalte erstellen');
 });
 it('announces loading; reports API errors without false zero KPIs; allows retry',async()=>{
  failed=true;render(<WorkspaceOverview projects={projects} listOnly={false} {...callbacks()}/>);
  expect(screen.getByRole('status').textContent).toContain('geladen');
  await screen.findByRole('alert');expect(screen.queryByRole('definition')).toBeNull();failed=false;fireEvent.click(screen.getByRole('button',{name:'Erneut laden'}));
  await screen.findAllByRole('definition');expect(screen.queryByRole('alert')).toBeNull();
 });
 it('loads an honest empty state and routes create/profile through existing callbacks',async()=>{
  const cb=callbacks();render(<WorkspaceOverview projects={[]} listOnly={false} {...cb}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Unternehmen anlegen'}));expect(cb.onProfile).toHaveBeenCalledWith(undefined);
  expect(screen.getByText('Noch keine gespeicherten Inhalte.')).toBeTruthy();
 });
 it('passes exact project and generation identity for resume; draft resume never substitutes the newest pack',async()=>{
  const cb=callbacks();render(<WorkspaceOverview projects={projects} activeProjectId="b" listOnly {...cb}/>);
  fireEvent.click((await screen.findAllByRole('button',{name:/Firma B.*Entwurf/}))[0]);expect(cb.onResume).toHaveBeenCalledWith('b',undefined);
  fireEvent.click(screen.getByRole('button',{name:/Firma A.*Paket/}));expect(cb.onResume).toHaveBeenCalledWith('a','g');
 });
 it('discards late responses after switching project sets; previous project rows cannot reappear',async()=>{
  const cb=callbacks(), original=request.getMockImplementation()!;
  let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});
  request.mockImplementation(async path=>{if(path.startsWith('/api/projects/a'))await barrier;return original(path);});
  const view=render(<WorkspaceOverview projects={[projects[0]]} listOnly {...cb}/>);
  expect(screen.getByRole('status')).toBeTruthy();
  view.rerender(<WorkspaceOverview projects={[projects[1]]} listOnly {...cb}/>);
  await screen.findByRole('button',{name:/Firma B.*Paket/});release();
  await waitFor(()=>expect(request.mock.calls.some(([p])=>p.startsWith('/api/projects/a/workspace/reviews/'))).toBe(true));
  expect(screen.queryByRole('button',{name:/Firma A/})).toBeNull();
  expect(screen.getByRole('button',{name:/Firma B.*Paket/})).toBeTruthy();
 });
 it('caps the loaded-history claim and never calls a write or provider endpoint',async()=>{
  const original=request.getMockImplementation()!;request.mockImplementation(async path=>path.endsWith('/packs')?Array.from({length:100},(_,i)=>({id:String(i),status:'failed',goal:'sichtbarkeit',created_at:'2026-10-20'})):original(path));
  const d=await loadOverview([projects[0]]);expect(d.capped).toBe(true);expect(request.mock.calls.every(call=>call.length===1)).toBe(true);
 });
});
