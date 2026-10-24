import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Images, SquarePen, ChevronRight, FolderOpen, Layers, Building2, ShieldCheck } from 'lucide-react';
import { channelLabel, goalLabel, loadOverview, nextAction, type OverviewData, type OverviewProject } from './overview.data';

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
  const entries=listOnly?data.entries:data.entries.slice(0,3);
  function continueNext() {
    if(action.kind==='profile')onProfile(action.projectId);
    else if(action.kind==='resume'&&action.projectId)onResume(action.projectId,action.generationId);
    else onCreate();
  }
  return <div className="overview-content">
    {!listOnly&&<>
      <div className="overview-top">
        <section className="workspace-start panel" aria-labelledby="new-content-title">
          <div className="start-copy"><div className="start-heading"><span className="start-symbol" aria-hidden="true"><SquarePen size={24}/></span><div><p className="card-kicker">Dein nächster Schritt{current?` · ${current.project.name}`:''}</p><h2 id="new-content-title">{action.title}</h2></div></div><p>{action.description}</p><button className="button primary" onClick={continueNext}>{action.label}<ArrowRight size={17} aria-hidden="true"/></button></div>
        </section>
        <section className="overview-brand panel" aria-labelledby="overview-brand-title"><Building2 size={23} aria-hidden="true"/><h2 id="overview-brand-title">Dein Unternehmen</h2><strong>{current?.project.name??'Noch kein Unternehmen'}</strong><p>{!current?.context?'Deine Angaben machen den Unterschied.':current.gate.ready?'Bestätigte Angaben für drei Themen vorhanden.':'Deine Angaben werden vor der Erstellung geprüft.'}</p><span className="overview-control"><ShieldCheck size={17} aria-hidden="true"/>Deine Prüfung. Deine Freigabe.</span><button className="button secondary" onClick={()=>onProfile(current?.project.id)}>Profil ansehen<ArrowRight size={15} aria-hidden="true"/></button></section>
      </div>
      <dl className="overview-kpis" aria-label="Deine gespeicherten Inhalte"><div><dt><FileText size={20} aria-hidden="true"/>Gespeicherte Entwürfe</dt><dd>{data.draftCount}<p>Deine Kampagnenvorbereitung</p></dd></div><div><dt><Layers size={20} aria-hidden="true"/>Erstellte Pakete</dt><dd>{data.packCount}<p>Im geladenen Verlauf deiner Unternehmen</p></dd></div></dl>
      {data.capped&&<p className="overview-limit">Der Verlauf zeigt höchstens die letzten 100 Aufträge je Unternehmen. Die Paketzahl ist keine Gesamtzahl über die gesamte Laufzeit.</p>}
    </>}
    <section className="recent-content" aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">{listOnly?'Gespeicherte Kampagnen':'Zuletzt bearbeitet'}</h2>{!listOnly&&data.entries.length>3&&<button className="overview-text-action" onClick={onDrafts}>Alle anzeigen<ArrowRight size={15} aria-hidden="true"/></button>}</div>
      {!data.entries.length?<div className="workspace-empty"><FolderOpen size={25} aria-hidden="true"/><div><strong>Noch keine gespeicherten Inhalte.</strong><p>Deine Entwürfe und erstellten Pakete findest du später hier.</p></div></div>:<div className="draft-list">{entries.map(e=><article key={`${e.projectId}-${e.id}`}><span className="draft-thumbnail" aria-hidden="true"><FileText size={23}/><span/></span><div className="draft-description"><h3>{e.business}</h3><p>{goalLabel(e.goal)}{e.channel?` · ${channelLabel(e.channel)}`:''}</p><span className="overview-status" data-kind={e.kind}>{e.statusLabel}</span><small>{e.dateLabel}: <time dateTime={e.date}>{new Date(e.date).toLocaleDateString('de-DE')}</time></small></div>{e.kind==='draft'||e.generationId?<button className="button secondary" onClick={()=>onResume(e.projectId,e.generationId)} aria-label={`Weiter bearbeiten: ${e.business}, ${goalLabel(e.goal)}, ${e.kind==='draft'?'Entwurf':'Paket'}`}>Weiter bearbeiten<ArrowRight size={15} aria-hidden="true"/><span className="sr-only"> →</span></button>:<p className="overview-job-note">Noch kein bearbeitbares Paket. Keine automatische Wiederholung.</p>}</article>)}</div>}
    </section>
    {!listOnly&&<div className="overview-links"><button className="panel destination-card" onClick={onDrafts}><span className="destination-icon"><FileText size={24} aria-hidden="true"/></span><span className="destination-copy"><strong>Meine Inhalte</strong><span>Entwürfe und Pakete weiter bearbeiten.</span></span><ChevronRight size={17} aria-hidden="true"/></button><button className="panel destination-card" onClick={onMedia}><span className="destination-icon"><Images size={24} aria-hidden="true"/></span><span className="destination-copy"><strong>Marke & Medien</strong><span>Eigene Bilder, Logo und Markenfarben.</span></span><ChevronRight size={17} aria-hidden="true"/></button></div>}
  </div>;
}
