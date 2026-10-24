import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PackWorkspace from './PackWorkspace';
import { api } from './api';
vi.mock('./api', () => ({ api: vi.fn() }));
const request = vi.mocked(api);
const content = { posts: [0,1,2].map(i => ({ text: `Gespeicherter Beitrag ${i}`, channel: 'linkedin' })), hooks: ['A','B','C'], cta: 'Gespräch anfragen', days: [], facts: [] };
const job = { id: 'g', status: 'completed', provider: 'mock', model: 'offline', output_revision: 2, context_revision: 1, versions: [2,1].map(version => ({ version, content })) };
const reviews = [0,1,2].map(postIndex => ({ version: 2, postIndex, approved: true, textApproved: true, image: null }));
let reviewRequest: () => Promise<unknown>;
beforeEach(() => {
 request.mockReset(); reviewRequest = async () => reviews;
 request.mockImplementation(async path => {
  if (path.includes('/workspace/reviews/')) return reviewRequest();
  if (path.endsWith('/packs/g')) return job;
  if (path.endsWith('/readiness')) return {ready: true, revision: 1, questions: []};
  if (path.endsWith('/usage')) return {remaining: 3, allocation: 3, used: 0, demo: true};
  if (path.endsWith('/creative')) return {assets: [], jobs: []};
  if (path.endsWith('/draft')) return null;
  return {enabled: false};
 });
});
afterEach(cleanup);
async function open() {
 render(<PackWorkspace projects={[{id:'a',name:'A'}]} initialProjectId="a" initialGenerationId="g" onProfile={vi.fn()}/>);
 return screen.findByLabelText('Gespeicherte Version');
}
it('does not request current-only reviews for intentional history; restores current approval and export', async () => {
 const select = await open(); await screen.findByRole('heading',{name:'Bereit zum Herunterladen'});
 fireEvent.change(select,{target:{value:'1'}});
 expect(screen.getByText(/Historischer Stand, nur zum Lesen/)).toBeTruthy();
 expect(screen.getByLabelText('Beitrag 1').hasAttribute('readonly')).toBe(true);
 expect(screen.getByRole('button',{name:'Beitrag prüfen & freigeben'}).hasAttribute('disabled')).toBe(true);
 expect(screen.getByRole('button',{name:/^Texte herunterladen$/}).hasAttribute('disabled')).toBe(true);
 expect(screen.queryByRole('alert')).toBeNull();
 expect(request.mock.calls.some(([path])=>path.includes('reviews/')&&path.includes('version=1'))).toBe(false);
 fireEvent.change(select,{target:{value:'2'}});
 await screen.findByRole('heading',{name:'Bereit zum Herunterladen'});
 expect(screen.getByRole('button',{name:/^Texte herunterladen$/}).hasAttribute('disabled')).toBe(false);
 expect(screen.queryByRole('alert')).toBeNull();
});
it('ignores a late current-review failure after switching to historical mode', async () => {
 let reject!: (error: Error) => void;
 reviewRequest = () => new Promise((_resolve, r) => {reject=r;});
 const select = await open(); await waitFor(()=>expect(reject).toBeTypeOf('function'));
 fireEvent.change(select,{target:{value:'1'}}); await act(async () => {reject(Error('Diese Version wurde bereits bearbeitet.'));});
 await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
 expect(screen.getByRole('button',{name:/^Texte herunterladen$/}).hasAttribute('disabled')).toBe(true);
});
it('keeps real current-version conflicts visible and export locked', async () => {
 reviewRequest = async () => {throw Error('Diese Version wurde bereits bearbeitet. Bitte den Verlauf neu laden; dein Entwurf bleibt hier.');};
 await open(); expect((await screen.findByRole('alert')).textContent).toContain('Diese Version wurde bereits bearbeitet');
 expect(screen.getByRole('button',{name:/^Texte herunterladen$/}).hasAttribute('disabled')).toBe(true);
});
