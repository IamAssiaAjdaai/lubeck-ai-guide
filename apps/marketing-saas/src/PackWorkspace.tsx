import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "./api";
import type { Pack } from "../../marketing-saas-api/src/pack.contract";
import type { BrandContext } from "@marketing/core";
type Project = { id: string; name: string };
type Usage = {
  month: string;
  plan: string;
  allocation: number;
  used: number;
  remaining: number;
  costEur: number;
  budgetEur: number;
  priceHypothesisExVat: number;
  demo: boolean;
};
type Job = {
  id: string;
  status: string;
  provider: string;
  model: string;
  output_revision: number;
  error_code?: string;
  versions: { version: number; content: Pack }[];
};
type History = {
  id: string;
  status: string;
  created_at: string;
  provider: string;
  goal: string;
};
export default function PackWorkspace({
  projects,
  initialProjectId,
  usageOnly = false,
}: {
  projects: Project[];
  initialProjectId?: string;
  usageOnly?: boolean;
}) {
  const [projectId, setProjectId] = useState(
      initialProjectId ?? projects[0]?.id ?? "",
    ),
    [usage, setUsage] = useState<Usage | null>(null),
    [revision, setRevision] = useState(0),
    [confirmed, setConfirmed] = useState(0),
    [items, setItems] = useState<History[]>([]);
  const [goal, setGoal] = useState("mehr_anfragen"),
    [audience, setAudience] = useState(""),
    [channel, setChannel] = useState("linkedin"),
    [job, setJob] = useState<Job | null>(null),
    [version, setVersion] = useState(1);
  const [posts, setPosts] = useState<string[]>([]),
    [hooks, setHooks] = useState<string[]>([]),
    [cta, setCta] = useState(""),
    [dirty, setDirty] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const requestKey = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!projectId) return;
    void Promise.all([
      api<Usage>(`/api/projects/${projectId}/usage`),
      api<History[]>(`/api/projects/${projectId}/packs`),
      api<{ revision: number; context: BrandContext | null }>(
        `/api/projects/${projectId}`,
      ),
    ])
      .then(([u, history, project]) => {
        if (!active) return;
        setUsage(u);
        setItems(history);
        setRevision(project.revision);
        setConfirmed(
          project.context?.facts.filter((f) => f.confirmation).length ?? 0,
        );
        setJob(null);
        setDirty(false);
        setReviewed(false);
        requestKey.current = null;
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  async function refresh() {
    const [u, history] = await Promise.all([
      api<Usage>(`/api/projects/${projectId}/usage`),
      api<History[]>(`/api/projects/${projectId}/packs`),
    ]);
    setUsage(u);
    setItems(history);
  }
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }
  function display(value: Job, selected = value.output_revision) {
    setJob(value);
    setVersion(selected);
    const content = value.versions.find((v) => v.version === selected)?.content;
    if (content) {
      setPosts(content.posts.map((p) => p.text));
      setHooks(content.hooks);
      setCta(content.cta);
    }
    setDirty(false);
    setReviewed(false);
  }
  async function generate(event: FormEvent) {
    event.preventDefault();
    await perform(async () => {
      requestKey.current ??= crypto.randomUUID();
      const result = await api<Job>(`/api/projects/${projectId}/packs`, {
        expectedRevision: revision,
        goal,
        audience,
        language: "de-DE",
        channels: [channel],
        idempotencyKey: requestKey.current,
      });
      display(result);
      await refresh();
      requestKey.current = null;
      if (result.status === "failed")
        throw new Error(
          "Der Generierungsversuch ist fehlgeschlagen. Die Reservierung bleibt bis zur Kostenklärung erhalten. Bitte Verlauf und Kontingent prüfen.",
        );
      if (result.status === "running")
        setNotice(
          "Dieser Auftrag läuft bereits. Lade seinen Eintrag im Verlauf erneut; es wird kein zweiter Modellaufruf gestartet.",
        );
    });
  }
  async function exportPack(download: boolean) {
    if (!job) return;
    await perform(async () => {
      const result = await api<{ markdown: string }>(
        `/api/projects/${projectId}/packs/${job.id}/export`,
        { expectedVersion: job.output_revision, reviewed: true },
      );
      if (download) {
        const url = URL.createObjectURL(
          new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "marketing-pack.md";
        link.click();
        URL.revokeObjectURL(url);
        setNotice("Marketing-Pack heruntergeladen. Du veröffentlichst selbst.");
      } else {
        await navigator.clipboard.writeText(result.markdown);
        setNotice("In die Zwischenablage kopiert.");
      }
    });
  }
  const current = job?.versions.find((v) => v.version === version)?.content;
  if (!projects.length)
    return (
      <section className="panel">
        <h2>Dein Unternehmen zuerst</h2>
        <p>
          Lege unter „Unternehmen“ ein Projekt an und bestätige mindestens eine
          konkrete Aussage.
        </p>
      </section>
    );
  return (
    <>
      <section className="panel">
        <label>
          Unternehmen auswählen
          <select
            value={projectId}
            disabled={busy || dirty}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="pilot-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {usage && (
          <>
            <p className="pilot-allowance">
              <strong>
                {usage.remaining} von {usage.allocation} Packs verfügbar
              </strong>{" "}
              · {usage.month} (UTC)
            </p>
            <p className="muted">
              {usage.plan === "starter" ? "Starter" : "Growth"} · Preishypothese{" "}
              {usage.priceHypothesisExVat} €/Monat zzgl. USt. · Kein aktiver
              Online-Abschluss.
            </p>
            <p className="quiet">
              Erfasste Kosten/Reservierungen: {usage.costEur.toFixed(4)} € von{" "}
              {usage.budgetEur.toFixed(2)} € internem KI-Budget. Fehlgeschlagene
              Versuche können Kontingent verbrauchen. Manuelles Bearbeiten und
              Export verbrauchen keine Packs.
            </p>
            {usage.demo && (
              <p className="pilot-demo" role="status">
                DEMO — deterministische lokale Vorlage. Keine echte KI und keine
                Provider-Kosten.
              </p>
            )}
          </>
        )}
      </section>
      {!usageOnly && (
        <>
          <section className="panel">
            <h2>Dein nächstes Marketing-Pack</h2>
            <p className="muted">
              {confirmed} bestätigte Fakten · Unternehmensrevision {revision}.
              Nur diese Fakten werden verwendet.
            </p>
            <form onSubmit={generate}>
              <label>
                Was möchtest du erreichen?
                <select
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    requestKey.current = null;
                  }}
                >
                  <option value="mehr_anfragen">Mehr Anfragen gewinnen</option>
                  <option value="sichtbarkeit">Bekannter werden</option>
                  <option value="kundenbindung">
                    Mit Kunden in Kontakt bleiben
                  </option>
                </select>
              </label>
              <label>
                Wen möchtest du erreichen?
                <input
                  required
                  minLength={3}
                  maxLength={300}
                  value={audience}
                  onChange={(e) => {
                    setAudience(e.target.value);
                    requestKey.current = null;
                  }}
                  placeholder="z. B. Büroleitungen in Düsseldorf"
                />
              </label>
              <label>
                Dein bevorzugter Kanal
                <select
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    requestKey.current = null;
                  }}
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </label>
              <p className="quiet">
                Ein Versuch umfasst einen 7-Tage-Plan, drei Posts, drei
                Einstiege und eine Handlungsaufforderung. Zeiten sind Vorschläge
                in Europe/Berlin. Es wird nichts automatisch veröffentlicht.
              </p>
              <button
                className="button primary"
                disabled={busy || !confirmed || !usage?.remaining}
              >
                {busy
                  ? "Pack wird vorbereitet …"
                  : usage?.demo
                    ? "Demo-Pack erstellen"
                    : job
                      ? "Alternative generieren (1 Pack)"
                      : "Marketing-Pack generieren (1 Pack)"}
              </button>
            </form>
            {!confirmed && (
              <p>Bitte zuerst unter „Unternehmen“ Fakten bestätigen.</p>
            )}
          </section>
          <section className="panel">
            <h2>Dein Verlauf</h2>
            {!items.length ? (
              <p>Noch keine Generierungen. Dein erstes Pack erscheint hier.</p>
            ) : (
              <ul className="pilot-history">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      className="button secondary"
                      disabled={busy || dirty}
                      onClick={() =>
                        void perform(async () =>
                          display(
                            await api<Job>(
                              `/api/projects/${projectId}/packs/${item.id}`,
                            ),
                          ),
                        )
                      }
                    >
                      {new Date(item.created_at).toLocaleString("de-DE")} ·{" "}
                      {item.provider === "demo" ? "Demo" : item.provider} ·{" "}
                      {item.status === "completed"
                        ? "Entwurf"
                        : item.status === "failed"
                          ? "Fehlgeschlagen"
                          : "In Arbeit"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {job && current && (
            <section className="panel">
              <h2>Prüfen, bearbeiten, selbst veröffentlichen</h2>
              <p className="muted">
                {job.provider}/{job.model} ·{" "}
                {current.editorialStatus === "human_edited"
                  ? "Manuell bearbeitet"
                  : "Entwurf"}{" "}
                · Keine Veröffentlichung erfolgt.
              </p>
              <label>
                Gespeicherte Version
                <select
                  aria-label="Gespeicherte Version"
                  value={version}
                  disabled={dirty || busy}
                  onChange={(e) => display(job, Number(e.target.value))}
                >
                  {job.versions.map((v) => (
                    <option value={v.version} key={v.version}>
                      Version {v.version}
                      {v.version === job.output_revision ? " (aktuell)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <h3 className="pilot-section-heading">Dein 7-Tage-Plan</h3>
              <ol className="pilot-plan">
                {current.days.map((day) => (
                  <li key={day.day}>
                    <strong>
                      Tag {day.day} · {day.channel} · {day.time}
                    </strong>
                    <p>{day.task}</p>
                    <small>Fakten: {day.factIds.join(", ")}</small>
                  </li>
                ))}
              </ol>
              <h3>Deine drei Social-Media-Posts</h3>
              <div className="pilot-editor">
                {posts.map((text, i) => (
                  <label key={i}>
                    Beitrag {i + 1} ({current.posts[i].channel})
                    <textarea
                      aria-label={`Beitrag ${i + 1} (${current.posts[i].channel})`}
                      rows={7}
                      value={text}
                      maxLength={3000}
                      readOnly={version !== job.output_revision}
                      onChange={(e) => {
                        setPosts((previous) =>
                          previous.map((v, index) =>
                            index === i ? e.target.value : v,
                          ),
                        );
                        setDirty(true);
                        setReviewed(false);
                      }}
                    />
                  </label>
                ))}
                <h3>Drei alternative Einstiege</h3>
                {hooks.map((text, i) => (
                  <label key={i}>
                    Einstieg {i + 1}
                    <input
                      value={text}
                      maxLength={300}
                      readOnly={version !== job.output_revision}
                      onChange={(e) => {
                        setHooks((previous) =>
                          previous.map((v, index) =>
                            index === i ? e.target.value : v,
                          ),
                        );
                        setDirty(true);
                        setReviewed(false);
                      }}
                    />
                  </label>
                ))}
                <label>
                  Handlungsaufforderung
                  <textarea
                    value={cta}
                    maxLength={500}
                    readOnly={version !== job.output_revision}
                    onChange={(e) => {
                      setCta(e.target.value);
                      setDirty(true);
                      setReviewed(false);
                    }}
                  />
                </label>
              </div>
              <p className="quiet">
                Manuelle Änderungen werden nicht automatisch auf Fakten geprüft.
                Quellenreferenzen beziehen sich auf die Generierungsgrundlage.
              </p>
              <div className="buttons">
                <button
                  className="button primary"
                  disabled={busy || !dirty || version !== job.output_revision}
                  onClick={() =>
                    void perform(async () => {
                      display(
                        await api<Job>(
                          `/api/projects/${projectId}/packs/${job.id}/edit`,
                          {
                            expectedVersion: job.output_revision,
                            posts,
                            hooks,
                            cta,
                          },
                        ),
                      );
                      setNotice("Änderungen als neue Version gespeichert.");
                    })
                  }
                >
                  Änderungen speichern
                </button>
                {dirty && (
                  <button
                    className="button secondary"
                    onClick={() => display(job)}
                  >
                    Änderungen verwerfen
                  </button>
                )}
              </div>
              <details>
                <summary>
                  Bestätigte Fakten und Quellen der Generierungsgrundlage
                </summary>
                <ul>
                  {current.facts.map((f) => (
                    <li key={f.id}>
                      <strong>{f.statement}</strong> [{f.id}]
                      {f.sourceUrls.map((url) => (
                        <p key={url}>
                          <a href={url} target="_blank" rel="noreferrer">
                            Quelle ansehen ↗
                          </a>
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
                <p>Unbestätigte Vorschläge wurden ausgeschlossen.</p>
              </details>
              <label className="pilot-checkbox">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Ich habe diese gespeicherte Version geprüft. Ich veröffentliche
                selbst.
              </label>
              <div className="buttons">
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    dirty ||
                    !reviewed ||
                    version !== job.output_revision
                  }
                  onClick={() => void exportPack(true)}
                >
                  Als Markdown herunterladen
                </button>
                <button
                  className="button secondary"
                  disabled={
                    busy ||
                    dirty ||
                    !reviewed ||
                    version !== job.output_revision
                  }
                  onClick={() => void exportPack(false)}
                >
                  Inhalte kopieren
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
