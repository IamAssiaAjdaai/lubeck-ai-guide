import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import WorkspaceOverview from './WorkspaceOverview';
import { api } from './api';
vi.mock('./api',()=>({api:vi.fn()}));
const request=vi.mocked(api);
const projects=[{id:'a',name:'Firma A'},{id:'b',name:'Firma B'}];
const callbacks=()=>({onCreate:vi.fn(),onMedia:vi.fn(),onProfile:vi.fn(),onDrafts:vi.fn(),onCalendar:vi.fn(),onResume:vi.fn()});
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
 it('isolates selected-company content in Start V3 without invented social output',async()=>{
    const cb=callbacks();
    render(<WorkspaceOverview projects={projects} activeProjectId="b" listOnly={false} {...cb}/>);

    const section=await screen.findByRole('region',{name:'Zuletzt bearbeitet'});

    expect(within(section).getByText(/Firma B/)).toBeTruthy();
    expect(within(section).queryByText(/Firma A/)).toBeNull();

    const packButton=within(section).getByRole('button',{
      name:/Weiter bearbeiten: Firma B.*Paket/
    });

    fireEvent.click(packButton);
    expect(cb.onResume).toHaveBeenCalledWith('b','g');

    expect(within(section).getByText(/Prüfung offen/)).toBeTruthy();
    expect(within(section).getByText(/Demo-Inhalte · ohne Live-KI/)).toBeTruthy();
    expect(within(section).queryByText('A gespeicherter Text 0')).toBeNull();
  });

  it('does not treat stale-version reviews as approved in Start V3',async()=>{
    old=true;
    render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()}/>);

    const section=await screen.findByRole('region',{name:'Zuletzt bearbeitet'});
    const pack=within(section).getByRole('article');

    expect(within(pack).getByText('Prüfung offen · 3 von 3 Beiträgen')).toBeTruthy();
    expect(within(pack).queryByText('Aktuelle Version geprüft')).toBeNull();
    expect(pack.querySelector('[data-state="pending"]')).not.toBeNull();
  });

  it('does not turn suggested pack tasks into scheduled calendar entries',async()=>{
    render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()}/>);

    const calendar=await screen.findByRole('region',{name:'Dein Kalender'});

    expect(within(calendar).getByText('Keine Beiträge für diese Woche geplant.')).toBeTruthy();
    expect(within(calendar).queryByText('Gespeicherte Aufgabe 6')).toBeNull();
    expect(within(calendar).queryByText(/Manuell veröffentlicht/)).toBeNull();
    expect(within(calendar).getByRole('button',{name:'Kalender öffnen'})).toBeTruthy();
  });

  it('keeps a single primary next action with exact generation identity and profile callback',async()=>{
  const cb=callbacks();render(<WorkspaceOverview projects={projects} activeProjectId="b" listOnly={false} {...cb}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Inhalte prüfen'}));
  expect(cb.onResume).toHaveBeenCalledWith('b','g');
  fireEvent.click(screen.getByRole('button',{name:/Unternehmen & Fakten/}));expect(cb.onProfile).toHaveBeenCalledWith('b');
  expect(document.querySelectorAll('.button.primary')).toHaveLength(1);
 });
 it('keeps Start V3 action-first without inventing a hero photo', async () => {
    const original = request.getMockImplementation()!;

    request.mockImplementation(async path =>
      path.endsWith('/creative')
        ? {
            assets: [{
              id: 'own',
              status: 'approved',
              role: 'business_photo',
              alt: 'Freigegebene Geschäftsaufnahme'
            }]
          }
        : original(path)
    );

    render(
      <WorkspaceOverview
        projects={[projects[0]]}
        listOnly={false}
        {...callbacks()}
      />
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Deine Inhalte sind bereit zur Prüfung.'
      })
    ).toBeTruthy();

    expect(
      screen.getByRole('region', {name: 'Dein Unternehmenswissen'})
    ).toBeTruthy();

    expect(
      document.querySelector('.reference-hero-photo img')
    ).toBeNull();

    expect(
      screen.getByRole('button', {name: 'Inhalte prüfen'})
    ).toBeTruthy();
  });

  it('marks unavailable capabilities planned without fabricated output, paid upgrades or dead controls',async()=>{
  render(<WorkspaceOverview projects={[]} listOnly={false} {...callbacks()}/>);
  await screen.findByRole('button',{name:'Unternehmen anlegen'});
  expect(screen.getByText('Noch keine gespeicherten Entwürfe oder Packs.')).toBeTruthy();
  expect(screen.getByText('Noch kein Unternehmen ausgewählt.')).toBeTruthy();
  expect(screen.queryByRole('button',{name:/Reel|Story|Strategie|Upgrade/})).toBeNull();
  expect(screen.queryByRole('button',{name:'Kalender öffnen'})).toBeNull();
  expect(request.mock.calls).toHaveLength(0);
 });
});
