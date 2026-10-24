import { api } from './api';

export type OverviewProject = { id: string; name: string; revision?: number };
type Context = { identity: { name: string }; facts: { confirmation?: unknown }[] } | null;
type Gate = { ready: boolean; reason: string; revision: number; questions: string[] };
type Draft = { goal: string; channel: string; savedAt: string };
type Generation = { id: string; status: string; goal: string; created_at: string; output_revision: number };
type Version = { version: number; created_at: string; content: { posts: { channel: string }[] } };
type Review = { postIndex: number; version: number; approved: boolean };
export type OverviewEntry = {
  id: string; projectId: string; business: string; goal: string; channel?: string;
  date: string; dateLabel: string; generationId?: string; kind: 'draft' | 'pack';
  statusLabel: string; pendingReview: boolean;
};
export type ProjectOverview = { project: OverviewProject; context: Context; gate: Gate; draft: Draft | null; packs: Generation[] };
export type OverviewData = { projects: ProjectOverview[]; entries: OverviewEntry[]; draftCount: number; packCount: number; capped: boolean };
export const goalLabel = (goal: string) => ({sichtbarkeit:'Bekannter werden',kundenbindung:'Kunden binden',aktion_bewerben:'Aktion bewerben',mehr_anfragen:'Mehr Anfragen'}[goal] ?? 'Marketing-Inhalte');
export const channelLabel = (channel?: string) => ({linkedin:'LinkedIn',instagram:'Instagram',facebook:'Facebook'}[channel ?? ''] ?? channel ?? '');

// Bound parallel reads. No writes, provider calls, new aggregate APIs or persisted approval guesses.
async function mapLimited<T, R>(items: T[], read: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length); let cursor = 0;
  await Promise.all(Array.from({length: Math.min(4, items.length)}, async () => {
    while (cursor < items.length) { const index = cursor++; result[index] = await read(items[index]); }
  }));
  return result;
}
export async function loadOverview(projects: OverviewProject[]): Promise<OverviewData> {
  const summaries = await mapLimited(projects, async project => {
    const root = `/api/projects/${encodeURIComponent(project.id)}`;
    const [detail, gate, draft, packs] = await Promise.all([
      api<{context: Context}>(root), api<Gate>(root+'/workspace/readiness'),
      api<Draft|null>(root+'/workspace/draft'), api<Generation[]>(root+'/packs'),
    ]);
    return {project, context: detail.context, gate, draft, packs};
  });
  const drafts: OverviewEntry[] = summaries.flatMap(({project, draft}) => draft?.savedAt ? [{
    id: 'draft-'+project.id, projectId: project.id, business: project.name, goal: draft.goal,
    channel: draft.channel, date: draft.savedAt, dateLabel: 'Zuletzt gespeichert', kind: 'draft',
    statusLabel: 'Gespeicherter Entwurf', pendingReview: false,
  }] : []);
  const packs = await mapLimited(summaries.flatMap(summary=>summary.packs.map(pack=>({summary,pack}))), async ({summary,pack}): Promise<OverviewEntry> => {
    const root = `/api/projects/${encodeURIComponent(summary.project.id)}`;
    const entry: OverviewEntry = { id:pack.id, projectId:summary.project.id, business:summary.project.name,
      goal:pack.goal, date:pack.created_at, dateLabel:'Erstellt', kind:'pack', pendingReview:false,
      statusLabel: ({running:'Wird erstellt',failed:'Erstellung fehlgeschlagen',unknown:'Ergebnis unklar'}[pack.status] ?? 'Status unklar'),
    };
    if (pack.status !== 'completed') return entry;
    const job = await api<{output_revision:number;versions:Version[]}>(`${root}/packs/${encodeURIComponent(pack.id)}`);
    const version = job.versions.find(v=>v.version===job.output_revision);
    if (!version || version.content.posts.length !== 3) throw Error('CURRENT_VERSION_UNAVAILABLE');
    const reviews = await api<Review[]>(`${root}/workspace/reviews/${encodeURIComponent(pack.id)}?version=${job.output_revision}`);
    const approved = [0,1,2].filter(i=>reviews.some(r=>r.postIndex===i && r.version===job.output_revision && r.approved===true)).length;
    return {...entry, generationId:pack.id, date:version.created_at, dateLabel:job.output_revision>1?'Zuletzt bearbeitet':'Erstellt',
      channel:[...new Set(version.content.posts.map(p=>channelLabel(p.channel)))].join(', '),
      statusLabel:approved===3?'Aktuelle Version geprüft':`Prüfung offen · ${3-approved} von 3 Beiträgen`, pendingReview:approved<3};
  });
  return {projects:summaries, entries:[...drafts,...packs].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)),
    draftCount:drafts.length,packCount:summaries.reduce((n,p)=>n+p.packs.filter(g=>g.status==='completed').length,0),
    capped:summaries.some(p=>p.packs.length===100)};
}
export function nextAction(data: OverviewData, activeProjectId?: string) {
  const current = data.projects.find(p=>p.project.id===activeProjectId) ?? data.projects[0];
  if (!current) return {kind:'profile' as const,title:'Dein Unternehmen ist der Anfang.',description:'Lege dein Unternehmen an. Ein Name reicht für den ersten Schritt.',label:'Unternehmen anlegen'};
  const projectId=current.project.id;
  if (!current.context || current.context.facts.length===0) return {kind:'profile' as const,projectId,title:'Gib deinem Marketing eine Grundlage.',description:'Importiere deine Website oder beschreibe dein Unternehmen in eigenen Worten.',label:'Unternehmensangaben ergänzen'};
  if (!current.context.facts.some(f=>f.confirmation)) return {kind:'profile' as const,projectId,title:'Prüfe zuerst deine Unternehmensfakten.',description:'Bestätige die Angaben, auf denen deine Beiträge beruhen sollen.',label:'Unternehmensfakten prüfen'};
  if (!current.gate.ready) return {kind:'profile' as const,projectId,title:current.gate.reason==='missing_themes'?'Noch fehlen Angaben für drei Themen.':'Deine Fakten brauchen eine weitere Prüfung.',description:current.gate.questions[0] ?? 'Bitte prüfe und ergänze deine bestätigten Angaben.',label:'Unternehmensangaben prüfen'};
  const draft=data.entries.find(e=>e.projectId===projectId&&e.kind==='draft');
  if(draft) return {kind:'resume' as const,projectId,title:'Deine Idee wartet auf den nächsten Schritt.',description:`${goalLabel(draft.goal)} · ${channelLabel(draft.channel)}. Dein gespeicherter Entwurf bleibt erhalten.`,label:'Entwurf fortsetzen'};
  const pending=data.entries.find(e=>e.projectId===projectId&&e.pendingReview);
  if(pending) return {kind:'resume' as const,projectId,generationId:pending.generationId,title:'Deine Inhalte sind bereit zur Prüfung.',description:`${pending.statusLabel}. Prüfe die aktuelle Text- und Bildversion vor dem Herunterladen.`,label:'Inhalte prüfen'};
  return {kind:'create' as const,projectId,title:'Was möchtest du als Nächstes erzählen?',description:'Plane drei passende Beiträge mit deinen bestätigten Unternehmensangaben.',label:'Neue Inhalte erstellen'};
}
