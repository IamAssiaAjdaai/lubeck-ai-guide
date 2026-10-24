import { useState } from 'react';
import { ArrowRight, FileText, ImageOff } from 'lucide-react';
import { goalLabel, channelLabel, type OverviewEntry } from './overview.data';

export function ContentThumbnail({ thumbnail }: { thumbnail?: OverviewEntry['thumbnail'] }) {
  const [failed, setFailed] = useState<string>();
  return thumbnail && failed !== thumbnail.url
    ? <img className="content-thumbnail" src={thumbnail.url} alt={thumbnail.alt} loading="lazy" onError={()=>setFailed(thumbnail.url)}/>
    : <span className="content-text-fallback"><FileText size={26} aria-hidden="true"/><span>{thumbnail?<><ImageOff size={14} aria-hidden="true"/>Bild nicht verfügbar</>:'Text im Mittelpunkt'}</span></span>;
}
export function CampaignCard({ entry: e, onResume, compact=false }: { entry:OverviewEntry; onResume:(pid:string,gid?:string)=>void; compact?:boolean }) {
  return <article className={`campaign-card ${compact?'compact-campaign':''}`}>
    <header className="campaign-card-header"><div><p className="studio-eyebrow">{e.kind==='draft'?'Dein Entwurf':'Marketing Pack'}{e.version?` · Version ${e.version}`:''}{e.originLabel?` · ${e.originLabel}`:''}</p><h3>{goalLabel(e.goal)}</h3><p>{e.business}{e.channel?` · ${channelLabel(e.channel)}`:''}</p></div><span className="overview-status" data-state={e.approvedCount===3?'approved':e.kind==='draft'?'draft':'pending'}>{e.statusLabel}</span></header>
    {compact?null:e.posts?.length?<div className="campaign-posts">{e.posts.slice(0,3).map((post,i)=><section className="content-post-preview" key={i} aria-label={`Beitrag ${i+1}`}>
      {e.thumbnail?.postIndex===i&&e.thumbnail?<ContentThumbnail thumbnail={e.thumbnail}/>:<div className="post-preview-top"><FileText size={21} aria-hidden="true"/><span>{channelLabel(post.channel)}</span></div>}
      <p className="studio-eyebrow">Beitrag {i+1} · {channelLabel(post.channel)}</p><p className="post-excerpt">{post.text||'Text im gespeicherten Pack ansehen.'}</p>
    </section>)}</div>:<div className="campaign-draft-note"><FileText size={24} aria-hidden="true"/><p>{e.kind==='draft'?'Ziel und Kanal sind gespeichert. Die Beiträge entstehen erst nach deiner Themenprüfung.':'Für diesen Auftrag liegt noch kein bearbeitbarer Inhalt vor.'}</p></div>}
    <footer className="campaign-card-footer"><span>{e.dateLabel}: <time dateTime={e.date}>{new Date(e.date).toLocaleDateString('de-DE')}</time></span>{e.kind==='draft'||e.generationId?<button className="button secondary" onClick={()=>onResume(e.projectId,e.generationId)} aria-label={`Weiter bearbeiten: ${e.business}, ${goalLabel(e.goal)}, ${e.kind==='draft'?'Entwurf':'Paket'}`}>{e.kind==='draft'?'Entwurf öffnen':'Pack öffnen'}<ArrowRight size={16} aria-hidden="true"/></button>:<span>Keine automatische Wiederholung.</span>}</footer>
  </article>;
}
export default function ContentLibrary({entries,onResume}:{entries:OverviewEntry[];onResume:(pid:string,gid?:string)=>void}) {
  const groups=[...new Set(entries.map(e=>e.projectId))];
  return <div className="content-library">{groups.map(pid=><section className="campaign-group" key={pid} aria-label={`Kampagnen für ${entries.find(e=>e.projectId===pid)!.business}`}><div className="section-heading"><h2>{entries.find(e=>e.projectId===pid)!.business}</h2><span>Gespeicherte Vorbereitung & Packs</span></div><div className="draft-list">{entries.filter(e=>e.projectId===pid).map(e=><CampaignCard key={e.id} entry={e} onResume={onResume}/>)}</div></section>)}</div>;
}
