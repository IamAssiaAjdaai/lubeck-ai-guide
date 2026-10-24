import { useEffect, useState } from 'react';
import ContentLibrary, { CampaignCard } from './ContentLibrary';
import { ArrowRight, FileText, Images, ChevronRight, FolderOpen, Layers, Building2 } from 'lucide-react';
import { loadOverview, nextAction, type OverviewData, type OverviewProject } from './overview.data';

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
  const entries=data.entries.filter(e=>e!==latest).slice(0,3);
  function continueNext() {
    if(action.kind==='profile')onProfile(action.projectId);
    else if(action.kind==='resume'&&action.projectId)onResume(action.projectId,action.generationId);
    else onCreate();
  }
  if(listOnly) return <div className="overview-content">
    {data.capped&&<p className="overview-limit">Die letzten 100 Aufträge je Unternehmen. Keine Laufzeit-Gesamtzahl.</p>}
    {data.entries.length?<ContentLibrary entries={data.entries} onResume={onResume}/>:<div className="workspace-empty"><FolderOpen size={26} aria-hidden="true"/><div><strong>Noch keine gespeicherten Inhalte.</strong><p>Dein erster Pack beginnt mit deinem Unternehmen und bestätigten Angaben.</p><button className="button primary" onClick={onCreate}>Inhalte vorbereiten<ArrowRight size={16} aria-hidden="true"/></button></div></div>}
  </div>;
  return <div className="overview-content">
    <div className="overview-top">
      <section className="workspace-start panel" aria-labelledby="new-content-title"><div className="start-copy"><div className="start-heading"><p className="card-kicker">Dein nächster Schritt</p><h2 id="new-content-title">{action.title}</h2></div><p>{action.description}</p><button className="button primary" onClick={continueNext}>{action.label}<ArrowRight size={17} aria-hidden="true"/></button></div></section>

    </div>
    <section aria-labelledby="current-pack-title"><div className="section-heading"><h2 id="current-pack-title">Dein aktueller Marketing Pack</h2><button className="overview-text-action" onClick={onDrafts}>Alle Packs<ArrowRight size={15} aria-hidden="true"/></button></div>
      {latest?<><CampaignCard entry={latest} onResume={onResume}/>{latest.days?.length?<details className="panel studio-plan-details"><summary>Der gespeicherte 7-Tage-Aktionsplan</summary><p>Aktivitäten aus diesem Pack. Kein geplanter Versand und keine automatisch erstellte Unternehmensstrategie.</p><ol className="studio-plan">{latest.days.map(day=><li key={day.day}><strong>Tag {day.day} · {day.time}</strong><p>{day.task}</p></li>)}</ol></details>:null}</>:<div className="workspace-empty"><FileText size={27} aria-hidden="true"/><div><strong>Hier wird dein erster Pack sichtbar.</strong><p>Drei Beiträge, eine gemeinsame Richtung und deine Prüfung. Noch wurden keine Inhalte vorbereitet.</p></div></div>}
    </section>
      <section className="overview-brand panel" aria-labelledby="overview-brand-title"><Building2 size={23} aria-hidden="true"/><h2 id="overview-brand-title">Deine Markengrundlage</h2><strong>{current?.project.name??'Noch kein Unternehmen'}</strong><div className="brand-facts"><strong>{current?.context?.facts.filter(f=>f.confirmation).length??0}</strong><span>bestätigte Angaben</span></div><p>{!current?.context?'Dein Wissen ist die Grundlage für passende Inhalte.':current.gate.ready?'Angaben für drei Themen vorhanden. Die Themenprüfung folgt vor der Erstellung.':'Die fehlenden Angaben klären wir vor der Erstellung.'}</p><button className="button secondary" onClick={()=>onProfile(current?.project.id)}>Profil ansehen<ArrowRight size={15} aria-hidden="true"/></button></section>
    <dl className="overview-kpis" aria-label="Deine gespeicherten Inhalte"><div><dt><FileText size={20} aria-hidden="true"/>Gespeicherte Entwürfe</dt><dd>{data.draftCount}<p>Ziel und Kanal für deinen nächsten Pack</p></dd></div><div><dt><Layers size={20} aria-hidden="true"/>Erstellte Pakete</dt><dd>{data.packCount}<p>Im geladenen Verlauf deiner Unternehmen</p></dd></div></dl>
    {data.capped&&<p className="overview-limit">Der Verlauf zeigt die letzten 100 Aufträge je Unternehmen. Keine Laufzeit-Gesamtzahl.</p>}
    <section className="recent-content" aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">Zuletzt bearbeitet</h2><button className="overview-text-action" onClick={onDrafts}>Bibliothek öffnen<ArrowRight size={15} aria-hidden="true"/></button></div>
      {entries.length?<div className="draft-list studio-recent">{entries.map(e=><CampaignCard key={`${e.projectId}-${e.id}`} entry={e} compact onResume={onResume}/>)}</div>:<div className="workspace-empty"><FolderOpen size={25} aria-hidden="true"/><div><strong>Noch keine weiteren Inhalte.</strong><p>Deine gespeicherten Entwürfe und weiteren Packs findest du hier.</p></div></div>}
    </section>
    <section className="planned-areas" aria-label="Ausblick auf dein Marketing-Team"><article><h2>Deine Strategie<span className="planned-label">Geplant</span></h2><p>Eine übergreifende Marketingstrategie ist noch nicht verfügbar. Heute arbeitest du mit einem Ziel und dem Aktionsplan deines Packs.</p></article><article><h2>Dein Kalender<span className="planned-label">Geplant</span></h2><p>Noch keine Terminplanung oder automatische Veröffentlichung. Auch Reels, Stories und Video bleiben geplant.</p></article></section>
    <button className="panel destination-card" onClick={onMedia}><span className="destination-icon"><Images size={24} aria-hidden="true"/></span><span className="destination-copy"><strong>Deine eigenen Bilder</strong><span>Freigegebene Quellen in deiner privaten Mediathek verwalten.</span></span><ChevronRight size={17} aria-hidden="true"/></button>
  </div>;
}
