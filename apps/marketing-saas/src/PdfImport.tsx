import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, messages } from './api';
type Preview = {token:string;label:string;digest:string;extractedAt:string;expiresAt:string;expectedRevision:number;pages:number;omitted:number;candidates:{id:string;statement:string;page:number;snippet:string;caution:string}[]};
export default function PdfImport({projectId,revision,readOnly,onSaved}:{projectId:string;revision:number;readOnly:boolean;onSaved:()=>Promise<void>}) {
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<Preview|null>(null),[selected,setSelected]=useState<string[]>([]),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function upload(e:FormEvent) {
    e.preventDefault(); if(!file||busy||readOnly)return;
    setBusy(true);setError('');setNotice('');setPreview(null);setSelected([]);setAck(false);
    try {
      if(file.size>2*1024*1024)throw Error('Bitte eine PDF mit höchstens 2 MiB auswählen.');
      const response=await fetch(`/api/projects/${projectId}/documents/preview`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type||'application/octet-stream','X-Document-Label':encodeURIComponent(file.name),'X-Context-Revision':String(revision)},body:file});
      const data=await response.json();if(!response.ok)throw Error(messages[data.error]??'Die PDF konnte nicht verarbeitet werden. Bitte eine textbasierte PDF verwenden.');
      if(!mounted.current)return;
      setPreview(data);setNotice('Vorschläge extrahiert. Noch nichts im Unternehmensprofil gespeichert oder bestätigt.');
    } catch(e) {setError(e instanceof Error?e.message:'PDF konnte nicht gelesen werden.');} finally {setBusy(false);}
  }
  async function save() {
    if(!preview||busy||!ack||!selected.length)return;
    setBusy(true);setError('');setNotice('');
    try {
      await api(`/api/projects/${projectId}/documents/accept`,{token:preview.token,expectedRevision:preview.expectedRevision,candidateIds:selected,acknowledged:true});
      if(!mounted.current)return;
      setPreview(null);setSelected([]);setAck(false);setNotice('Auswahl gespeichert, noch nicht bestätigt. Bitte die neuen Fakten unten prüfen und ausdrücklich bestätigen. Bereits bestätigte Fakten bleiben erhalten.');
      await onSaved();
    } catch(e) {setError(e instanceof Error?e.message:'Auswahl konnte nicht gespeichert werden.');} finally {setBusy(false);}
  }
  return <section className="panel" aria-labelledby="pdf-import-title" aria-busy={busy}>
    <h2 id="pdf-import-title">PDF als Wissensquelle</h2>
    <p>Leistungen oder Unternehmensangaben aus einem Dokument übernehmen. Du wählst die Aussagen aus und bestätigst sie anschließend selbst.</p>
    <p className="quiet">Textbasierte PDF · höchstens 2 MiB und 20 Seiten · keine Texterkennung für Scans · keine Live-KI. Die Originaldatei wird nicht gespeichert. Ausgewählte Textbelege bleiben im Versionsverlauf.</p>
    {readOnly?<p>Für den PDF-Import brauchst du Schreibrechte.</p>:<form onSubmit={e=>void upload(e)}><label>Geschäftsdokument (PDF)<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setPreview(null);setSelected([]);setAck(false);setError('');setNotice('');}}/></label><button className="button secondary" disabled={!file||busy}>{busy?'PDF wird verarbeitet …':'PDF prüfen'}</button></form>}
    {error&&<p role="alert" className="pilot-error">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {preview&&<><h3>Extrahierte Vorschläge · ungeprüft</h3><p>{preview.label} · {preview.pages} {preview.pages===1?'Seite':'Seiten'}</p><p>Wähle nur zutreffende und aktuelle Angaben. Widersprüche zu bestehenden Fakten werden nicht automatisch aufgelöst. Die Auswahl ist 15 Minuten verfügbar.</p>{preview.omitted>0&&<p>{preview.omitted} ungeeignete oder sensible Textstellen wurden ausgelassen. Die Vorschläge sind keine vollständige Dokumentanalyse.</p>}
      <fieldset disabled={busy||readOnly}><legend>Aussagen zur Übernahme auswählen</legend>{preview.candidates.map(c=><article className="pilot-fact" key={c.id}><label className="pilot-checkbox"><input type="checkbox" checked={selected.includes(c.id)} onChange={e=>{setSelected(a=>e.target.checked?[...a,c.id]:a.filter(id=>id!==c.id));setAck(false);}}/><strong>{c.statement}</strong></label><p className="quiet">{preview.label} · Seite {c.page} · Extrahierter Vorschlag</p><blockquote>{c.snippet}</blockquote><p className="quiet">{c.caution}</p></article>)}</fieldset>
      <label className="pilot-checkbox"><input type="checkbox" checked={ack} disabled={busy||readOnly} onChange={e=>setAck(e.target.checked)}/>Ich habe die ausgewählten Aussagen mit dem Dokument und meinen bestehenden Angaben abgeglichen. Sie werden zunächst ungeprüft gespeichert.</label>
      <button className="button primary" disabled={busy||readOnly||!ack||!selected.length||revision!==preview.expectedRevision} onClick={()=>void save()}>Auswahl ungeprüft speichern</button>
      {revision!==preview.expectedRevision&&<p role="alert">Dein Unternehmensprofil hat sich geändert. Bitte die PDF erneut prüfen.</p>}
      <details><summary>Dokumentidentität und Verarbeitung</summary><p className="quiet" style={{overflowWrap:'anywhere'}}>SHA-256: {preview.digest}</p><p>Extrahiert: {new Date(preview.extractedAt).toLocaleString('de-DE')}. Kein Nachweis für Richtigkeit oder Veröffentlichung.</p></details>
    </>}
  </section>;
}
