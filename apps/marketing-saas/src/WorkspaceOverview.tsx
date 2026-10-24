import { useEffect, useState } from "react";
import { api } from "./api";
import { ArrowRight, FileText, Images, SquarePen, ChevronRight, FolderOpen } from "lucide-react";
type Project = {
    id: string;
    name: string;
};
type Entry = {
    id: string;
    projectId: string;
    business: string;
    goal: string;
    created_at: string;
    status: string;
    updated_at?: string;
    approved?: number;
    channel?: string;
    statusLabel?: string;
    generationId?:string;
};
export default function WorkspaceOverview({ projects, listOnly, onCreate, onMedia, onDrafts, onResume }: {
    projects: Project[];
    listOnly: boolean;
    onCreate: () => void;
    onMedia: () => void;
    onDrafts:()=>void;
    onResume: (pid: string, gid?: string) => void;
}) {
    const [items, setItems] = useState<Entry[]>([]), [error, setError] = useState("");
    useEffect(() => { let active = true; void Promise.all(projects.map(async p=>{
      const [packs,draft,gate]=await Promise.all([api<Omit<Entry,"projectId"|"business">[]>(`/api/projects/${p.id}/packs`),api<{goal:string;channel:string;savedAt:string;themesReviewed:boolean}|null>(`/api/projects/${p.id}/workspace/draft`),api<{ready:boolean}>(`/api/projects/${p.id}/workspace/readiness`)]);
      const rows:Entry[]=packs.map(v=>({...v,generationId:v.id,projectId:p.id,business:p.name}));
      if(draft?.savedAt&&(!rows.length||Date.parse(draft.savedAt)>Math.max(...rows.map(x=>Date.parse(x.updated_at??x.created_at)))))rows.push({id:'draft-'+p.id,projectId:p.id,business:p.name,goal:draft.goal,channel:draft.channel,created_at:draft.savedAt,status:'draft',statusLabel:gate.ready?'Entwurf':'Angaben fehlen'});
      return rows;
    })).then(groups => { if (active)
        setItems(groups.flat().sort((a, b) => Date.parse(b.updated_at ?? b.created_at) - Date.parse(a.updated_at ?? a.created_at))); }).catch(() => { if (active)
        setError("Deine Entwürfe konnten nicht geladen werden. Bitte neu laden."); }); return () => { active = false; }; }, [projects]);
    const entries = listOnly ? items : items.slice(0, 1);
    return <div className="overview-content">
      {error&&<p role="alert">{error}</p>}
      {!listOnly&&<>
        <section className="workspace-start panel" aria-labelledby="new-content-title">
          <div className="start-copy"><div className="start-heading"><span className="start-symbol" aria-hidden="true"><SquarePen size={25} strokeWidth={1.6}/></span><div><p className="card-kicker">Von deiner Idee zum Beitrag</p><h2 id="new-content-title">Neue Marketing-Inhalte</h2></div></div><p>Plane drei passende Beiträge. Feile an deinen Texten und ergänze Bilder, wenn du möchtest.</p><button className="button primary" onClick={onCreate}>Inhalte erstellen <ArrowRight size={16} aria-hidden="true"/><span className="sr-only"> →</span></button></div>
          <div className="start-composition" aria-hidden="true"><span className="composition-orbit"/><div className="composition-sheet sheet-back"><i/><i/><i/></div><div className="composition-sheet sheet-front"><span className="mini-mark"/><b>Deine nächste<br/>gute Idee.</b><span className="mini-line"/><span className="mini-line short"/><span className="mini-post-number">01 — 03</span></div><span className="composition-dot"/></div>
        </section>
        <div className="overview-links"><button className="panel destination-card" onClick={onDrafts}><span className="destination-icon"><FileText size={24} strokeWidth={1.5} aria-hidden="true"/></span><span className="destination-copy"><strong>Meine Entwürfe</strong><span>Gespeicherte Beiträge weiter bearbeiten.</span></span><ChevronRight size={17} aria-hidden="true"/></button><button className="panel destination-card" onClick={onMedia}><span className="destination-icon"><Images size={24} strokeWidth={1.5} aria-hidden="true"/></span><span className="destination-copy"><strong>Meine Medien</strong><span>Bilder, Logo und Markenfarben verwalten.</span></span><ChevronRight size={17} aria-hidden="true"/></button></div>
      </>}
      <section className="recent-content" aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">{listOnly?"Gespeicherte Kampagnen":"Zuletzt bearbeitet"}</h2><span>{listOnly?`${items.length} ${items.length===1?"Entwurf":"Entwürfe"}`:"Dein nächster Schritt"}</span></div>{!items.length?<div className="workspace-empty"><FolderOpen size={25} strokeWidth={1.5} aria-hidden="true"/><div><strong>Hier beginnt dein nächster Beitrag.</strong><p>Deine gespeicherten Entwürfe findest du später genau hier.</p></div></div>:<div className="draft-list">{entries.map(e=><article key={e.id}><span className="draft-thumbnail" aria-hidden="true"><FileText size={23} strokeWidth={1.5}/><span/></span><div className="draft-description"><h3>{e.business}</h3><p>{e.goal==="sichtbarkeit"?"Bekannter werden":e.goal==="kundenbindung"?"Kunden binden":e.goal==="aktion_bewerben"?"Aktion bewerben":"Mehr Anfragen"}{e.channel?` · ${e.channel}`:""}</p><small>Zuletzt geändert: {new Date(e.updated_at??e.created_at).toLocaleDateString("de-DE")} <span>·</span> {e.statusLabel??(e.status==="completed"?"Prüfung ausstehend":e.status==="failed"?"Aktualisierung erforderlich":"Entwurf")}</small></div><button className="button secondary" onClick={()=>onResume(e.projectId,e.generationId)}>Weiter bearbeiten <ArrowRight size={15} aria-hidden="true"/><span className="sr-only"> →</span></button></article>)}</div>}</section>
    </div>;
}
