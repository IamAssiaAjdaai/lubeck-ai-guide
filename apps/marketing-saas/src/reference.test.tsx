import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import WorkspaceOverview from './WorkspaceOverview';
import { api } from './api';
vi.mock('./api',()=>({api:vi.fn()}));
const request=vi.mocked(api);
const projects=[{id:'a',name:'Firma A'},{id:'b',name:'Firma B'}];
const callbacks=()=>({onCreate:vi.fn(),onMedia:vi.fn(),onProfile:vi.fn(),onDrafts:vi.fn(),onResume:vi.fn()});
let old=false;
beforeEach(()=>{
 old=false;request.mockReset();
 request.mockImplementation(async path=>{
  if(path.endsWith('/readiness'))return {ready:true,reason:'ready',revision:2,questions:[]};
  if(path.endsWith('/draft'))return null;
  if(path.endsWith('/creative'))return {assets:[]};
  if(path.endsWith('/packs'))return [{id:'g',status:'completed',goal:'sichtbarkeit',created_at:'2026-10-01',provider:'mock'}];
  if(path.includes('/workspace/reviews/'))return [0,1,2].map(postIndex=>({postIndex,version:old?1:2,approved:postIndex===1}));
  if(path.endsWith('/packs/g'))return {output_revision:2,versions:[{version:2,created_at:'2026-10-02',content:{posts:[0,1,2].map(i=>({channel:'linkedin',text:(path.includes('/a/')?'A':'B')+' gespeicherter Text '+i})),days:Array.from({length:7},(_,i)=>({day:i+1,time:'Vormittags',task:'Gespeicherte Aufgabe '+i}))}}]};
  return {context:{identity:{name:'Gespeicherter Name'},markets:[{id:'owner-service-city',name:'Düsseldorf'}],facts:[{statement:'Eigene Leistung',confirmation:{}}]}};
 });
});
afterEach(cleanup);
describe('Owner reference architecture with truthful saved data',()=>{
 it('shows three selected-company texts without leaking another selected-project overview or fake social media',async()=>{
  render(<WorkspaceOverview projects={projects} activeProjectId="b" listOnly={false} {...callbacks()}/>);
  await screen.findByRole('heading',{level:1,name:'Deine Inhalte. Bereit für deine Handschrift.'});
  const pack=screen.getByRole('region',{name:'Dein aktueller Marketing Pack'});
  expect(within(pack).getAllByRole('article')).toHaveLength(3);
  expect(within(pack).getByText('B gespeicherter Text 0')).toBeTruthy();
  expect(screen.queryByText('A gespeicherter Text 0')).toBeNull();
  expect(screen.getByText('Markenillustration · kein Unternehmensfoto')).toBeTruthy();
  expect(within(pack).queryByRole('img')).toBeNull();
  expect(within(pack).getByText(/ohne Live-KI/)).toBeTruthy();
 });
 it('uses per-post exact-version review states, never generation completion or aggregate approval',async()=>{
  old=true;render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()}/>);
  const pack=await screen.findByRole('region',{name:'Dein aktueller Marketing Pack'});
  expect(within(pack).queryByText('Geprüft')).toBeNull();
  expect(within(pack).getAllByText('Prüfung offen',{exact:true})).toHaveLength(3);
 });
 it('renders all seven real tasks through a native disclosure and no scheduled date or publication',async()=>{
  render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()}/>);
  const plan=await screen.findByRole('region',{name:'Dein Aktionsplan'});
  const summary=within(plan).getByText('Alle 7 Aufgaben lesen');expect(summary.tagName).toBe('SUMMARY');
  fireEvent.click(summary);expect(summary.closest('details')?.hasAttribute('open')).toBe(true);
  expect(within(plan).getByText('Gespeicherte Aufgabe 6')).toBeTruthy();
  expect(within(plan).getByText(/kein Versandkalender/)).toBeTruthy();
 });
 it('keeps a single primary next action with exact generation identity and profile callback',async()=>{
  const cb=callbacks();render(<WorkspaceOverview projects={projects} activeProjectId="b" listOnly={false} {...cb}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Inhalte prüfen'}));
  expect(cb.onResume).toHaveBeenCalledWith('b','g');
  fireEvent.click(screen.getByRole('button',{name:'Profil ansehen'}));expect(cb.onProfile).toHaveBeenCalledWith('b');
  expect(document.querySelectorAll('.button.primary')).toHaveLength(1);
 });
 it('uses a reviewed business photo in the hero, while a logo remains only a post attachment',async()=>{
  const original=request.getMockImplementation()!;
  let role='logo';
  request.mockImplementation(async path=>path.endsWith('/creative')?{assets:[{id:'own',status:'approved',role,alt:'Freigegebene Geschäftsaufnahme'}]}:path.includes('/workspace/reviews/')?[{postIndex:1,version:2,approved:true,image:{kind:'asset',id:'own'}}]:original(path));
  const cb=callbacks();const view=render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...cb}/>);
  await screen.findByRole('heading',{level:1});
  expect(screen.getByText('Markenillustration · kein Unternehmensfoto')).toBeTruthy();
  expect(document.querySelector('.reference-hero-photo img')).toBeNull();
  role='business_photo';view.unmount();render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...cb}/>);
  await screen.findByText('Freigegebene eigene Bildquelle');
  expect(document.querySelector('.reference-hero-photo img')?.getAttribute('src')).toBe('/api/projects/a/creative/assets/own');
 });
 it('marks unavailable capabilities planned without fabricated output, paid upgrades or dead controls',async()=>{
  render(<WorkspaceOverview projects={[]} listOnly={false} {...callbacks()}/>);
  await screen.findByRole('button',{name:'Unternehmen anlegen'});
  expect(screen.getByText('Noch kein Pack')).toBeTruthy();
  expect(screen.getByText('Noch nicht verfügbar')).toBeTruthy();
  expect(screen.queryByRole('button',{name:/Reel|Story|Strategie|Kalender|Upgrade/})).toBeNull();
  expect(screen.getByText('Hier wird dein erster Pack sichtbar.')).toBeTruthy();
  expect(request.mock.calls).toHaveLength(0);
 });
});
