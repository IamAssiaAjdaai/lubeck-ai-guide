import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, FileText, Plus, Trash2, X } from 'lucide-react';
import { api } from './api';
import { loadOverview, type OverviewEntry } from './overview.data';
import './calendar.css';

type Project = { id:string; name:string; role?:string };
type CalendarEntry = {
  id:string;generationId:string;postIndex:number;plannedAt:string;revision:number;
  channel:string;excerpt:string;status:'draft'|'review'|'ready'|'published';
  staleVersion:boolean;manualPublishedAt:string|null;
};
type CalendarResponse = {entries:CalendarEntry[];capped:boolean;manualPublishingOnly:true};
type View='week'|'month';
type Mode='add'|'detail';
const weekday=['Mo','Di','Mi','Do','Fr','Sa','So'];
const statusLabel:Record<CalendarEntry['status'],string>={
  draft:'Entwurf',review:'Zur Prüfung',ready:'Bereit zum Posten',published:'Manuell veröffentlicht',
};
function dayStart(date:Date):Date {return new Date(date.getFullYear(),date.getMonth(),date.getDate());}
function addDays(date:Date,n:number):Date {const result=new Date(date);result.setDate(result.getDate()+n);return dayStart(result);}
function weekStart(date:Date):Date {return addDays(dayStart(date),-((date.getDay()+6)%7));}
function dayKey(date:Date):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function forInput(iso:string):string {const date=new Date(iso);return `${dayKey(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;}
function rangeOf(date:Date,view:View){
  const from=view==='week'?weekStart(date):weekStart(new Date(date.getFullYear(),date.getMonth(),1));
  const to=view==='week'?addDays(from,7):addDays(from,42);
  return {from,to};
}
const dateTitle=(date:Date)=>new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(date);
const rangeLabel=(date:Date,view:View)=>view==='month'?dateTitle(date):`${new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short'}).format(weekStart(date))} – ${new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short',year:'numeric'}).format(addDays(weekStart(date),6))}`;
const humanDay=(date:Date)=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long'}).format(date);
const time=(iso:string)=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
const channel=(raw:string)=>({instagram:'Instagram',linkedin:'LinkedIn',facebook:'Facebook'}[raw.toLowerCase()]??raw);
const failure=(err:unknown)=>err instanceof Error?err.message:'Bitte erneut versuchen.';

export default function CalendarScreen({project,onCreate,onOpenPack}:{
  project:Project|null;onCreate:()=>void;onOpenPack:(gid:string)=>void;
}) {
  const [view,setView]=useState<View>('week');
  const [cursor,setCursor]=useState<Date>(()=>dayStart(new Date()));
  const [selectedDay,setSelectedDay]=useState<string>(()=>dayKey(new Date()));
  const [entries,setEntries]=useState<CalendarEntry[]>([]);
  const [capped,setCapped]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');
  const [reload,setReload]=useState(0);
  const [savedPosts,setSavedPosts]=useState<OverviewEntry[]>([]);
  const [packsLoading,setPacksLoading]=useState(false);
  const [drawer,setDrawer]=useState<Mode|null>(null);
  const [selectedPost,setSelectedPost]=useState('');
  const [plannedAt,setPlannedAt]=useState(()=>`${dayKey(new Date())}T12:00`);
  const [selectedEntry,setSelectedEntry]=useState<string|null>(null);
  const [confirmPublished,setConfirmPublished]=useState(false);
  const dialogRef=useRef<HTMLElement|null>(null);
  const returnFocusRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(!drawer)return;
    const dialog=dialogRef.current;
    if(!dialog)return;
    const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]'));
    controls()[0]?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setDrawer(null);return;}
      if(event.key!=='Tab')return;
      const enabled=controls();
      if(!enabled.length){event.preventDefault();dialog.focus();return;}
      const first=enabled[0],last=enabled[enabled.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[drawer]);
  useEffect(()=>{
    if(drawer)return;
    returnFocusRef.current?.focus();
  },[drawer]);

  const range=useMemo(()=>rangeOf(cursor,view),[cursor,view]);
  const from=range.from.toISOString();const to=range.to.toISOString();
  useEffect(()=>{
    if(!project){setEntries([]);return;}
    let alive=true;setLoading(true);setError('');
    void api<CalendarResponse>(`/api/projects/${encodeURIComponent(project.id)}/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(value=>{if(alive){setEntries(value.entries);setCapped(value.capped);}})
      .catch(e=>{if(alive){setEntries([]);setError(failure(e));}})
      .finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[project?.id,from,to,reload]);
  useEffect(()=>{
    if(!project){setSavedPosts([]);return;}
    let alive=true;setPacksLoading(true);
    void loadOverview([{id:project.id,name:project.name}]).then(data=>{
      if(alive)setSavedPosts(data.entries.filter(e=>e.projectId===project.id&&e.kind==='pack'&&e.posts?.length===3));
    }).catch(()=>{if(alive)setSavedPosts([]);}).finally(()=>{if(alive)setPacksLoading(false);});
    return ()=>{alive=false;};
  },[project?.id,reload]);

  const days=useMemo(()=>Array.from({length:view==='week'?7:42},(_,index)=>addDays(range.from,index)),[range.from,view]);
  const byDay=useMemo(()=>{
    const output:Record<string,CalendarEntry[]>={};
    for(const e of entries){const key=dayKey(new Date(e.plannedAt));(output[key]??=[]).push(e);}
    return output;
  },[entries]);
  const chosen=entries.find(entry=>entry.id===selectedEntry);
  const dayEntries=byDay[selectedDay]??[];
  const postOptions=savedPosts.flatMap(e=>(e.posts??[]).map((p,index)=>({
    value:`${e.generationId??e.id}:${index}`,
    label:`${channel(p.channel)} · Beitrag ${index+1} · ${p.text.slice(0,75)}`,
    description:p.text,
  })));
  function switchPeriod(direction:number){
    setCursor(now=>{const next=view==='week'?addDays(now,direction*7):new Date(now.getFullYear(),now.getMonth()+direction,1);setSelectedDay(dayKey(next));return next;});
    setSelectedEntry(null);setDrawer(null);
  }
  function openAdd(day?:string){
    returnFocusRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setInfo('');setError('');setSelectedPost('');
    setPlannedAt(`${day??selectedDay}T12:00`);setDrawer('add');setSelectedEntry(null);
  }
  function openDetail(entry:CalendarEntry){
    returnFocusRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setSelectedEntry(entry.id);setPlannedAt(forInput(entry.plannedAt));setConfirmPublished(false);
    setInfo('');setError('');setDrawer('detail');
  }
  async function save(event:FormEvent){
    event.preventDefault();if(!project||!selectedPost)return;
    const index=selectedPost.lastIndexOf(':');if(index<0)return;
    const parsed=new Date(plannedAt);
    if(Number.isNaN(parsed.getTime())){setError('Bitte ein gültiges Datum wählen.');return;}
    setBusy(true);setError('');setInfo('');
    try{
      await api(`/api/projects/${encodeURIComponent(project.id)}/calendar`,{
        generationId:selectedPost.slice(0,index),postIndex:Number(selectedPost.slice(index+1)),plannedAt:parsed.toISOString(),
      });
      setInfo('Beitrag eingeplant. Du veröffentlichst weiterhin selbst.');
      setDrawer(null);setCursor(parsed);setSelectedDay(dayKey(parsed));setReload(v=>v+1);
    }catch(err){setError(failure(err));}finally{setBusy(false);}
  }
  async function change(action:'move'|'remove'|'mark_published'){
    if(!project||!chosen)return;
    if(action==='mark_published'&&!confirmPublished)return;
    const movedDate=new Date(plannedAt);
    if(action==='move'&&!Number.isFinite(movedDate.getTime())){setError('Bitte ein gültiges Datum wählen.');return;}
    const payload=action==='move'?{action,expectedRevision:chosen.revision,plannedAt:movedDate.toISOString()}
      :action==='remove'?{action,expectedRevision:chosen.revision}
      :{action,expectedRevision:chosen.revision,acknowledged:true};
    setBusy(true);setError('');setInfo('');
    try{
      await api(`/api/projects/${encodeURIComponent(project.id)}/calendar/${encodeURIComponent(chosen.id)}`,payload);
      setInfo(action==='move'?'Termin aktualisiert.':action==='remove'?'Termin aus dem Kalender entfernt.':'Als manuell veröffentlicht notiert – nicht durch das soziale Netzwerk bestätigt.');
      setDrawer(null);setSelectedEntry(null);setReload(v=>v+1);
    }catch(err){setError(failure(err));}finally{setBusy(false);}
  }
  if(!project)return <section className="w-calendar-blank"><CalendarDays aria-hidden="true" size={32}/><h2>Zuerst dein Unternehmen wählen</h2><p>Plane deine Inhalte innerhalb eines Unternehmens.</p><button type="button" className="button primary" onClick={onCreate}>Unternehmen anlegen <ArrowRight size={16}/></button></section>;
  const readOnly=project.role==='viewer';
  return <section className="w-calendar-page" aria-label="Content-Kalender">
    <div className="w-calendar-top">
      <div><p className="w-calendar-eyebrow">DEIN MARKETING · DEINE PLANUNG</p><h1>Dein Content-Kalender</h1><p>Plane deine gespeicherten Beiträge. Du veröffentlichst sie selbst.</p></div>
      <button type="button" className="button primary w-calendar-new" disabled={readOnly} onClick={()=>openAdd()}><Plus size={18} aria-hidden="true"/> Beitrag planen</button>
    </div>
    <div className="w-calendar-toolbar">
      <div role="group" aria-label="Kalenderansicht" className="w-calendar-switch">
        <button type="button" aria-pressed={view==='week'} onClick={()=>setView('week')}>Woche</button>
        <button type="button" aria-pressed={view==='month'} onClick={()=>setView('month')}>Monat</button>
      </div>
      <div className="w-calendar-month-nav"><button type="button" aria-label="Vorheriger Zeitraum" onClick={()=>switchPeriod(-1)}><ChevronLeft size={20}/></button><strong>{rangeLabel(cursor,view)}</strong><button type="button" aria-label="Nächster Zeitraum" onClick={()=>switchPeriod(1)}><ChevronRight size={20}/></button></div>
      <button type="button" className="w-calendar-today" onClick={()=>{setCursor(dayStart(new Date()));setSelectedDay(dayKey(new Date()));setDrawer(null);}}>Heute</button>
    </div>
    <div className="w-calendar-status-legend" aria-label="Statuslegende">
      {(['draft','review','ready','published'] as const).map(status=><span key={status}><i className={`w-calendar-dot ${status}`}/>{statusLabel[status]}</span>)}
    </div>
    {error&&<p role="alert" className="w-calendar-error">{error}</p>}
    {info&&<p role="status" className="w-calendar-success">{info}</p>}
    {capped&&<p className="w-calendar-info">Zu viele Einträge für diese Ansicht. Wähle einen kürzeren Zeitraum.</p>}
    <div className="w-calendar-layout">
      <div className="w-calendar-main">
        <div className={`w-calendar-grid ${view}`} aria-busy={loading}>
          {days.map((date,index)=>{
            const key=dayKey(date);const events=byDay[key]??[];const isSelected=selectedDay===key;const isToday=dayKey(new Date())===key;
            return <div key={key} className={`w-calendar-day ${isSelected?'selected':''} ${isToday?'today':''} ${view==='month'&&date.getMonth()!==cursor.getMonth()?'outside':''}`}>
              <button type="button" className="w-calendar-day-head" aria-pressed={isSelected} onClick={()=>setSelectedDay(key)}><span>{weekday[index%7]}</span><strong>{date.getDate()}</strong></button>
              <div className="w-calendar-day-events">
                {events.map(e=><button type="button" key={e.id} className={`w-calendar-event ${e.status}`} onClick={()=>{setSelectedDay(key);openDetail(e);}} title={`${time(e.plannedAt)} ${e.excerpt}`}>
                  <span>{time(e.plannedAt)} · {channel(e.channel)}</span><strong>{e.excerpt||'Gespeicherter Beitrag'}</strong><small>{statusLabel[e.status]}{e.staleVersion&&e.status!=='published'?' · Neu prüfen':''}</small>
                </button>)}
              </div>
              {events.length===0&&view==='week'&&<button type="button" className="w-calendar-add-day" disabled={readOnly} onClick={()=>openAdd(key)} aria-label={`Beitrag für ${humanDay(date)} planen`}><Plus size={17} aria-hidden="true"/> Planen</button>}
            </div>;
          })}
          {loading&&<p role="status" className="w-calendar-loading">Kalender wird geladen …</p>}
        </div>
      </div>
      <aside className="w-calendar-side" aria-label="Ausgewählter Tag">
        <div className="w-calendar-side-heading"><CalendarDays size={22} aria-hidden="true"/><div><span>AUSGEWÄHLTER TAG</span><h2>{humanDay(new Date(`${selectedDay}T12:00`))}</h2></div></div>
        {dayEntries.length?dayEntries.map(e=><button key={e.id} type="button" className="w-calendar-side-entry" onClick={()=>openDetail(e)}><small>{time(e.plannedAt)} · {channel(e.channel)}</small><strong>{e.excerpt}</strong><span className={`w-calendar-state ${e.status}`}>{statusLabel[e.status]}</span></button>)
        :<div className="w-calendar-empty"><CalendarDays size={32} aria-hidden="true"/><strong>Noch kein Beitrag geplant</strong><p>Wähle einen gespeicherten Beitrag und ein Datum.</p></div>}
        <button type="button" disabled={readOnly} className="button secondary w-calendar-aside-add" onClick={()=>openAdd(selectedDay)}><Plus size={16} aria-hidden="true"/> Beitrag für diesen Tag</button>
        <p className="w-calendar-note"><CheckCircle2 size={17} aria-hidden="true"/> Keine automatische Veröffentlichung. Alle Freigaben bleiben bei dir.</p>
      </aside>
    </div>
    <div className="w-calendar-footer"><FileText size={20} aria-hidden="true"/><p>Deine Content Packs bleiben die Quelle. Der Kalender speichert nur Termine und zeigt den aktuellen Prüfstatus.</p><button type="button" onClick={onCreate}>Inhalt erstellen <ArrowRight size={15} aria-hidden="true"/></button></div>
    {drawer&&<div className="w-calendar-drawer-cover" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDrawer(null);}}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="w-calendar-dialog-title" tabIndex={-1} className="w-calendar-drawer">
        <div className="w-calendar-drawer-title"><h2 id="w-calendar-dialog-title">{drawer==='add'?'Beitrag planen':'Geplanter Beitrag'}</h2><button type="button" aria-label="Schließen" onClick={()=>setDrawer(null)}><X size={21}/></button></div>
        {drawer==='add'?<form onSubmit={e=>void save(e)} className="w-calendar-form">
          <label htmlFor="w-calendar-source">Aus bestehendem Content Pack</label>
          {packsLoading?<p role="status">Gespeicherte Beiträge werden geladen …</p>:postOptions.length? <select id="w-calendar-source" required value={selectedPost} onChange={e=>setSelectedPost(e.target.value)}><option value="">Beitrag auswählen</option>{postOptions.map(p=><option value={p.value} key={p.value}>{p.label}</option>)}</select>:<p>Du hast noch keinen gespeicherten Marketing Pack mit Beiträgen. Erstelle zuerst Inhalte.</p>}
          <button type="button" className="w-calendar-link" onClick={onCreate}>Neuen Inhalt erstellen <ArrowRight size={15}/></button>
          <label htmlFor="w-calendar-when">Datum und Uhrzeit</label>
          <input id="w-calendar-when" type="datetime-local" required value={plannedAt} onChange={e=>setPlannedAt(e.target.value)}/>
          <p className="w-calendar-note">Der Termin plant nur deine Arbeit. Wirkfaden veröffentlicht nichts automatisch.</p>
          <button type="submit" className="button primary" disabled={busy||!selectedPost||readOnly}>{busy?'Wird gespeichert …':'Beitrag einplanen'}</button>
        </form>:chosen?<div className="w-calendar-form">
          <div className="w-calendar-detail-post"><small>{channel(chosen.channel)} · Beitrag {chosen.postIndex+1}</small><strong>{chosen.excerpt}</strong><span className={`w-calendar-state ${chosen.status}`}>{statusLabel[chosen.status]}</span>{chosen.staleVersion&&<p>Inhalt oder Unternehmenswissen wurde geändert. Bitte erneut prüfen.</p>}</div>
          <button type="button" className="w-calendar-link" onClick={()=>onOpenPack(chosen.generationId)}>Im Content Pack öffnen <ArrowRight size={15}/></button>
          <label htmlFor="w-calendar-move">Termin verschieben</label><input id="w-calendar-move" type="datetime-local" value={plannedAt} onChange={e=>setPlannedAt(e.target.value)} disabled={Boolean(chosen.manualPublishedAt)||readOnly}/>
          <button type="button" className="button secondary" disabled={busy||Boolean(chosen.manualPublishedAt)||readOnly} onClick={()=>void change('move')}>Termin speichern</button>
          {chosen.status==='ready'&&<div className="w-calendar-confirm"><label><input type="checkbox" checked={confirmPublished} onChange={e=>setConfirmPublished(e.target.checked)}/> Ich bestätige: Diesen Beitrag habe ich außerhalb von Wirkfaden selbst veröffentlicht.</label><button type="button" className="button primary" disabled={busy||!confirmPublished||readOnly} onClick={()=>void change('mark_published')}>Manuelle Veröffentlichung notieren</button></div>}
          {chosen.status==='published'&&<p className="w-calendar-note">Nur deine eigene Bestätigung, keine Prüfung durch Instagram, LinkedIn oder Facebook.</p>}
          {chosen.status!=='ready'&&chosen.status!=='published'&&<p className="w-calendar-note">Für „Bereit zum Posten“ musst du den aktuellen Post zuerst im Content Pack freigeben.</p>}
          {chosen.status!=='published'&&<button type="button" className="w-calendar-delete" disabled={busy||readOnly} onClick={()=>{if(window.confirm('Diesen Termin aus deinem Kalender entfernen? Der Inhalt bleibt im Pack.'))void change('remove');}}><Trash2 size={16}/> Termin entfernen</button>}
        </div>:<p>Der Eintrag ist nicht mehr verfügbar. Lade den Kalender erneut.</p>}
        {error&&<p role="alert" className="w-calendar-error">{error}</p>}
      </section>
    </div>}
  </section>;
}
