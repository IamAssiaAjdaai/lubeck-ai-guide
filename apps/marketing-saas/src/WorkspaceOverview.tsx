import { useEffect, useState } from 'react';
import ContentLibrary, { CampaignCard, ContentThumbnail } from './ContentLibrary';
import WorkspaceHeroVisual from './WorkspaceHeroVisual';
import { ArrowRight, FileText, Images, FolderOpen, Layers, BookOpen, CalendarDays, Target, Sparkles, Clapperboard, Check, ShieldCheck } from 'lucide-react';
import { goalLabel, channelLabel, loadOverview, nextAction, type OverviewData, type OverviewProject } from './overview.data';

export default function WorkspaceOverview({ projects, activeProjectId, listOnly, onCreate, onMedia, onProfile, onDrafts, onResume }: {
  projects: OverviewProject[]; activeProjectId?: string; listOnly: boolean;
  onCreate: () => void; onMedia: () => void; onProfile: (pid?: string) => void;
  onDrafts: () => void; onResume: (pid: string, gid?: string) => void;
}) {
  const [retry, setRetry] = useState(0);
  const requestKey=JSON.stringify([projects,retry]);
  const [result,setResult]=useState<{key:string;data?:OverviewData;error?:boolean}|null>(null);
  useEffect(()=>{
    let active=true;
    void loadOverview(projects).then(data=>{if(active)setResult({key:requestKey,data});}).catch(()=>{if(active)setResult({key:requestKey,error:true});});
    return ()=>{active=false;};
  },[projects,requestKey]);
  const data=result?.key===requestKey?result.data:undefined;
  const error=result?.key===requestKey&&result.error;
  if(error) return <div className="overview-feedback"><p role="alert">Deine Übersicht konnte nicht vollständig geladen werden. Es werden keine unbestätigten Zahlen oder Status angezeigt.</p><button className="button secondary" onClick={()=>setRetry(n=>n+1)}>Erneut laden</button></div>;
  if(!data) return <p className="overview-feedback" role="status">Deine Unternehmen und Inhalte werden geladen …</p>;
  const action=nextAction(data,activeProjectId);
  const current=data.projects.find(p=>p.project.id===activeProjectId)??data.projects[0];
  const latest=data.entries.find(e=>e.projectId===current?.project.id&&e.kind==='pack'&&e.posts?.length);
  const heroPhoto=latest?.thumbnail?.role==='business_photo'?latest.thumbnail:undefined;
  const entries=data.entries.filter(e=>e.projectId===current?.project.id&&e!==latest).slice(0,3);
  const facts=current?.context?.facts.filter(f=>f.confirmation)??[];
  const city=current?.context?.markets?.find(m=>['owner-service-city','owner-city'].includes(m.id))?.name;
  const selectedEntries=data.entries.filter(e=>e.projectId===current?.project.id);
  const savedDrafts=selectedEntries.filter(e=>e.kind==='draft').length;
  const savedPacks=current?.packs.filter(p=>p.status==='completed').length??0;
  function continueNext() {
    if(action.kind==='profile')onProfile(action.projectId);
    else if(action.kind==='resume'&&action.projectId)onResume(action.projectId,action.generationId);
    else onCreate();
  }
  if(listOnly) return <div className="overview-content">
    {data.capped&&<p className="overview-limit">Die letzten 100 Aufträge je Unternehmen. Keine Laufzeit-Gesamtzahl.</p>}
    {data.entries.length?<ContentLibrary entries={data.entries} onResume={onResume}/>:<div className="workspace-empty"><FolderOpen size={26} aria-hidden="true"/><div><strong>Noch keine gespeicherten Inhalte.</strong><p>Dein erster Pack beginnt mit deinem Unternehmen und bestätigten Angaben.</p><button className="button primary" onClick={onCreate}>Inhalte vorbereiten<ArrowRight size={16} aria-hidden="true"/></button></div></div>}
  </div>;
  return <div className="overview-content reference-dashboard">
    <section className="reference-hero" aria-labelledby="overview-title">
      <div className="reference-hero-copy">
        <h1 id="overview-title">{latest?'Deine Inhalte. Bereit für deine Handschrift.':'Dein Marketing beginnt mit deinem Unternehmen.'}</h1>
        <p className="workspace-intro">{latest?'Prüfe deine Beiträge, verfeinere die Texte und gib frei, was zu deinem Unternehmen passt.':'Teile dein Wissen. Bereite passende Beiträge vor. Du behältst die letzte Entscheidung.'}</p>
      </div>
      <figure className="reference-hero-photo">
        <WorkspaceHeroVisual photo={heroPhoto} projectId={current?.project.id}/>
        <div className="reference-photo-note"><Sparkles size={24} aria-hidden="true"/><span>Dein Wissen.<br/>Dein Marketing.</span></div>
      </figure>
      <dl className="reference-metrics overview-kpis" aria-label="Deine gespeicherten Inhalte">
        <div><dt><FileText aria-hidden="true"/>Beiträge</dt><dd>{latest?.posts?.length??0}<span>{latest?'Gespeicherte Texte':'Noch kein Pack'}</span></dd></div>
        <div><dt><Layers aria-hidden="true"/>Entwürfe</dt><dd>{savedDrafts}<span>Ziel &amp; Kanal vorbereitet</span></dd></div>
        <div><dt><FolderOpen aria-hidden="true"/>Packs</dt><dd>{savedPacks}<span>Geladener Verlauf</span></dd></div>
        <div><dt><Clapperboard aria-hidden="true"/>Reels &amp; Stories</dt><dd className="metric-planned">Geplant<span>Noch nicht verfügbar</span></dd></div>
      </dl>
    </section>
        <section className="reference-next" aria-labelledby="new-content-title"><p className="card-kicker"><Sparkles size={21} aria-hidden="true"/>Dein nächster Schritt</p><h2 id="new-content-title">{action.title}</h2><p>{action.description}</p><button className="button primary" onClick={continueNext}>{action.label}<ArrowRight size={17} aria-hidden="true"/></button></section>
    <div className="reference-middle">
      <section className="reference-surface reference-strategy" aria-labelledby="strategy-title">
        <div className="section-heading"><h2 id="strategy-title"><span className="reference-icon"><Target aria-hidden="true"/></span>Deine Richtung</h2><span className="reference-meta">{latest?'Aus deinem Pack':'Noch offen'}</span></div>
        <div className="reference-direction-grid">
          <div><span className="reference-icon"><Target aria-hidden="true"/></span><p>Ziel</p><strong>{latest?goalLabel(latest.goal):current?.draft?goalLabel(current.draft.goal):'Dein nächster Schritt'}</strong></div>
          <div><span className="reference-icon lilac"><FileText aria-hidden="true"/></span><p>Kanal</p><strong>{latest?.channel??(current?.draft?channelLabel(current.draft.channel):'Noch nicht gewählt')}</strong></div>
          <div><span className="reference-icon yellow"><ShieldCheck aria-hidden="true"/></span><p>Grundlage</p><strong>{facts.length} bestätigte Angaben</strong></div>
        </div>
        <div className="reference-strategy-note"><Sparkles size={22} aria-hidden="true"/><p>Du bestimmst die Richtung. Eine übergreifende KI-Strategie ist <strong>geplant</strong>; ein Pack arbeitet mit einem Ziel und konkreten Aufgaben.</p></div>
      </section>
      <section className="reference-surface reference-week" aria-labelledby="week-title">
        <div className="section-heading"><h2 id="week-title"><span className="reference-icon neutral"><CalendarDays aria-hidden="true"/></span>Dein Aktionsplan</h2></div>
        <p className="reference-meta">{latest?.days?.length?'Gespeicherte Aufgaben · kein Versandkalender':latest?'Für diesen Pack liegt hier noch kein Aktionsplan vor.':'Ein 7-Tage-Plan gehört zu deinem ersten Pack.'}</p>
        {latest?.days?.length?<ol className="reference-week-list">{latest.days.slice(0,3).map(day=><li key={day.day}><span>Tag <strong>{day.day}</strong></span><div><strong>{day.time}</strong><p>{day.task}</p></div></li>)}</ol>:null}{latest?.days?.length?<details className="reference-all-days"><summary>Alle {latest.days.length} Aufgaben lesen</summary><ol>{latest.days.map(day=><li key={day.day}><strong>Tag {day.day} · {day.time}</strong><p>{day.task}</p></li>)}</ol></details>:<div className="reference-plan-empty"><CalendarDays size={30} aria-hidden="true"/><p>Noch keine Aufgaben vorbereitet.</p></div>}
      </section>
    </div>
    <div className="reference-lower">
      <section className="reference-surface reference-posts" aria-labelledby="current-pack-title">
        <div className="section-heading"><h2 id="current-pack-title"><span className="reference-icon"><FileText aria-hidden="true"/></span>Dein aktueller Marketing Pack</h2><button className="overview-text-action" onClick={onDrafts}>Alle Packs<ArrowRight size={16} aria-hidden="true"/></button></div>
        {latest?<><p className="reference-pack-context">{goalLabel(latest.goal)} · Version {latest.version} · <span>{latest.statusLabel}</span>{latest.originLabel?` · ${latest.originLabel}`:''}</p>
          <div className="reference-post-grid">{latest.posts!.map((post,i)=><article className="reference-post-card" key={i}>
            <header><span>{channelLabel(post.channel)} · {i+1}</span><span className="reference-post-state" data-approved={latest.approvedPostIndices?.includes(i)??false}>{latest.approvedPostIndices?.includes(i)?<><Check size={14} aria-hidden="true"/>Geprüft</>:'Prüfung offen'}</span></header>
            <ContentThumbnail thumbnail={latest.thumbnail?.postIndex===i?latest.thumbnail:undefined}/>
            <h3>Beitrag {i+1}</h3><p className="reference-post-text">{post.text||'Den gespeicherten Text im Pack ansehen.'}</p>
          </article>)}</div>
          <p className="reference-meta">{latest.dateLabel}: <time dateTime={latest.date}>{new Date(latest.date).toLocaleDateString('de-DE')}</time> · Bilder sind optional.</p><button className="overview-text-action" aria-label={`Weiter bearbeiten: ${latest.business}, ${goalLabel(latest.goal)}, Paket`} onClick={()=>onResume(latest.projectId,latest.generationId)}>Pack öffnen<ArrowRight size={16} aria-hidden="true"/></button>
        </>:<div className="workspace-empty"><FileText size={27} aria-hidden="true"/><div><strong>Hier wird dein erster Pack sichtbar.</strong><p>Drei Beiträge. Deine bestätigten Angaben. Deine Freigabe.</p></div></div>}
      </section>
      <aside className="reference-knowledge-column" aria-label="Dein Unternehmen und nächster Schritt">
        <section className="reference-surface overview-brand" aria-labelledby="overview-brand-title">
          <div className="section-heading"><h2 id="overview-brand-title"><span className="reference-icon"><BookOpen aria-hidden="true"/></span>Marke &amp; Wissen</h2></div>
          <strong>{current?.project.name??'Noch kein Unternehmen'}</strong>
          <dl className="reference-knowledge"><div><dt>Stadt</dt><dd>{city??'Noch nicht hinterlegt'}</dd></div><div><dt>Fakten</dt><dd>{facts.length} bestätigt</dd></div><div><dt>Bereitschaft</dt><dd>{current?.gate.ready?'Angaben für drei Themen vorhanden':'Angaben noch zu prüfen'}</dd></div></dl>
          <button className="overview-text-action" onClick={()=>onProfile(current?.project.id)}>Profil ansehen<ArrowRight size={16} aria-hidden="true"/></button>
        </section>

      </aside>
    </div>
    {data.capped&&<p className="overview-limit">Die letzten 100 Aufträge je Unternehmen. Keine Laufzeit-Gesamtzahl.</p>}
    {entries.length>0&&<section className="recent-content" aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">Zuletzt bearbeitet</h2><button className="overview-text-action" onClick={onDrafts}>Bibliothek öffnen<ArrowRight size={15} aria-hidden="true"/></button></div><div className="draft-list studio-recent">{entries.map(e=><CampaignCard key={`${e.projectId}-${e.id}`} entry={e} compact onResume={onResume}/>)}</div></section>}
    <section className="reference-future" aria-label="Ausblick auf dein Marketing-Team"><div><h2>Ein Team für dein Marketing. Schritt für Schritt.</h2><p>Heute: Texte, geprüfte Quellen und manueller Export. Strategie, Kalender, Reels und Stories sind geplant.</p><span className="reference-future-status">Geschlossener Pilot · keine Live-KI · kein automatisches Publishing</span></div><button className="button secondary" onClick={onMedia}><Images size={18} aria-hidden="true"/>Eigene Medien ansehen</button></section>
  </div>;
}
