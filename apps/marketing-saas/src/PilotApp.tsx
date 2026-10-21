import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { BrandContext } from "@marketing/core";
import { api } from "./api";
import PackWorkspace from "./PackWorkspace";
import AuthForm from "./auth/AuthForm";
import "./pilot.css";
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
  const [projects, setProjects] = useState<Project[]>([]),
    [detail, setDetail] = useState<Detail | null>(null),
    [tab, setTab] = useState("projects");
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
  }
  const [name, setName] = useState(""),
    [website, setWebsite] = useState(""),
    [summary, setSummary] = useState(""),
    [claims, setClaims] = useState("");
  const [selected, setSelected] = useState<string[]>([]),
    [ack, setAck] = useState(false);
  async function refreshSession() {
    const current = await api<typeof session>("/api/auth/get-session");
    setSession(current);
    if (current) setProjects(await api("/api/projects"));
  }
  useEffect(() => {
    let active = true;
    void api<{ demo: boolean }>("/api/health")
      .then((health) => {
        if (active) setDemo(health.demo);
      })
      .catch(() => {});
    void api<typeof session>("/api/auth/get-session")
      .then(async (current) => {
        if (!active) return;
        setSession(current);
        if (current) {
          const items = await api<Project[]>("/api/projects");
          if (active) setProjects(items);
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
    return <AuthForm onSignedIn={refreshSession} />;
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>Marketing Workspace</strong>
            <span>Dein Unternehmen im Fokus</span>
          </div>
        </div>
        <nav className="side-nav" aria-label="Arbeitsbereich">
          {[
            ["projects", "Unternehmen"],
            ["campaigns", "Marketing-Packs"],
            ["usage", "Nutzung & Plan"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              className={tab === key ? "active" : ""}
              onClick={() => navigateTab(key)}
            >
              <span aria-hidden="true">
                {key === "projects" ? "▣" : key === "campaigns" ? "✦" : "◔"}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <p className="sidebar-note">
          Du behältst die Kontrolle. Kein Inhalt wird automatisch
          veröffentlicht.
        </p>
      </aside>
      <div className="main">
        <header className="topbar">
          <a
            className="workspace-home"
            href="/"
            aria-label="Zur Produktübersicht"
          >
            ✦ Marketing Workspace
          </a>
          <strong>{session.user.name}</strong>
          <span className="preview-pill">LOKALER PILOT</span>
          <button
            className="button secondary"
            disabled={busy || packDirty}
            onClick={() =>
              void perform(async () => {
                await api("/api/auth/sign-out", {});
                setSession(null);
                setDetail(null);
              })
            }
          >
            Abmelden
          </button>
        </header>
        <main className="workspace">
          <div className="eyebrow">DEIN MARKETING-ARBEITSBEREICH</div>
          {demo && (
            <p role="status" className="pilot-demo">
              DEMO — synthetische Website: https://glanz.example ·
              deterministische Packs, keine echte KI.
            </p>
          )}
          <h1>
            {tab === "projects"
              ? "Dein Unternehmen"
              : tab === "campaigns"
                ? "Deine Marketing-Packs"
                : "Nutzung & Plan"}
          </h1>
          <p className="workspace-intro">
            {tab === "projects"
              ? "Die Grundlage für Inhalte, die zu deinem Betrieb passen. Prüfe deine Angaben, bevor du eine Kampagne planst."
              : tab === "campaigns"
                ? "Ein Ziel. Eine Woche. Deine Worte. Erstelle, prüfe und exportiere deinen nächsten Marketingplan."
                : "Dein monatlicher Rahmen – transparent und ohne automatische Buchung."}
          </p>
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
                  <Panel title="1. Deine Website oder dein Kurzbrief">
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
                  {detail.context?.facts.some((f) => f.confirmation) && (
                    <div className="workspace-next">
                      <div>
                        <strong>Deine Grundlage steht.</strong>
                        <p>
                          Plane jetzt deine Woche mit den bestätigten Fakten.
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
                  {detail.context && (
                    <Panel title="2. Fakten prüfen und bestätigen">
                      <p className="muted">
                        Revision {detail.revision} · Verlauf:{" "}
                        {detail.history.join(", ")} · Bestätigung ist keine
                        Freigabe zur Veröffentlichung.
                      </p>
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
                              checked={selected.includes(f.id)}
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
                </>
              )}
            </>
          )}
          {tab !== "projects" && (
            <PackWorkspace
              key={tab}
              projects={projects}
              initialProjectId={detail?.id}
              usageOnly={tab === "usage"}
              onDirtyChange={setPackDirty}
            />
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {[
          ["projects", "Unternehmen"],
          ["campaigns", "Packs"],
          ["usage", "Nutzung"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => navigateTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
