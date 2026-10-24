import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ContentLibrary, { ContentThumbnail, CampaignCard } from './ContentLibrary';
import { approvedThumbnail, nextAction, type OverviewEntry, type OverviewData, type OverviewReview } from './overview.data';
import { safeWorkspaceDestination } from './routes';
afterEach(cleanup);
const base:OverviewEntry={id:'g',generationId:'g',projectId:'a',business:'Fiktive Firma A',goal:'sichtbarkeit',date:'2026-10-24',dateLabel:'Zuletzt bearbeitet',kind:'pack',statusLabel:'Prüfung offen · 2 von 3 Beiträgen',pendingReview:true,version:2,approvedCount:1,posts:[0,1,2].map(i=>({text:'Gespeicherter Beitrag '+(i+1),channel:'linkedin'}))};
const review:OverviewReview={postIndex:1,version:2,approved:true,image:{kind:'asset',id:'photo'}};
const media={assets:[{id:'photo',status:'approved',alt:'Eigene freigegebene Quelle'}]};
describe('Studio content integrity and usable presentation',()=>{
 it('uses only a valid current reviewed source asset, never a generated job or unrelated photo',()=>{
  expect(approvedThumbnail('/api/projects/a',2,[review],media)).toMatchObject({url:'/api/projects/a/creative/assets/photo',postIndex:1});
  for(const r of [{...review,version:1},{...review,approved:false},{...review,postIndex:9},{...review,image:{kind:'job' as const,id:'photo'}},{...review,image:{kind:'asset' as const,id:'other'}}])expect(approvedThumbnail('/api/projects/a',2,[r],media)).toBeUndefined();
  expect(approvedThumbnail('/api/projects/a',2,[review],{assets:[{...media.assets[0],status:'pending'}]})).toBeUndefined();
  expect(approvedThumbnail('/api/projects/a',2,[review],{assets:[]})).toBeUndefined();
  expect(approvedThumbnail('/api/projects/a',2,[review],{...media,erasure:{}})).toBeUndefined();
  expect(approvedThumbnail('/api/projects/a',2,[review],null)).toBeUndefined();
 });
 it('places the real thumbnail on its reviewed post, with text-first fallback after any image error',()=>{
  const thumbnail=approvedThumbnail('/api/projects/a',2,[review],media)!;
  render(<CampaignCard entry={{...base,thumbnail}} onResume={vi.fn()}/>);
  const picture=screen.getByRole('img',{name:thumbnail.alt});expect(picture.closest('section')?.getAttribute('aria-label')).toBe('Beitrag 2');
  fireEvent.error(picture);expect(screen.queryByRole('img')).toBeNull();expect(screen.getByText('Bild nicht verfügbar')).toBeTruthy();expect(screen.getByText('Gespeicherter Beitrag 2')).toBeTruthy();
 });
 it('does not render fake imagery when there is no approved image; image identity changes clear a prior failure',()=>{
  const v=render(<ContentThumbnail/>);expect(screen.queryByRole('img')).toBeNull();expect(screen.getByText('Text im Mittelpunkt')).toBeTruthy();
  v.rerender(<ContentThumbnail thumbnail={{url:'/a',alt:'A',postIndex:0}}/>);fireEvent.error(screen.getByRole('img'));v.rerender(<ContentThumbnail thumbnail={{url:'/b',alt:'B',postIndex:0}}/>);expect(screen.getByRole('img',{name:'B'})).toBeTruthy();
 });
 it('groups campaigns by actual project, retains drafts and passes exact resume identity',()=>{
  const resume=vi.fn();render(<ContentLibrary entries={[base,{...base,id:'draft-a',generationId:undefined,kind:'draft',posts:undefined,statusLabel:'Gespeicherter Entwurf'},{...base,id:'b',projectId:'b',business:'Fiktive Firma B'}]} onResume={resume}/>);
  expect(screen.getByRole('region',{name:'Kampagnen für Fiktive Firma A'})).toBeTruthy();expect(screen.getByRole('region',{name:'Kampagnen für Fiktive Firma B'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Firma A.*Entwurf/}));expect(resume).toHaveBeenLastCalledWith('a',undefined);fireEvent.click(screen.getByRole('button',{name:/Firma B.*Paket/}));expect(resume).toHaveBeenLastCalledWith('b','g');
 });
 it('keeps failed or uncertain jobs read-only without a retry or imaginary content',()=>{
  render(<CampaignCard entry={{...base,generationId:undefined,posts:undefined,statusLabel:'Ergebnis unklar'}} onResume={vi.fn()}/>);
  expect(screen.queryByRole('button')).toBeNull();expect(screen.getByText('Keine automatische Wiederholung.')).toBeTruthy();expect(screen.queryByRole('img')).toBeNull();
 });
 it('gives newer reviewable content priority while retaining a newer saved preparation when appropriate',()=>{
  const data:OverviewData={projects:[{project:{id:'a',name:'A'},context:{identity:{name:'A'},facts:[{confirmation:{}}]},gate:{ready:true,reason:'ready',revision:2,questions:[]},packs:[],draft:null}],entries:[base,{...base,id:'d',kind:'draft',generationId:undefined,date:'2026-10-20'}],draftCount:1,packCount:1,capped:false};
  expect(nextAction(data,'a')).toMatchObject({generationId:'g',label:'Inhalte prüfen'});
  data.entries[1].date='2026-10-25';expect(nextAction(data,'a').label).toBe('Entwurf fortsetzen');
 });
 it('allows only the implemented private media destination, leaving strategy/calendar/video inactive',()=>{
  expect(safeWorkspaceDestination('/workspace?view=media&next=https://evil.example')).toBe('/workspace?view=media');
  for(const name of ['strategy','calendar','video','billing'])expect(safeWorkspaceDestination('/workspace?view='+name)).toBe('/workspace');
 });
});
