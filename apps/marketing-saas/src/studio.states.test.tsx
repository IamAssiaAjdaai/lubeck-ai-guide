import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {api} from './api';
import PackWorkspace from './PackWorkspace';
import CreativeStudio from './CreativeStudio';
vi.mock('./api',()=>({api:vi.fn()}));
const request=vi.mocked(api);
beforeEach(()=>{request.mockReset();});afterEach(cleanup);
it('settings fail without fabricated quota numbers or purchasable billing controls',async()=>{
 request.mockRejectedValue(Error('Verbindung fehlgeschlagen.'));
 render(<PackWorkspace projects={[{id:'a',name:'A'}]} initialProjectId="a" usageOnly onProfile={vi.fn()}/>);
 await screen.findByText('Die Einstellungen konnten nicht geladen werden. Es werden keine Ersatzzahlen angezeigt.');
 expect(screen.getByRole('alert').textContent).toContain('Verbindung');expect(screen.queryByText('von Packs')).toBeNull();expect(screen.getByRole('button',{name:'Erneut laden'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Kaufen|Upgrade|Abonnieren/})).toBeNull();
});
it('closed Creative capabilities produce an honest unavailable state with no upload or generation control',async()=>{
 request.mockResolvedValue({enabled:false});render(<CreativeStudio projectId="a" version={1} locked={false} libraryOnly librarySection="media"/>);
 await screen.findByRole('heading',{name:'Medienwerkzeuge derzeit deaktiviert'});expect(screen.queryByLabelText('QA-Bild hochladen')).toBeNull();expect(screen.queryByRole('button',{name:'Mock-Bild erstellen'})).toBeNull();
 expect(request.mock.calls).toEqual([['/api/creative-capabilities']]);
});
