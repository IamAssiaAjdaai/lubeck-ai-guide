import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { BrandContext } from "@marketing/core";
import { api } from "./api";
import { serviceCity, serviceCitySchema, withServiceCity } from "./businessProfile";
import { safeWorkspaceDestination, workspaceView } from "./routes";
import PackWorkspace from "./PackWorkspace";
import WorkspaceOverview from "./WorkspaceOverview";
import CreativeStudio from "./CreativeStudio";
import "./workspace.css";
import AuthForm from "./auth/AuthForm";
import "./pilot.css";
import "./studio.css";
import BrandIdentity from "./brand/BrandIdentity";
import { House, SquarePen, Files, Palette, Settings2, Images, ShieldCheck, UserRound, ChevronDown, LogOut } from "lucide-react";
const workspaceNav = [
  {key:"overview",label:"Übersicht",shortLabel:"Start",icon:House},
  {key:"campaigns",label:"Inhalte erstellen",shortLabel:"Erstellen",icon:SquarePen},
  {key:"contents",label:"Content Packs",shortLabel:"Packs",icon:Files},
  {key:"projects",label:"Marke & Wissen",shortLabel:"Wissen",icon:Palette},
  {key:"media",label:"Medien",shortLabel:"Medien",icon:Images},
  {key:"usage",label:"Einstellungen",shortLabel:"Plan",icon:Settings2},
];
type Project = { id: string; name: string; revision: number; role?: string };
type Detail = Project & {
  context: BrandContext | null;
  evidence: { factId: string; snippet: string }[];
  history: number[];
};
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export default function PilotApp() {
  const [session, setSession] = useState<{ user: { name: string } } | null>(
      null,
    ),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [localRegistration, setLocalRegistration] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]),
    [detail, setDetail] = useState<Detail | null>(null),
    [tab, setTab] = useState("overview");
  const [resumeId, setResumeId] = useState<string | undefined>();
  const [brandSection, setBrandSection] = useState<"profile"|"kit">("profile");
  const [packDirty, setPackDirty] = useState(false);
  function navigateTab(next: string) {
    if (packDirty && next !== tab) {
      setError(
        "Bitte speichere oder verwirf deine Änderungen im Marketing-Pack, bevor du den Bereich wechselst.",
      );
      return;
    }
    setError("");
    setTab(next);
    history.replaceState(null, "", next === "overview" ? "/workspace" : `/workspace?view=${next}`);
  }
  const [name, setName] = useState(""),
    [website, setWebsite] = useState(""),
    [summary, setSummary] = useState(""),
    [city, setCity] = useState(""),
    [cityError, setCityError] = useState(""),
    [claims, setClaims] = useState("");
  const [selected, setSelected] = useState<string[]>([]),
    [ack, setAck] = useState(false);
  async function refreshSession() {
    const current = await api<typeof session>("/api/auth/get-session");
    setSession(current);
    const destination = safeWorkspaceDestination(new URLSearchParams(location.search).get("next"));
    history.replaceState(null, "", destination);
    setTab(workspaceView(destination));
    setResumeId(undefined);
    if (current) { const items = await api<Project[]>("/api/projects"); setProjects(items); if(items[0]) await open(items[0].id); }
  }
  useEffect(() => {
    let active = true;
    void api<{ demo: boolean; localRegistration?: boolean }>("/api/health")
      .then((health) => {
        if (active) { setDemo(health.demo); setLocalRegistration(health.localRegistration === true); }
      })
      .catch(() => {});
    void api<typeof session>("/api/auth/get-session")
      .then(async (current) => {
        if (!active) return;
        setSession(current);
        if (!current && location.pathname === "/workspace") {
          const destination = safeWorkspaceDestination(location.pathname + location.search);
          history.replaceState(null, "", `/auth?next=${encodeURIComponent(destination)}`);
        }
        if (current) {
          const destination = location.pathname === "/auth" ? safeWorkspaceDestination(new URLSearchParams(location.search).get("next")) : safeWorkspaceDestination(location.pathname + location.search);
          history.replaceState(null, "", destination);
          setTab(workspaceView(destination));
          const items = await api<Project[]>("/api/projects");
          if (active) { setProjects(items); if(items[0]) await open(items[0].id); }
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Der Server ist nicht erreichbar. Bitte den lokalen API-Server starten.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }
  async function open(projectId: string, reset = true) {
    const value = await api<Detail>(`/api/projects/${projectId}`);
    setDetail(value);
    if (reset) {
      setName(value.name);
      setWebsite(value.context?.identity.website ?? "");
      setSummary(value.context?.identity.summary ?? "");
      setCity(serviceCity(value.context));
      setCityError("");
      setClaims(value.context?.facts.map((f) => f.statement).join("\n") ?? "");
    }
    setSelected([]);
    setAck(false);
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    await perform(async () => {
      const project = await api<Project>("/api/projects", { name });
      setProjects(await api("/api/projects"));
      await open(project.id);
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    const parsedCity = serviceCitySchema.safeParse(city);
    if (!parsedCity.success) { setCityError(parsedCity.error.issues[0].message); return; }
    setCityError("");
    await perform(async () => {
      const facts = claims
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((statement, i) => ({
          id: `claim-${i + 1}`,
          statement,
          basis: "user_supplied",
        }));
      await api(`/api/projects/${detail.id}/brief`, {
        expectedRevision: detail.revision,
        brief: {
          rawText: summary || "Manueller Unternehmensbrief",
          identity: {
            name,
            ...(summary ? { summary } : {}),
            ...(website ? { website } : {}),
          },
          facts,
          markets: withServiceCity(detail.context, parsedCity.data),
        },
      });
      await open(detail.id);
    });
  }
  if (loading)
    return (
      <main className="pilot-loading" role="status">
        Dein Arbeitsbereich wird geladen …
      </main>
    );
  if (!session) {
    return <AuthForm onSignedIn={refreshSession} localRegistration={localRegistration} />;
  }
  return (
    <div className="shell simple-workspace">
      <aside className="sidebar">
        <div className="brand">
          <BrandIdentity />
        </div>
        <nav className="side-nav" aria-label="Arbeitsbereich">
          {workspaceNav.map(({key,label,icon:Icon})=><button key={key} aria-current={tab===key?"page":undefined} className={tab===key?"active":""} onClick={()=>navigateTab(key)}><Icon size={18} strokeWidth={1.7} aria-hidden="true"/><span>{label}</span></button>)}
        </nav>
        <p className="sidebar-note">
          <ShieldCheck size={18} strokeWidth={1.6} aria-hidden="true"/><span>Dein Inhalt. Deine Freigabe.<small>Du veröffentlichst selbst.</small></span>
        </p>
      </aside>
      <div className="main">
        <header className="topbar">
          <a
            className="workspace-home"
            href="/"
            aria-label="Zur Produktübersicht"
          >
            <BrandIdentity linked={false} />
          </a>
          <div className="workspace-company"><label><span className="sr-only">Unternehmen</span><select aria-label="Aktuelles Unternehmen" value={detail?.id ?? ""} disabled={busy||packDirty} onChange={e=>void perform(()=>open(e.target.value))}><option value="" disabled>Unternehmen wählen</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
          {demo&&<span className="workspace-mode"><span aria-hidden="true"/>Demo · ohne Live-KI</span>}
          <details className="account-menu"><summary aria-label="Konto öffnen"><UserRound size={18} strokeWidth={1.7} aria-hidden="true"/><span className="account-name">{session.user.name}</span><ChevronDown size={13} aria-hidden="true"/></summary><div className="account-popover"><strong>{session.user.name}</strong><p>Lokales Testkonto · keine Live-KI</p><button className="button secondary" disabled={busy||packDirty} onClick={()=>void perform(async()=>{await api("/api/auth/sign-out",{});setSession(null);setDetail(null);setProjects([]);setResumeId(undefined);setTab("overview");history.replaceState(null,"","/auth");})}><LogOut size={15} aria-hidden="true"/>Abmelden</button></div></details>
        </header>
        <main className="workspace">
          <div className="workspace-page-heading"><p className="eyebrow">{tab === "overview" ? `Willkommen zurück, ${session.user.name}.` : "Dein Marketing"}</p>
          <h1>{tab === "overview" ? "Dein Marketing im Überblick." : tab === "campaigns" ? "Inhalte erstellen" : tab === "contents" ? "Deine Content Packs" : tab === "projects" ? "Marke & Wissen" : tab === "media" ? "Deine Medien" : "Einstellungen"}</h1>
          <p className="workspace-intro">{tab === "overview" ? `${detail?.name??"Dein Unternehmen"} · Dein Wissen wird zu Inhalten. Du behältst die Freigabe.` : tab === "projects" ? "Dein Unternehmenswissen und deine Marke – die Grundlage für passende Inhalte." : tab === "contents" ? "Deine Kampagnen, Entwürfe und gespeicherten Beiträge. Alles unter deiner Kontrolle." : tab === "media" ? "Eigene Quellen hochladen, Rechte prüfen und für deine Beiträge freigeben." : "Einfach erstellen, prüfen und herunterladen. Du veröffentlichst selbst."}</p></div>
          {(tab === "overview" || tab === "contents") && <WorkspaceOverview projects={projects} activeProjectId={detail?.id} onProfile={(pid)=>{if(packDirty){navigateTab("projects");return;}void perform(async()=>{if(pid&&pid!==detail?.id)await open(pid);setBrandSection("profile");navigateTab("projects");});}} listOnly={tab === "contents"} onCreate={()=>{setResumeId(undefined); if(!detail?.context){setBrandSection("profile");navigateTab("projects");}else navigateTab("campaigns");}} onMedia={()=>navigateTab("media")} onDrafts={()=>navigateTab("contents")} onResume={(pid,gid)=>void perform(async()=>{await open(pid);setResumeId(gid);navigateTab("campaigns");})} />}
          {error && (
            <div role="alert" className="pilot-error">
              {error}
            </div>
          )}
          {busy && <p role="status">Wird gespeichert …</p>}
          {tab === "projects" && (
            <ol
              className="workspace-steps"
              aria-label="Dein Weg zum Marketing-Pack"
            >
              <li aria-current={!detail?.context ? "step" : undefined}>
                <span>01</span> Unternehmen
              </li>
              <li
                aria-current={
                  detail?.context &&
                  !detail.context.facts.some((f) => f.confirmation)
                    ? "step"
                    : undefined
                }
              >
                <span>02</span> Fakten prüfen
              </li>
              <li>
                <span>03</span> Kampagne planen
              </li>
            </ol>
          )}
          {tab === "projects" && (
            <>
              <nav className="studio-subnav" aria-label="Deine Markengrundlage"><button aria-pressed={brandSection==='profile'} onClick={()=>setBrandSection('profile')}>Unternehmen & Fakten</button><button aria-pressed={brandSection==='kit'} onClick={()=>setBrandSection('kit')}>Brand Kit</button></nav>
              {brandSection==='profile'&&<section className="company-profile" aria-label="Unternehmensprofil · Angaben und Fakten prüfen">
              <div className="pilot-projects">
                {projects.map((p) => (
                  <button
                    className={`button ${detail?.id === p.id ? "primary" : "secondary"}`}
                    key={p.id}
                    onClick={() => void perform(() => open(p.id))}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  className="button secondary"
                  onClick={() => {
                    setDetail(null);
                    setName("");
                  }}
                >
                  + Unternehmen anlegen
                </button>
              </div>
              {!detail ? (
                <Panel title="Starte mit deinem Unternehmen">
                  <p className="muted">
                    Ein Name reicht für den Anfang. Danach importierst du deine
                    Website oder schreibst einen Kurzbrief.
                  </p>
                  <form onSubmit={create}>
                    <label>
                      Unternehmensname
                      <input
                        required
                        maxLength={160}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <button className="button primary" disabled={busy}>
                      Unternehmen anlegen
                    </button>
                  </form>
                </Panel>
              ) : (
                <>
                  <Panel title="Deine Unternehmensangaben">
                    <p className="muted">
                      Website-Angaben sind Vorschläge. Du prüfst sie vor der
                      Verwendung.
                    </p>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void perform(async () => {
                          await api(`/api/projects/${detail.id}/import`, {
                            expectedRevision: detail.revision,
                            businessName: name,
                            websiteUrl: website,
                          });
                          await open(detail.id);
                        });
                      }}
                    >
                      <label>
                        Öffentliche Website (HTTPS)
                        <input
                          type="url"
                          required
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://dein-unternehmen.de"
                        />
                      </label>
                      <button
                        className="button primary"
                        disabled={busy || detail.role === "viewer"}
                      >
                        Website importieren
                      </button>
                    </form>
                    <details open={!detail.context}>
                      <summary>
                        Oder: Unternehmensangaben manuell eintragen /
                        korrigieren
                      </summary>
                      <form onSubmit={save}>
                        <label>
                          Unternehmensname
                          <input
                            required
                            value={name}
                            maxLength={160}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </label>
                        <label htmlFor="service-city">Einsatzort / Stadt (optional)</label>
                        <input id="service-city" name="serviceCity" value={city} maxLength={160}
                          disabled={busy || detail.role === "viewer"}
                          aria-invalid={cityError ? true : undefined}
                          aria-describedby={cityError ? "service-city-help service-city-error" : "service-city-help"}
                          onChange={e => { setCity(e.target.value); setCityError(""); }} placeholder="Zum Beispiel: Düsseldorf" />
                        <small id="service-city-help">Deine eigene Angabe, kein geprüfter Standortnachweis. Wird mit diesem Unternehmensprofil gespeichert.</small>
                        {cityError && <p id="service-city-error" role="alert">{cityError}</p>}
                        <label>
                          Was bietest du an?
                          <textarea
                            maxLength={2000}
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                          />
                        </label>
                        <label>
                          Fakten zum Prüfen (eine Aussage pro Zeile)
                          <textarea
                            maxLength={20000}
                            rows={5}
                            value={claims}
                            onChange={(e) => setClaims(e.target.value)}
                            placeholder="Wir bieten Büroreinigung in Düsseldorf an."
                          />
                        </label>
                        <p className="quiet">
                          Manuelle Änderungen sind eigene Angaben und müssen neu
                          bestätigt werden. Vorherige Versionen bleiben
                          erhalten.
                        </p>
                        <button
                          className="button primary"
                          disabled={busy || detail.role === "viewer"}
                        >
                          Angaben speichern
                        </button>
                      </form>
                    </details>
                  </Panel>
                  {detail.context && (
                    <Panel title="2. Fakten prüfen und bestätigen">
                      <p className="muted">Prüfe Aussage und Quelle. Bestätigte Fakten musst du nicht erneut auswählen. Neue oder geänderte Angaben sind zunächst ungeprüft.</p><details><summary>Quellenstand und Verlauf</summary><p>Stand {detail.revision} · Verlauf: {detail.history.join(", ")}. Bestätigung ist keine Veröffentlichung.</p></details>
                      {detail.context.missingInformation.length > 0 && (
                        <details>
                          <summary>
                            Noch offene Unternehmensangaben (
                            {detail.context.missingInformation.length})
                          </summary>
                          <ul>
                            {detail.context.missingInformation.map((gap) => (
                              <li key={gap.id}>
                                {
                                  {
                                    identity:
                                      "Kurzbeschreibung des Unternehmens",
                                    offerings:
                                      "Leistungen strukturiert ergänzen",
                                    target_audiences:
                                      "Zielgruppe beim Marketing-Pack ergänzen",
                                    marketing_goals:
                                      "Kampagnenziel beim Marketing-Pack wählen",
                                    tone: "Gewünschte Ansprache",
                                    markets: "Einsatzgebiet oder Markt",
                                    languages:
                                      "Bevorzugte Sprache – Packs sind vorerst auf Deutsch",
                                    facts:
                                      "Mindestens eine konkrete Aussage zum Prüfen",
                                    other:
                                      "Weitere Angaben aus deinem Kurzbrief",
                                  }[gap.field]
                                }
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {detail.context.facts.length === 0 && (
                        <p>
                          Noch keine Fakten. Ergänze mindestens eine konkrete
                          Aussage im Kurzbrief.
                        </p>
                      )}
                      {detail.context.facts.map((f) => (
                        <article className="pilot-fact" key={f.id}>
                          <label className="pilot-checkbox">
                            <input
                              type="checkbox"
                              checked={!!f.confirmation || selected.includes(f.id)}
                              disabled={busy || !!f.confirmation || detail.role === "viewer"}
                              onChange={(e) =>
                                setSelected((current) =>
                                  e.target.checked
                                    ? [...current, f.id]
                                    : current.filter((id) => id !== f.id),
                                )
                              }
                            />
                            <strong>{f.statement}</strong>
                          </label>
                          <span className="tag">
                            {f.confirmation
                              ? "Von dir bestätigt"
                              : f.basis === "source_backed"
                                ? "Website-Vorschlag · ungeprüft"
                                : "Eigene Angabe · ungeprüft"}
                          </span>
                          {f.provenanceIds.map((sourceId) => {
                            const source = detail.context!.provenance.find(
                              (s) => s.id === sourceId,
                            );
                            return source?.locator ? (
                              <p key={sourceId}>
                                <a
                                  href={source.locator}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Quelle ansehen ↗
                                </a>
                              </p>
                            ) : null;
                          })}
                          {detail.evidence
                            .filter((e) => e.factId === f.id)
                            .map((e) => (
                              <blockquote key={e.factId}>
                                {e.snippet}
                              </blockquote>
                            ))}
                        </article>
                      ))}
                      <label className="pilot-checkbox">
                        <input
                          type="checkbox"
                          checked={ack}
                          onChange={(e) => setAck(e.target.checked)}
                        />
                        Ich habe die ausgewählten Aussagen und ihre Quellen
                        geprüft.
                      </label>
                      <div className="buttons">
                        <button
                          className="button primary"
                          disabled={
                            busy ||
                            !ack ||
                            !selected.length ||
                            detail.role === "viewer"
                          }
                          onClick={() =>
                            void perform(async () => {
                              await api(`/api/projects/${detail.id}/confirm`, {
                                expectedRevision: detail.revision,
                                factIds: selected,
                                acknowledged: true,
                              });
                              await open(detail.id);
                            })
                          }
                        >
                          Ausgewählte Fakten bestätigen
                        </button>
                        <button
                          className="button secondary"
                          onClick={() =>
                            void perform(() => open(detail.id, false))
                          }
                        >
                          Projekt neu laden (Entwurf behalten)
                        </button>
                      </div>
                    </Panel>
                  )}
                  {detail.context?.facts.some((f) => f.confirmation) && (
                    <div className="workspace-next">
                      <div>
                        <strong>Deine Angaben sind gespeichert.</strong>
                        <p>
                          Im nächsten Schritt prüfen wir, ob sie drei unterschiedliche Themen tragen.
                        </p>
                      </div>
                      <button
                        className="button primary"
                        onClick={() => navigateTab("campaigns")}
                      >
                        Weiter zum Marketing-Pack →
                      </button>
                    </div>
                  )}
                </>
              )}
              </section>}
              {brandSection==='kit'&&(detail?<div className="studio-kit-only"><CreativeStudio projectId={detail.id} version={1} locked={false} libraryOnly librarySection="kit"/></div>:<Panel title="Dein Unternehmen zuerst"><p>Lege zuerst dein Unternehmen an. Danach kannst du Farben, Schrift und Bildquellen hinterlegen.</p><button className="button primary" onClick={()=>setBrandSection('profile')}>Unternehmen anlegen</button></Panel>)}
            </>
          )}
          {tab === "media" && (detail?<div className="studio-media-only"><CreativeStudio projectId={detail.id} version={1} locked={false} libraryOnly librarySection="media"/><section className="panel"><h2>Vom Bild zum Beitrag</h2><p>Das Creative Studio findest du im gespeicherten Post. Dort prüfst du Bild und Text gemeinsam. In dieser lokalen Vorschau entstehen ausschließlich gekennzeichnete Mock-Bilder.</p><button className="button secondary" onClick={()=>navigateTab('contents')}>Zu deinen Content Packs</button></section></div>:<Panel title="Dein Unternehmen zuerst"><p>Bilder gehören zu einem Unternehmen und bleiben privat.</p><button className="button primary" onClick={()=>{setBrandSection('profile');navigateTab('projects');}}>Unternehmen anlegen</button></Panel>)}
          {(tab === "campaigns" || tab === "usage") && (
            <PackWorkspace
              key={`${tab}:${detail?.id ?? "new"}`}
              projects={projects}
              initialProjectId={detail?.id}
              initialGenerationId={resumeId}
              onProfile={()=>{setBrandSection("profile");navigateTab("projects");}}
              usageOnly={tab === "usage"}
              onDirtyChange={setPackDirty}
            />
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {workspaceNav.map(({key,shortLabel,icon:Icon})=><button key={key} aria-current={tab===key?"page":undefined} onClick={()=>navigateTab(key)}><Icon size={19} strokeWidth={1.7} aria-hidden="true"/><span>{shortLabel}</span></button>)}
      </nav>
    </div>
  );
}
