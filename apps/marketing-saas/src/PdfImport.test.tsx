import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PdfImport from './PdfImport';
import { api } from './api';
vi.mock('./api',async importOriginal=>({...await importOriginal<typeof import('./api')>(),api:vi.fn()}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const preview={token:'synthetic-token',label:'Fiktive Leistungen.pdf',digest:'a'.repeat(64),extractedAt:'2026-10-24T10:00:00Z',expiresAt:'2026-10-24T10:15:00Z',expectedRevision:2,pages:1,omitted:0,candidates:[{id:'fact-a',statement:'Wir reinigen Büros.',page:1,snippet:'Wir reinigen Büros.',caution:'Angabe prüfen.'},{id:'fact-b',statement:'Ein Erstgespräch ist möglich.',page:1,snippet:'Ein Erstgespräch ist möglich.',caution:'Angabe prüfen.'}]};
async function upload() {
  fireEvent.change(screen.getByLabelText('Geschäftsdokument (PDF)'),{target:{files:[new File(['%PDF-1.7'],'Fiktive Leistungen.pdf',{type:'application/pdf'})]}});
  fireEvent.click(screen.getByRole('button',{name:'PDF prüfen'}));
  await screen.findByRole('heading',{name:'Extrahierte Vorschläge · ungeprüft'});
}
it('requires explicit selection and acknowledgement, sends IDs only, and never confirms candidates automatically',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify(preview)));
  const saved=vi.fn().mockResolvedValue(undefined);vi.mocked(api).mockResolvedValue({});
  render(<PdfImport projectId="a" revision={2} readOnly={false} onSaved={saved}/>);await upload();
  expect(screen.getByRole('button',{name:'Auswahl ungeprüft speichern'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('checkbox',{name:'Wir reinigen Büros.'}));
  fireEvent.click(screen.getByRole('checkbox',{name:/Ich habe die ausgewählten Aussagen/}));
  fireEvent.click(screen.getByRole('button',{name:'Auswahl ungeprüft speichern'}));
  await screen.findByText(/Auswahl gespeichert, noch nicht bestätigt/);
  expect(api).toHaveBeenCalledWith('/api/projects/a/documents/accept',{token:preview.token,expectedRevision:2,candidateIds:['fact-a'],acknowledged:true});
  expect(vi.mocked(api).mock.calls.some(([path])=>path.includes('/confirm'))).toBe(false);
  expect(saved).toHaveBeenCalledOnce();expect(fetch).toHaveBeenCalledOnce();
});
it('exposes a clear parser error and keeps unrelated API data untouched',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({error:'PDF_ENCRYPTED'}),{status:422}));
  render(<PdfImport projectId="a" revision={2} readOnly={false} onSaved={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Geschäftsdokument (PDF)'),{target:{files:[new File(['fake'],'Fiktiv.pdf',{type:'application/pdf'})]}});
  fireEvent.click(screen.getByRole('button',{name:'PDF prüfen'}));expect((await screen.findByRole('alert')).textContent).toContain('verschlüsselt');
  expect(screen.queryByRole('heading',{name:'Extrahierte Vorschläge · ungeprüft'})).toBeNull();
});
it('does not expose an upload control to viewers',()=>{
  render(<PdfImport projectId="a" revision={2} readOnly onSaved={vi.fn()}/>);
  expect(screen.queryByLabelText('Geschäftsdokument (PDF)')).toBeNull();expect(screen.getByText('Für den PDF-Import brauchst du Schreibrechte.')).toBeTruthy();
});
