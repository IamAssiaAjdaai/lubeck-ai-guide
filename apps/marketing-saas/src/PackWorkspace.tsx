import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "./api";
import { MessageCircle, Megaphone, HeartHandshake, CalendarDays, ArrowRight, Check, CheckCircle2, Circle, ImagePlus, FileText, Download, ShieldCheck } from "lucide-react";
import CreativeStudio from "./CreativeStudio";
import { customerArchive } from "./customerArchive";
import type { Pack } from "../../marketing-saas-api/src/pack.contract";
import type { Sufficiency } from "../../marketing-saas-api/src/sufficiency";
type Project = {
    id: string;
    name: string;
};
type Job = {
    id: string;
    status: string;
    provider: string;
    model: string;
    output_revision: number;
    context_revision: number;
    versions: {
        version: number;
        content: Pack;
    }[];
};
type Ref = {
    kind: "asset" | "job";
    id: string;
} | null;
type Review = {
    version: number;
    postIndex: number;
    approved: boolean;
    textApproved: boolean;
    image: Ref;
};
type Media = {
    assets: {
        id: string;
        name: string;
        status: string;
    }[];
    jobs: {
        id: string;
        state: string; attached: boolean;
        reviewed: boolean;
        stale: boolean;
        expired: boolean;
        expiresAt: string;
        brief: {
            binding: {
                generationId: string;
                postIndex: number;
                version: number;
            };
        };
    }[];
};
type Usage = {
    remaining: number;
    allocation: number;
    used: number;
    demo: boolean;
    plan: string;
    costEur: number;
    budgetEur: number;
    priceHypothesisExVat: number;
};
type Draft = {
    goal: string;
    audience: string;
    channel: string;
    themesReviewed: boolean;
    expectedRevision: number;
};
const goals = [
 {value:"mehr_anfragen",label:"Mehr Anfragen",help:"Neue Kunden erreichen",icon:MessageCircle},
 {value:"sichtbarkeit",label:"Bekannter werden",help:"Dein Unternehmen zeigen",icon:Megaphone},
 {value:"kundenbindung",label:"Kunden binden",help:"Im Kontakt bleiben",icon:HeartHandshake},
 {value:"aktion_bewerben",label:"Aktion bewerben",help:"Ein Angebot vorstellen",icon:CalendarDays},
];
export default function PackWorkspace({ projects, initialProjectId, initialGenerationId, usageOnly = false, onDirtyChange, onProfile }: {
    projects: Project[];
    initialProjectId?: string;
    initialGenerationId?: string;
    usageOnly?: boolean;
    onDirtyChange?: (v: boolean) => void;
    onProfile: () => void;
}) {
    const pid = initialProjectId ?? projects[0]?.id ?? "", root = `/api/projects/${pid}`;
    const [step, setStep] = useState(initialGenerationId ? 3 : 1), [goal, setGoal] = useState("mehr_anfragen"), [audience, setAudience] = useState(""), [channel, setChannel] = useState("instagram");
    const [gate, setGate] = useState<(Sufficiency & {
        revision: number;
    }) | null>(null), [usage, setUsage] = useState<Usage | null>(null), [job, setJob] = useState<Job | null>(null), [version, setVersion] = useState(1), [posts, setPosts] = useState<string[]>([]), [hooks, setHooks] = useState<string[]>([]), [cta, setCta] = useState("");
    const [creativeRefresh,setCreativeRefresh]=useState(0);
    const [post, setPost] = useState(0), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [themesReviewed, setThemesReviewed] = useState(false), [ack, setAck] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]), [images, setImages] = useState<Ref[]>([null, null, null]), [media, setMedia] = useState<Media | null>(null), [loading, setLoading] = useState(true);
    const [clock, setClock] = useState(() => Date.now());
    useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
    const key = useRef<string | null>(null), scroll = useRef<number[]>([0, 0, 0]);
    const current = job?.versions.find(v => v.version === version)?.content;
    const locked = dirty || !!job && version !== job.output_revision;
    function display(j: Job, v = j.output_revision) { setReviews([]); setImages([null,null,null]); setJob(j); setVersion(v); const c = j.versions.find(x => x.version === v)?.content; if (c) {
        setPosts(c.posts.map(p => p.text));
        setHooks(c.hooks);
        setCta(c.cta);
    } setDirty(false); setAck(false); setStep(3); }
    async function loadReviews(j = job, v = version) { if (!j)
        return; const r = await api<Review[]>(`${root}/workspace/reviews/${j.id}?version=${v}`); setReviews(r); setImages(r.map(x => x.image)); }
    const loadMedia = useCallback(async () => { try {
        setMedia(await api<Media>(`${root}/creative`));
    }
    catch {
        setMedia(null);
    } }, [root]);
    async function perform(fn: () => Promise<void>) { setBusy(true); setError(""); setNotice(""); try {
        await fn();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Bitte erneut versuchen.");
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => { let active = true; if (!pid)
        return; void Promise.all([api<Sufficiency & {
            revision: number;
        }>(`${root}/workspace/readiness`), api<Usage>(`${root}/usage`), api<Draft | null>(`${root}/workspace/draft`)]).then(async ([g, u, d]) => { if (!active)
        return; setGate(g); setUsage(u); if (d) {
        setGoal(d.goal);
        setAudience(d.audience);
        setChannel(d.channel);
        setThemesReviewed(d.themesReviewed && d.expectedRevision === g.revision);
    } if (initialGenerationId) {
        const j = await api<Job>(`${root}/packs/${initialGenerationId}`);
        if (active)
            display(j);
    } await loadMedia(); }).catch(e => { if (active)
        setError(e.message); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [pid, root, initialGenerationId, loadMedia]);
    useEffect(() => { let active = true; if (job)
        void api<Review[]>(`${root}/workspace/reviews/${job.id}?version=${version}`).then(r => { if (active) {
            setReviews(r);
            setImages(r.map(x => x.image));
        } }).catch(e => { if (active)
            setError(e.message); }); return () => { active = false; }; }, [job, root, version]);
    useEffect(() => { onDirtyChange?.(dirty); if (!dirty)
        return; const prevent = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent); }, [dirty, onDirtyChange]);
    async function saveDraft(approved = false) { await api(`${root}/workspace/draft`, { goal, audience, channel, expectedRevision: gate?.revision ?? 0, themesReviewed: approved }); }
    async function next(e: FormEvent) { e.preventDefault(); await perform(async () => { await saveDraft(); setGate(await api(`${root}/workspace/readiness`)); setStep(2); setThemesReviewed(false); }); }
    async function generate() { await perform(async () => { await saveDraft(true); key.current ??= crypto.randomUUID(); const j = await api<Job>(`${root}/packs`, { expectedRevision: gate!.revision, goal: goal === "aktion_bewerben" ? "sichtbarkeit" : goal, audience, channels: [channel], language: "de-DE", idempotencyKey: key.current }); if (j.status !== "completed") {
        setNotice("Die Erstellung ist gerade nicht verfügbar. Dein Entwurf bleibt gespeichert. Ein unklarer Auftrag wird nicht automatisch wiederholt.");
        return;
    } display(j); key.current = null; setUsage(await api(`${root}/usage`)); }); }
    async function save() { await perform(async () => { if (!job)
        return; const j = await api<Job>(`${root}/packs/${job.id}/edit`, { expectedVersion: job.output_revision, posts, hooks, cta }); display(j); setNotice("Änderungen gespeichert. Bitte die aktuelle Version erneut prüfen."); await loadMedia(); }); }
    function edit(index: number, value: string) { setPosts(p => p.map((s, i) => i === index ? value : s)); setDirty(true); setAck(false); }
    const textApproved = (i: number) => !dirty && version === job?.output_revision && reviews[i]?.version===version && !!reviews[i]?.textApproved;
    const mediaAvailable=(i:number)=>{const ref=images[i];if(!ref)return true;if(ref.kind==='asset')return !!media?.assets.some(a=>a.id===ref.id&&a.status==='approved');const j=media?.jobs.find(j=>j.id===ref.id);return !!j&&j.attached&&j.reviewed&&!j.stale&&!j.expired&&clock<Date.parse(j.expiresAt);};
    const approved = (i: number) => mediaAvailable(i) && textApproved(i) && reviews[i]?.approved && JSON.stringify(reviews[i]?.image) === JSON.stringify(images[i]);
    const allTexts = [0, 1, 2].every(textApproved), allCombined = [0, 1, 2].every(approved);
    async function approve() { if (!job)
        return; await perform(async () => { await api(`${root}/workspace/reviews/${job.id}`, { expectedVersion: version, postIndex: post, image: images[post], acknowledged: true }); await loadReviews(); setAck(false); setNotice(`Post ${post + 1} wurde für diesen gespeicherten Stand freigegeben.`); }); }
    async function download(scope: "texts" | "campaign") { if (!job)
        return; await perform(async () => { const result = await api<{
        files: {
            name: string;
            base64: string;
        }[];
    }>(`${root}/workspace/export/${job.id}`, { expectedVersion: version, scope }); const bytes = customerArchive(result.files); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" })); const a = document.createElement('a'); a.href = url; a.download = scope === 'texts' ? 'marketing-texte.zip' : 'marketing-kampagne.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Heruntergeladen. Du veröffentlichst selbst.'); }); }
    async function copyTexts(){if(!job)return;await perform(async()=>{const r=await api<{files:{name:string;base64:string}[]}>(`${root}/workspace/export/${job.id}`,{expectedVersion:version,scope:"texts"});await navigator.clipboard.writeText(r.files.filter(f=>f.name.endsWith("beitrag.md")).map(f=>new TextDecoder().decode(Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0)))).join("\n\n"));setNotice("In die Zwischenablage kopiert.");});}
    function switchPost(i: number) { scroll.current[post] = window.scrollY; setPost(i); setAck(false); requestAnimationFrame(() => window.scrollTo({ top: scroll.current[i], behavior: 'instant' })); }
    if (!pid)
        return <section className="panel"><h2>Dein Unternehmen zuerst</h2><p>Lege dein Unternehmen an und prüfe seine Angaben.</p><button className="button primary" onClick={onProfile}>Unternehmen anlegen →</button></section>;
    if (loading)
        return <p role="status">Deine Inhalte werden geladen …</p>;
    return <div className="simple-pack">
 {error && <p role="alert" className="pilot-error">{error}</p>}{notice && <p role="status" className="workspace-notice">{notice}</p>}
 {usageOnly ? <section className="panel"><h2>Dein Kontingent</h2><p>{usage?.remaining} von {usage?.allocation} Packs verfügbar</p><p>Vorhandene Inhalte bearbeiten und exportieren verbraucht keine Packs.</p><details><summary>Plan und Kostenrahmen</summary><p>{usage?.plan} · Preishypothese {usage?.priceHypothesisExVat} € / Monat zzgl. USt. Kein aktiver Online-Abschluss.</p><p>Erfasste Kosten/Reservierungen: {usage?.costEur.toFixed(4)} € von {usage?.budgetEur.toFixed(2)} €. Unklare Kosten bleiben reserviert.</p></details></section> : <>
 <ol className="creation-steps" aria-label="Inhalte erstellen – Schritte">{['Ziel & Kanal', 'Informationen prüfen', 'Prüfen & herunterladen'].map((s, i) => <li key={s} data-complete={step>i+1} aria-current={step === i + 1 ? 'step' : undefined}><span className="step-number">{step>i+1?<Check size={12} aria-hidden="true"/>:i+1}</span><span className="step-label-full">{s}</span><span className="step-label-short">{['Ziel & Kanal','Fakten','Prüfen'][i]}</span></li>)}</ol>
 {step === 1 && <section className="panel create-step"><h1>Was möchtest du erreichen?</h1><p className="step-intro">Wähle ein Ziel – daraus wird der rote Faden für deine Beiträge.</p><form onSubmit={next}><fieldset className="goal-options"><legend className="sr-only">Dein Marketingziel</legend>{goals.map(({value,label,help,icon:Icon})=><label key={value} className={goal===value?'selected':''}><input type="radio" name="goal" value={value} checked={goal===value} onChange={()=>{setGoal(value);key.current=null;}}/><Icon size={25} strokeWidth={1.5} aria-hidden="true"/><span className="goal-copy"><strong>{label}</strong><small>{help}</small></span>{goal===value&&<Check size={15} className="goal-check" aria-hidden="true"/>}</label>)}</fieldset><label>Wo möchtest du posten?<select value={channel} onChange={e => { setChannel(e.target.value); key.current = null; }}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option></select></label><label>Wen möchtest du erreichen?<input required minLength={3} maxLength={300} value={audience} onChange={e => { setAudience(e.target.value); key.current = null; }} placeholder="Zum Beispiel: Büroleitungen in deiner Region"/></label><p className="quiet">Dein Unternehmen und deine gespeicherte Marke werden übernommen.</p><div className="creation-actions"><span>Dein Entwurf bleibt gespeichert.</span><button className="button primary" disabled={busy}>Weiter <ArrowRight size={16} aria-hidden="true"/><span className="sr-only"> →</span></button></div></form></section>}
 {step === 2 && <section className="panel create-step"><div className="readiness-heading"><span className="readiness-icon"><ShieldCheck size={24} strokeWidth={1.5} aria-hidden="true"/></span><h1>{gate?.ready ? 'Deine Themen stehen fest.' : 'Fast bereit!'}</h1></div><p>{gate?.ready ? 'Prüfe, ob diese drei Themen für dein Ziel eigenständig und hilfreich sind. Jeder Beitrag nutzt eine andere bestätigte Grundlage.' : 'Für drei unterschiedliche Beiträge brauchen wir noch ein paar Angaben zu deinem Unternehmen.'}</p>{gate?.themes.map((t, i) => <article className="theme-card" key={t.id}><span>{i + 1}</span><div><h3>{t.title}</h3><p>{t.statement}</p><small>Von dir bestätigt · Quelle im Unternehmensprofil</small></div></article>)}{!gate?.ready && <><ul>{gate?.questions.map(q => <li key={q}>{q}</li>)}</ul><p className="quiet">Deine Ziel- und Kanalangaben bleiben gespeichert. Kein Pack und keine Kosten wurden reserviert.</p><button className="button primary" onClick={onProfile}>Angaben ergänzen →</button></>}{gate?.ready && <><label className="pilot-checkbox"><input type="checkbox" checked={themesReviewed} onChange={e => setThemesReviewed(e.target.checked)}/>Ich habe die Quellen geprüft. Diese Themen beantworten drei unterschiedliche Fragen meiner Zielgruppe.</label><button className="button primary" disabled={busy || !themesReviewed || !usage?.remaining} onClick={() => void generate()}>{busy ? 'Inhalte werden vorbereitet …' : 'Demo-Inhalte vorbereiten →'}</button>{!usage?.remaining && <p>Dein verfügbares Kontingent ist aufgebraucht.</p>}</>}<button className="button secondary" onClick={() => setStep(1)}>Zurück zu Ziel & Kanal</button><details><summary>Wie wir deine Grundlage prüfen</summary><p>{gate?.limitation} Reglementierte oder sensible Fachangaben bleiben ohne gesonderte Fachprüfung gesperrt.</p></details></section>}
 {step === 3 && job && current && <section className="review-workspace"><div className="review-heading"><div><h1>Deine Inhalte sind vorbereitet.</h1><p>Prüfe deine Beiträge und lade sie anschließend herunter.</p></div><span className="review-count" role="status"><CheckCircle2 size={15} strokeWidth={1.7} aria-hidden="true"/>{[0, 1, 2].filter(approved).length} von 3 Beiträgen geprüft</span></div>
 <div className="post-tabs" role="tablist" aria-label="Deine drei Beiträge">{[0, 1, 2].map(i => <button key={i} role="tab" id={`post-tab-${i}`} aria-controls={`post-panel-${i}`} aria-selected={post === i} tabIndex={post === i ? 0 : -1} onClick={() => switchPost(i)} onKeyDown={e => { if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key))
                return; e.preventDefault(); const n = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; switchPost(n); document.getElementById(`post-tab-${n}`)?.focus(); }}><span className="post-tab-title">Post {i+1}</span><small>{approved(i) ? '✓ Geprüft' : 'Prüfung offen'}</small></button>)}</div>
 {[0,1,2].filter(i=>i!==post).map(i=><div key={i} id={`post-panel-${i}`} role="tabpanel" aria-labelledby={`post-tab-${i}`} hidden />)}
 <div id={`post-panel-${post}`} role="tabpanel" aria-labelledby={`post-tab-${post}`} className="post-panel"><div className="post-split"><section className="panel post-text"><header className="post-card-heading"><h2>Dein Beitrag</h2><span className="channel-label">{current.posts[post].channel}</span></header><label><span className="sr-only">Beitrag {post+1}</span><textarea aria-label={`Beitrag ${post + 1}`} rows={11} maxLength={3000} readOnly={version !== job.output_revision} value={posts[post] ?? ''} onChange={e => edit(post, e.target.value)}/></label><div className="editor-meta"><span>Manuelle Änderungen bitte erneut prüfen.</span><span>{posts[post]?.length??0} / 3000</span></div>{dirty ? <div className="buttons"><button className="button primary" disabled={busy} onClick={() => void save()}>Änderungen speichern</button><button className="button secondary" onClick={() => display(job, version)}>Änderungen verwerfen</button></div> : <p className="save-status">Gespeichert · {approved(post) ? 'Freigegeben' : 'Prüfung ausstehend'}</p>}<details><summary>Einstieg & Handlungsaufforderung</summary><p>{hooks[post]}</p><p>{cta}</p></details></section>
 <section className="panel post-image"><header className="post-card-heading"><h2>Passendes Bild</h2><span className="optional">optional</span></header><p className="muted">Du kannst diesen Beitrag auch ohne Bild herunterladen.</p><label>Bild auswählen<select aria-label="Bild auswählen" value={images[post] ? `${images[post]!.kind}:${images[post]!.id}` : ''} disabled={locked || busy} onChange={e => { const [kind, id] = e.target.value.split(':'); setImages(a => a.map((r, i) => i === post ? (id ? { kind: kind as 'asset' | 'job', id } : null) : r)); setAck(false); }}><option value="">Ohne Bild</option>{media?.assets.filter(a => a.status === 'approved').map(a => <option key={a.id} value={`asset:${a.id}`}>{a.name}</option>)}{media?.jobs.filter(j => j.attached && j.reviewed && !j.stale && !j.expired && Date.parse(j.expiresAt) > clock && j.brief.binding.generationId === job.id && j.brief.binding.version === version && j.brief.binding.postIndex === post).map((j, i) => <option key={j.id} value={`job:${j.id}`}>Geprüfter Mock-Entwurf {i + 1}</option>)}</select></label>{images[post] && <>{!mediaAvailable(post)?<p role="status">Dieses Bild ist nicht mehr verfügbar oder muss erneut geprüft werden. Text-only-Download bleibt nach Textfreigabe möglich.</p>:<img className="selected-image" src={`${root}/creative/${images[post]!.kind === 'asset' ? 'assets' : 'jobs'}/${images[post]!.id}${images[post]!.kind === 'job' ? '/output' : ''}`} alt={images[post]!.kind === 'job' ? 'Mock – ohne KI generiert, kein dokumentarischer Nachweis' : 'Freigegebene eigene Bildquelle'}/>}<button className="button secondary" disabled={locked} onClick={() => { setImages(a => a.map((r, i) => i === post ? null : r)); setAck(false); }}>Optionales Bild entfernen</button></>}{media?.jobs.filter(j=>j.state==='completed'&&!j.expired&&Date.parse(j.expiresAt)>clock&&j.brief.binding.generationId===job.id&&j.brief.binding.postIndex===post&&j.brief.binding.version!==version).slice(-1).map(j=><button key={j.id} className="button secondary" disabled={locked||busy} onClick={()=>void perform(async()=>{await api(`${root}/workspace/rebind/${j.id}`,{expectedVersion:version});await loadMedia();setCreativeRefresh(n=>n+1);setNotice("Vorhandenes Bild übernommen, ohne neuen Bildversuch. Bitte Bild und aktuellen Text erneut prüfen.");})}>Vorhandenes Bild erneut prüfen</button>)}{!images[post]&&<div className="optional-image-empty"><span className="empty-image-symbol"><ImagePlus size={32} strokeWidth={1.3} aria-hidden="true"/></span><strong>Platz für deine Bildidee.</strong><p>Ein freigegebenes Bild ergänzen – oder einfach mit dem Text starten.</p></div>}<details className="image-tools"><summary>Mediathek öffnen & Mock-Bild erstellen</summary><CreativeStudio key={`${job.id}-${post}-${version}-${creativeRefresh}`} projectId={pid} generationId={job.id} version={version} locked={locked} fixedPostIndex={post} onChanged={() => void Promise.all([loadMedia(),loadReviews()])}/></details></section></div>
 <div className="post-approval panel"><div><strong className="approval-status">{approved(post)?<CheckCircle2 size={18} aria-hidden="true"/>:<Circle size={18} aria-hidden="true"/>}{approved(post) ? 'Dieser Beitrag ist freigegeben.' : dirty ? 'Dieser Beitrag wurde geändert und muss erneut geprüft werden.' : 'Prüfe Inhalt, Fakten und gegebenenfalls das Bild.'}</strong><label className="pilot-checkbox"><input type="checkbox" checked={ack} disabled={locked || busy} onChange={e => setAck(e.target.checked)}/>Ich habe diesen gespeicherten Beitrag und ein gegebenenfalls ausgewähltes Bild samt Quellen geprüft. Ich veröffentliche selbst.</label></div><button className="button primary" disabled={busy || locked || !ack} onClick={() => void approve()}>Beitrag prüfen & freigeben</button></div></div>
 <details className="panel additional-content"><summary>Hooks, 7-Tage-Aktionsplan & Verlauf</summary><h3>Hooks & CTA</h3>{hooks.map((h, i) => <label key={i}>Einstieg {i + 1}<input value={h} readOnly={version !== job.output_revision} maxLength={300} onChange={e => { setHooks(a => a.map((s, n) => n === i ? e.target.value : s)); setDirty(true); setAck(false); }}/></label>)}<label>Handlungsaufforderung<textarea value={cta} readOnly={version !== job.output_revision} maxLength={500} onChange={e => { setCta(e.target.value); setDirty(true); setAck(false); }}/></label><h3>7-Tage-Aktionsplan</h3><p>Marketingaktivitäten – keine sieben automatisch veröffentlichbaren Posts.</p><ol className="pilot-plan">{current.days.map(d => <li key={d.day}><strong>Tag {d.day} · {d.time}</strong><p>{d.task}</p></li>)}</ol><label>Gespeicherte Version<select aria-label="Gespeicherte Version" disabled={dirty || busy} value={version} onChange={e => display(job, Number(e.target.value))}>{job.versions.map(v => <option key={v.version} value={v.version}>Stand {v.version}{v.version === job.output_revision ? ' · aktuell' : ''}</option>)}</select></label>{version !== job.output_revision && <p>Historischer Stand, nur zum Lesen. Für Prüfung und Download bitte den aktuellen Stand öffnen.</p>}<details><summary>Fakten und Quellen</summary><ul>{current.facts.map(f => <li key={f.id}>{f.statement}{f.sourceUrls.map(u => <p key={u}><a href={u} target="_blank" rel="noreferrer">Quelle ansehen ↗</a></p>)}</li>)}</ul><p>{job.provider}/{job.model} · v1. Kein experimentelles v2-Modell wurde aktiviert.</p></details></details>
 <section className="panel customer-export"><div><h2>{allTexts ? 'Bereit zum Herunterladen' : 'Deine Freigaben fehlen noch'}</h2><p>Manuell herunterladen und selbst veröffentlichen.</p></div><div className="buttons"><button className="button primary" disabled={busy || !allTexts} onClick={() => void download('texts')} aria-label="Texte herunterladen"><FileText size={23} strokeWidth={1.5} aria-hidden="true"/><span><strong>Texte herunterladen</strong><small>Die geprüften Beiträge als Textdateien.</small></span><ArrowRight size={16} aria-hidden="true"/></button><button className="button secondary" disabled={busy || !allCombined} onClick={() => void download('campaign')} aria-label="Kampagne herunterladen"><Download size={23} strokeWidth={1.5} aria-hidden="true"/><span><strong>Kampagne herunterladen</strong><small>Texte und freigegebene Bilder als Paket.</small></span><ArrowRight size={16} aria-hidden="true"/></button></div><details><summary>Weitere Exportoptionen</summary><button className="button secondary" disabled={busy||!allTexts} onClick={()=>void copyTexts()}>Texte kopieren</button></details><p className="quiet">Texte: ohne Bilder. Kampagne: Texte und ausgewählte, aktuell freigegebene Bilder. Veraltete Bilder blockieren nur den Kampagnenexport.</p></section>
 </section>}
 <p className="quiet">{usage?.remaining} von {usage?.allocation} Packs verfügbar. Bearbeiten und Export verbrauchen keine Packs.</p>
 </>}
 </div>;
}
