import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import type {
  Asset,
  Brief,
  Job,
  Kit,
  ImageCommand,
} from "../../marketing-saas-api/src/creative/contract";
import "./creative.css";

// Imperative scheduling runs only inside the effect, never during render.
function scheduleExpiry(expiresAt: string, update: () => void) {
  return setTimeout(
    update,
    Math.max(0, Date.parse(expiresAt) - Date.now()) + 1,
  );
}

type ViewJob = Omit<Job, "outputKey" | "review"> & {
  reviewed: boolean;
  stale: boolean;
  expired: boolean;
  legacyDisclosure?: boolean;
};
type View = {
  provider: "mock" | "openai";
  revision: number;
  erasure?: { requestedAt: string; completedAt?: string; policyVersion: 1 };
  kit: Kit;
  assets: Asset[];
  jobs: ViewJob[];
  facts: { id: string; statement: string }[];
  contextRevision: number;
  usage: {
    limits: Record<
      "image" | "video",
      { attempts: number; reservation: number; budget: number }
    >;
    entries: {
      kind: string;
      attempts: number;
      committed: number;
      uncertain: number;
    }[];
  };
};
type ExportResult = {
  filename: string;
  mime: string;
  base64: string;
  metadata: unknown;
};
const stateLabels: Record<string, string> = {
  queued: "In Warteschlange",
  processing: "Wird erstellt",
  completed: "Entwurf bereit",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen",
  expired: "Abgelaufen",
};
function download(bytes: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function CreativeStudio({
  projectId,
  generationId,
  version,
  locked,
  fixedPostIndex,
  libraryOnly = false,
  librarySection = "all",
  onChanged,
}: {
  projectId: string;
  generationId?: string;
  version: number;
  locked: boolean;
  fixedPostIndex?: number;
  libraryOnly?: boolean;
  librarySection?: "all"|"kit"|"media";
  onChanged?: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean|null>(null);
  useEffect(() => {
    let live = true;
    void api<{ enabled: boolean }>("/api/creative-capabilities")
      .then((r) => {
        if (live) setEnabled(r.enabled);
      })
      .catch(() => { if(live) setEnabled(false); });
    return () => {
      live = false;
    };
  }, []);
  return enabled ? (
    <Studio key={projectId} {...{ projectId, generationId, version, locked, fixedPostIndex, libraryOnly, librarySection, onChanged }} />
  ) : libraryOnly ? <section className="panel"><h2>{enabled===null?"Medienwerkzeuge werden geladen …":"Medienwerkzeuge derzeit deaktiviert"}</h2><p>Brand Kit und private Mediathek sind nur in der kontrollierten lokalen Creative-Umgebung verfügbar.</p></section> : null;
}
function Studio({
  projectId,
  generationId,
  version,
  locked,
  fixedPostIndex,
  libraryOnly = false,
  librarySection = "all",
  onChanged,
}: {
  projectId: string;
  generationId?: string;
  version: number;
  locked: boolean;
  fixedPostIndex?: number;
  libraryOnly?: boolean;
  librarySection?: "all"|"kit"|"media";
  onChanged?: () => void;
}) {
  const root = `/api/projects/${projectId}/creative`;
  const requestKey = useRef<string | null>(null);
  const [view, setView] = useState<View | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [postIndex, setPostIndex] = useState(fixedPostIndex ?? 0),
    [objective, setObjective] =
      useState<Brief["objective"]>("leistung_erklaeren"),
    [ratio, setRatio] = useState<Brief["ratio"]>("4:5");
  const [creative, setCreative] = useState<
    NonNullable<ImageCommand["creative"]>
  >({
    style: "abstrakt",
    operation: "generate",
    referenceIds: [],
    outputFormat: "png",
  });
  const [briefPreview, setBriefPreview] = useState<{
    brief: Brief;
    briefHash: string;
    key: string;
  } | null>(null);
  const [briefAccepted, setBriefAccepted] = useState("");
  const [eraseAcknowledged, setEraseAcknowledged] = useState(false);
  const erasureKey = useRef<string | null>(null);
  const draftKey = JSON.stringify({
    generationId,
    version,
    postIndex,
    objective,
    ratio,
    creative,
    revision: view?.revision,
  });
  const briefCurrent = briefPreview?.key === draftKey;
  const briefReady =
    briefCurrent && briefAccepted === briefPreview?.briefHash && !locked;
  const draftCommand = {
    generationId,
    expectedVersion: version,
    postIndex,
    objective,
    ratio,
    creative,
  };
  const [selected, setSelected] = useState(""),
    [reviewedFor, setReviewedFor] = useState("");
  const [kit, setKit] = useState<Kit | null>(null);
  async function load() {
    const data = await api<View>(root);
    setView(data);
    setKit(data.kit);
  }
  useEffect(() => {
    let live = true;
    void api<View>(root)
      .then((data) => {
        if (live) {
          setView(data);
          setKit(data.kit);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [root, generationId, version]);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }
  const jobs =
    view?.jobs.filter(
      (j) =>
        j.kind === "image" && j.brief.binding.generationId === generationId && (fixedPostIndex === undefined || j.brief.binding.postIndex === fixedPostIndex),
    ) ?? [];
  const job = jobs.find((j) => j.id === selected) ?? jobs.at(-1);
  const [clock, setClock] = useState(() => Date.now());
  const expiresAt = job?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setClock(Date.now());
    const timer = scheduleExpiry(expiresAt, update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [expiresAt]);
  const expired =
    !!job?.expired || (!!job && clock >= Date.parse(job.expiresAt));
  const unavailable = locked || !!job?.stale || expired;
  const reviewKey = `${job?.id}:${job?.outputHash}:${version}:${locked}:${expired}:${job?.stale}`;
  const reviewed = reviewedFor === reviewKey;
  const real = view?.provider === "openai";
  return (
    <section className={`panel creative-studio ${libraryOnly ? "library-only" : ""}`} aria-labelledby="creative-title">
      <div className="creative-heading">
        <div>
          <p className="eyebrow">Creative Studio · lokale QA</p>
          <h2 id="creative-title">Dein Text. Ein passender Bildentwurf.</h2>
        </div>
        <span className="creative-badge">
          {real
            ? "Begrenzter KI-Test · Kostenprüfung offen"
            : "Nur Mock · keine KI-Kosten"}
        </span>
      </div>
      <p>
        Private Testumgebung mit synthetischen Daten. Illustrationen sind kein
        Beleg für echte Personen, Räume oder Ergebnisse. Du prüfst und
        veröffentlichst selbst.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!view || !kit ? (
        <p role="status">Brand Kit und Medien werden geladen …</p>
      ) : view.erasure ? (
        <p role="status">
          Creative-Daten und historische Freigaben gelöscht.{" "}
          {view.erasure.completedAt
            ? "Lokale Dateien entfernt."
            : "Dateibereinigung wird sicher wiederholt."}{" "}
          Marketing-Pack und Unternehmensfakten bleiben unverändert. Bereits
          heruntergeladene Dateien musst du selbst löschen.
        </p>
      ) : (
        <>
          <div className="creative-setup">
            <details className="creative-card creative-kit-card" open={libraryOnly&&librarySection==="kit"?true:undefined}>
              <summary>Brand Kit · Version {kit.revision}</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    await api(`${root}/kit`, {
                      expectedRevision: kit.revision,
                      colors: kit.colors,
                      typography: kit.typography,
                      style: kit.style,
                      logoId: kit.logoId,
                      photoIds: kit.photoIds,
                    });
                    setNotice(
                      "Brand Kit gespeichert. Vorhandene Bildfreigaben müssen erneut geprüft werden.",
                    );
                  });
                }}
              >
                <p>
                  Farben und Gestaltung sind editierbar. Unternehmensfakten
                  kommen ausschließlich aus dem bestätigten Brand Context.
                </p>
                <div className="creative-colors">
                  {kit.colors.map((color, i) => (
                    <label key={i}>
                      Farbe {i + 1}
                      <input
                        aria-label={`Farbe ${i + 1}`}
                        type="color"
                        value={color}
                        onChange={(e) =>
                          setKit({
                            ...kit,
                            colors: kit.colors.map((c, n) =>
                              n === i ? e.target.value : c,
                            ),
                          })
                        }
                      />
                      <span>{color}</span>
                    </label>
                  ))}
                </div>
                <label>
                  Typografie
                  <select
                    value={kit.typography}
                    onChange={(e) =>
                      setKit({
                        ...kit,
                        typography: e.target.value as Kit["typography"],
                      })
                    }
                  >
                    <option>Manrope</option>
                    <option>Fraunces</option>
                  </select>
                </label>
                <label>
                  Visueller Stil
                  <select
                    value={kit.style}
                    onChange={(e) =>
                      setKit({ ...kit, style: e.target.value as Kit["style"] })
                    }
                  >
                    <option value="ruhig">Ruhig</option>
                    <option value="klar">Klar</option>
                    <option value="editorial">Editorial</option>
                  </select>
                </label>
                <label>
                  Freigegebenes Logo
                  <select
                    value={kit.logoId ?? ""}
                    onChange={(e) =>
                      setKit({ ...kit, logoId: e.target.value || null })
                    }
                  >
                    <option value="">Kein Logo</option>
                    {view.assets
                      .filter(
                        (a) => a.status === "approved" && a.role === "logo",
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <fieldset>
                  <legend>Freigegebene Geschäftsaufnahmen als Kontext</legend>
                  {view.assets
                    .filter(
                      (a) =>
                        a.status === "approved" && a.role === "business_photo",
                    )
                    .map((a) => (
                      <label className="pilot-checkbox" key={a.id}>
                        <input
                          type="checkbox"
                          checked={kit.photoIds.includes(a.id)}
                          onChange={(e) =>
                            setKit({
                              ...kit,
                              photoIds: e.target.checked
                                ? [...kit.photoIds, a.id]
                                : kit.photoIds.filter((id) => id !== a.id),
                            })
                          }
                        />
                        {a.name}
                      </label>
                    ))}
                  <p className="muted">
                    Das Mock kopiert keine Foto-Inhalte in synthetische Szenen.
                  </p>
                </fieldset>
                <button className="button secondary" disabled={busy}>
                  Brand Kit speichern
                </button>
              </form>
            </details>
            <details className="creative-card creative-media-card" open={libraryOnly&&librarySection==="media"?true:undefined}>
              <summary>Private Mediathek · {view.assets.length} Bilder</summary>
              <p>
                Nur eigene synthetische QA-Bilder hochladen. PNG, JPEG oder
                WebP, maximal 3 MiB und 4096 × 4096 Pixel. Keine SVGs oder
                Animationen. EXIF-Daten werden entfernt.
              </p>
              <label>
                QA-Bild hochladen
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void perform(async () => {
                      if (f.size > 3 * 1024 * 1024)
                        throw new Error("Das Bild ist größer als 3 MiB.");
                      const r = await fetch(`${root}/assets`, {
                        method: "POST",
                        headers: { "Content-Type": f.type },
                        body: f,
                      });
                      if (!r.ok)
                        throw new Error(
                          "Upload abgelehnt. Bitte Dateityp, Größe und Abmessungen prüfen.",
                        );
                      setNotice(
                        "Privat gespeichert. Beschreibung und Rechte vor der Freigabe prüfen.",
                      );
                    });
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="creative-media">
                {view.assets.map((a) => (
                  <AssetCard
                    key={`${a.id}-${a.revision}`}
                    asset={a}
                    root={root}
                    busy={busy}
                    perform={perform}
                  />
                ))}
              </div>
            </details>
          </div>
          <details className="creative-card creative-facts-card">
            <summary>
              Bestätigte Bildgrundlage · Revision {view.contextRevision}
            </summary>
            <ul>
              {view.facts.map((f) => (
                <li key={f.id}>{f.statement}</li>
              ))}
            </ul>
            <p>
              Bestätigte Aussagen sind kein Freibrief für dokumentarisch
              wirkende Bildbehauptungen. Synthetische Entwürfe bleiben
              gekennzeichnet.
            </p>
          </details>
          {libraryOnly ? null : !generationId ? (
            <p>
              Öffne oder erstelle einen gespeicherten Marketing Pack, um einen
              Bildentwurf mit einem Post zu verbinden.
            </p>
          ) : (
            <>
              <form
                className="creative-controls"
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    requestKey.current ??= crypto.randomUUID();
                    const j = await api<{ id: string }>(`${root}/jobs`, {
                      ...draftCommand,
                      reviewedBriefHash: briefPreview?.briefHash,
                      idempotencyKey: requestKey.current,
                    });
                    setSelected(j.id);
                    setReviewedFor("");
                    const result = await api<{ state: string }>(
                      `${root}/jobs/${j.id}/process`,
                      {},
                    );
                    if (result.state !== "completed") {
                      setNotice(
                        "Kein nutzbarer Bildentwurf entstanden. Bitte den Auftragsstatus prüfen. Ungeklärte Reservierungen bleiben gesperrt.",
                      );
                      return;
                    }
                    requestKey.current = null;
                    setNotice(
                      real
                        ? "KI-Entwurf erstellt. Bitte Bild und gespeicherten Post gemeinsam prüfen. Kostenreservierung bleibt gesperrt."
                        : "Mock-Entwurf erstellt. Bitte Bild und gespeicherten Post gemeinsam prüfen.",
                    );
                  });
                }}
              >
                <label hidden={fixedPostIndex !== undefined}>
                  Post auswählen
                  <select
                    value={postIndex}
                    onChange={(e) => setPostIndex(Number(e.target.value))}
                  >
                    {[0, 1, 2].map((n) => (
                      <option key={n} value={n}>
                        Post {n + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Visuelles Ziel
                  <select
                    value={objective}
                    onChange={(e) =>
                      setObjective(e.target.value as Brief["objective"])
                    }
                  >
                    <option value="leistung_erklaeren">
                      Leistung erklären
                    </option>
                    <option value="gespraech_anregen">Gespräch anregen</option>
                    <option value="wiedererkennung">Wiedererkennung</option>
                  </select>
                </label>
                <label>
                  Format
                  <select
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value as Brief["ratio"])}
                  >
                    <option>4:5</option>
                    <option>1:1</option>
                    <option>16:9</option>
                  </select>
                </label>
                <label>
                  Bildstil
                  <select
                    value={creative.style}
                    onChange={(e) =>
                      setCreative({
                        ...creative,
                        style: e.target.value as typeof creative.style,
                      })
                    }
                  >
                    <option value="abstrakt">Abstrakte Illustration</option>
                    <option value="editorial">Ruhig editorial</option>
                    <option value="geometrisch">Geometrisch klar</option>
                  </select>
                </label>
                <label>
                  Bildgrundlage
                  <select
                    value={creative.operation}
                    onChange={(e) =>
                      setCreative({
                        ...creative,
                        operation: e.target.value as typeof creative.operation,
                        referenceIds: [],
                      })
                    }
                  >
                    <option value="generate">
                      Text zu Bild{real ? " · KI-Test" : " · Mock"}
                    </option>
                    <option value="edit" disabled={real}>
                      Mit freigegebenen Referenzen · Mock
                    </option>
                  </select>
                </label>
                {creative.operation === "edit" && (
                  <fieldset className="creative-brief-preview">
                    <legend>Freigegebene Referenzen wählen · maximal 4</legend>
                    {view.assets
                      .filter(
                        (a) =>
                          a.status === "approved" &&
                          a.role === "business_photo" &&
                          view.kit.photoIds.includes(a.id),
                      )
                      .map((a) => (
                        <label key={a.id} className="pilot-checkbox">
                          <input
                            type="checkbox"
                            checked={creative.referenceIds.includes(a.id)}
                            disabled={
                              !creative.referenceIds.includes(a.id) &&
                              creative.referenceIds.length >= 4
                            }
                            onChange={(e) =>
                              setCreative({
                                ...creative,
                                referenceIds: e.target.checked
                                  ? [...creative.referenceIds, a.id]
                                  : creative.referenceIds.filter(
                                      (id) => id !== a.id,
                                    ),
                              })
                            }
                          />
                          {a.name}
                        </label>
                      ))}
                    <p>
                      Nur im gespeicherten Brand Kit freigegebene Quellen. Das
                      Mock prüft Referenzen, bearbeitet aber kein Foto und
                      belegt keine echte Leistung.
                    </p>
                  </fieldset>
                )}
                <button
                  type="button"
                  className="button secondary"
                  disabled={
                    busy ||
                    locked ||
                    (creative.operation === "edit" &&
                      !creative.referenceIds.length)
                  }
                  onClick={() =>
                    void perform(async () => {
                      const preview = await api<{
                        brief: Brief;
                        briefHash: string;
                      }>(`${root}/brief`, {
                        ...draftCommand,
                        idempotencyKey: crypto.randomUUID(),
                      });
                      setBriefPreview({ ...preview, key: draftKey });
                      setBriefAccepted("");
                      setNotice(
                        "Bildidee bereit. Noch kein Versuch oder Budget reserviert.",
                      );
                    })
                  }
                >
                  Bildidee prüfen
                </button>
                {briefCurrent && briefPreview && (
                  <section
                    className="creative-brief-preview"
                    aria-label="Vorschau der Bildidee"
                  >
                    <h3>Diese Grundlage geht in deinen Bildentwurf</h3>
                    <ul>
                      {briefPreview.brief.facts.map((f) => (
                        <li key={f.id}>{f.statement}</li>
                      ))}
                    </ul>
                    <p>
                      Brand Kit v{briefPreview.brief.binding.kitRevision} ·{" "}
                      {creative.referenceIds.length} freigegebene Referenzen ·{" "}
                      {ratio}. Logo und Schrift werden exakt zusammengesetzt.
                      {real
                        ? "Export bleibt als synthetische KI-Illustration markiert."
                        : "Export bleibt ein ausdrücklich markiertes Mock-PNG."}
                    </p>
                    <p>
                      Abstrakte Illustration. Keine erfundenen Personen, Räume,
                      Produkte, Ergebnisse, Preise oder Zertifikate als echte
                      Unternehmensnachweise.
                    </p>
                    <label className="pilot-checkbox">
                      <input
                        type="checkbox"
                        checked={briefAccepted === briefPreview.briefHash}
                        onChange={(e) =>
                          setBriefAccepted(
                            e.target.checked ? briefPreview.briefHash : "",
                          )
                        }
                      />
                      Ich habe die Bildidee und die freigegebenen Fakten
                      geprüft.
                    </label>
                  </section>
                )}
                <button
                  className="button primary"
                  disabled={busy || locked || !briefReady}
                >
                  {real ? "Begrenzten KI-Test anfragen" : "Mock-Bild erstellen"}
                </button>
              </form>
              {locked && (
                <p role="status">
                  Bitte die aktuelle Pack-Version öffnen und Textänderungen
                  speichern.
                </p>
              )}
              {jobs.length > 0 && (
                <label>
                  Bildverlauf
                  <select
                    value={job?.id ?? ""}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setReviewedFor("");
                    }}
                  >
                    {jobs.map((j, i) => (
                      <option value={j.id} key={j.id}>
                        Entwurf {i + 1} · Post {j.brief.binding.postIndex + 1} ·{" "}
                        {
                          stateLabels[
                            j.expired || clock >= Date.parse(j.expiresAt)
                              ? "expired"
                              : j.state
                          ]
                        }
                        {j.stale ? " · veraltet" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {job && !unavailable && job.state === "completed" && (
                <a
                  className="creative-review-jump"
                  href={`#creative-review-${job.id}`}
                >
                  Direkt zu Bildprüfung & Export ↓
                </a>
              )}
              {job && (
                <div className="creative-result">
                  <div className="creative-art">
                    {job.state === "completed" && !unavailable ? (
                      <img
                        src={`${root}/jobs/${job.id}/output`}
                        alt={
                          job.provider === "openai"
                            ? "KI-generierte synthetische Illustration; keine echte Unternehmensaufnahme"
                            : "Synthetische geometrische Mock-Illustration, ohne KI generiert; keine echte Unternehmensaufnahme"
                        }
                      />
                    ) : (
                      <p>
                        {expired
                          ? job.provider === "openai"
                            ? "Ausgabe abgelaufen. Kostenreservierung prüfen; keinen Ersatzauftrag starten."
                            : "Ausgabe abgelaufen. Bitte einen neuen Mock-Entwurf erstellen."
                          : job.legacyDisclosure
                            ? job.provider === "openai"
                              ? "Kennzeichnung fehlt. Ausgabe bleibt gesperrt; Kostenreservierung prüfen."
                              : "Älterer Mock ohne aktuelle Kennzeichnung. Bitte neu erstellen."
                            : job.stale
                              ? "Grundlage geändert. Neuen Entwurf erstellen."
                              : stateLabels[job.state]}
                      </p>
                    )}
                    <span>
                      {job.provider === "openai"
                        ? "KI – SYNTHETISCHE ILLUSTRATION"
                        : "MOCK – OHNE KI GENERIERT · Synthetische Illustration"}
                    </span>
                  </div>
                  <div
                    className="creative-review"
                    id={`creative-review-${job.id}`}
                    tabIndex={-1}
                  >
                    <p className="eyebrow">
                      Post {job.brief.binding.postIndex + 1} · Textversion{" "}
                      {job.brief.binding.version}
                    </p>
                    <h3>Bild und Aussage gehören zusammen.</h3>
                    <p className="creative-post">{job.brief.editorialText}</p>
                    {["queued", "processing"].includes(job.state) && (
                      <div className="buttons">
                        {job.state === "queued" && (
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() =>
                              void perform(async () => {
                                await api(`${root}/jobs/${job.id}/process`, {});
                              })
                            }
                          >
                            {job.provider === "openai"
                              ? "KI-Test verarbeiten"
                              : "Mock verarbeiten"}
                          </button>
                        )}
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await api(`${root}/jobs/${job.id}/cancel`, {});
                            })
                          }
                        >
                          Bildauftrag abbrechen
                        </button>
                      </div>
                    )}
                    <details>
                      <summary>Bildidee und geprüfte Grundlage</summary>
                      <ul>
                        {job.brief.facts.map((f) => (
                          <li key={f.id}>{f.statement}</li>
                        ))}
                      </ul>
                      <ul>
                        {job.brief.constraints.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </details>
                    {job.error && (
                      <p role="alert">
                        {job.provider === "openai" && job.providerPending
                          ? "Die Kostenlage ist unklar. Keine automatische Wiederholung und keinen Ersatzauftrag starten. Die Reservierung bleibt gesperrt."
                          : job.provider === "openai" &&
                              [
                                "LIVE_IMAGE_SPEND_NOT_AUTHORIZED",
                                "IMAGE_SERVER_CREDENTIAL_REQUIRED",
                              ].includes(job.error)
                            ? "Der Anbieter-Aufruf ist nicht freigegeben oder die Server-Konfiguration fehlt. Es wurde kein Anbieter kontaktiert."
                            : job.error === "MOCK_RENDER_FAILED"
                              ? "Mock konnte nicht gerendert werden. Es sind keine Anbieter-Kosten entstanden."
                              : [
                                    "IMAGE_TIMEOUT",
                                    "IMAGE_COST_UNKNOWN",
                                    "IMAGE_RESULT_INVALID",
                                  ].includes(job.error)
                                ? "Die Antwort oder Kostenlage ist unklar. Keine automatische Wiederholung. Die Reservierung bleibt gesperrt."
                                : job.error === "CREATIVE_KILL_SWITCH"
                                  ? "Bildaufträge sind global gesperrt. Es wurde kein neuer Anbieter-Aufruf gestartet."
                                  : job.error === "LIVE_IMAGE_PROVIDER_DISABLED"
                                    ? "Reale Bildanbieter bleiben gesperrt. Es wurde kein Anbieter kontaktiert."
                                    : "Die Bildgrundlage ist nicht mehr aktuell. Bitte neu erstellen."}
                      </p>
                    )}
                    <label className="pilot-checkbox">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        disabled={
                          busy || unavailable || job.state !== "completed"
                        }
                        onChange={(e) =>
                          setReviewedFor(e.target.checked ? reviewKey : "")
                        }
                      />
                      Ich habe dieses Bild und diesen Text geprüft. Das Bild ist
                      synthetisch und kein dokumentarischer Nachweis.
                    </label>
                    <div className="buttons">
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          !reviewed ||
                          unavailable ||
                          job.state !== "completed"
                        }
                        onClick={() =>
                          void perform(async () => {
                            await api(`${root}/jobs/${job.id}/review`, {
                              outputHash: job.outputHash,
                              imageReviewed: true,
                              textReviewed: true,
                              syntheticAcknowledged: true,
                            });
                            await api(`${root}/jobs/${job.id}/attach`, {});
                            setNotice(
                              "Diese Bildversion ist geprüft und am gespeicherten Post angehängt.",
                            );
                          })
                        }
                      >
                        {job.attached && !expired
                          ? "Am Post angehängt"
                          : "Prüfen und am Post anhängen"}
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy || unavailable || !job.attached}
                        onClick={() =>
                          void perform(async () => {
                            const r = await api<ExportResult>(
                              `${root}/jobs/${job.id}/export`,
                              { reviewed: true },
                            );
                            download(
                              Uint8Array.from(atob(r.base64), (c) =>
                                c.charCodeAt(0),
                              ),
                              r.mime,
                              r.filename,
                            );
                            download(
                              JSON.stringify(r.metadata, null, 2),
                              "application/json",
                              r.filename.replace(".png", "-nachweis.json"),
                            );
                            setNotice(
                              "Demo-Bild und Versionsnachweis heruntergeladen. Veröffentlichung bleibt manuell.",
                            );
                          })
                        }
                      >
                        Demo-Bild + Nachweis exportieren
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <details className="creative-card creative-erasure-card">
            <summary>Datenschutz & lokale Löschung</summary>
            <p>
              Entfernt Brand Kit, Quellen, Bildaufträge und historische
              Creative-Freigaben dieses Projekts. Die Löschung ist endgültig.
              Unternehmensfakten und Marketing-Packs bleiben bestehen. Downloads
              lassen sich nicht zurückrufen. Ungeklärte Kosten bleiben
              reserviert.
            </p>
            <label className="pilot-checkbox">
              <input
                type="checkbox"
                checked={eraseAcknowledged}
                onChange={(e) => setEraseAcknowledged(e.target.checked)}
              />
              Ich möchte die lokalen Creative-Daten einschließlich ihrer
              Historie löschen.
            </label>
            <button
              className="button secondary"
              disabled={busy || !eraseAcknowledged}
              onClick={() =>
                void perform(async () => {
                  erasureKey.current ??= crypto.randomUUID();
                  await api(`${root}/erasure`, {
                    expectedRevision: view.revision,
                    idempotencyKey: erasureKey.current,
                    confirmation: "CREATIVE_QA_LOESCHEN",
                  });
                  setNotice(
                    "Lokale Creative-Löschung angefordert. Ungeklärte Kosten bleiben gesperrt.",
                  );
                })
              }
            >
              Creative-Daten endgültig löschen
            </button>
          </details>
          <p className="creative-quota">
            Bild-QA:{" "}
            {view.usage.entries.find((e) => e.kind === "image")?.attempts ?? 0}{" "}
            / {view.usage.limits.image.attempts} Versuche im Monat.{" "}
            {real
              ? "Anbieter-Abrechnung noch nicht bestätigt."
              : "Simulation: 0 € echte Anbieter-Kosten."}{" "}
            Ungeklärte Reservierungen bleiben gesperrt. Video ist ausschließlich
            als interner Mock-Vertrag vorbereitet.
          </p>
        </>
      )}
    </section>
  );
}
function AssetCard({
  asset: a,
  root,
  busy,
  perform,
}: {
  asset: Asset;
  root: string;
  busy: boolean;
  perform: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [name, setName] = useState(a.name),
    [alt, setAlt] = useState(a.alt === "Noch nicht beschrieben" ? "" : a.alt),
    [role, setRole] = useState(a.role),
    [rights, setRights] = useState(false),
    [deleting, setDeleting] = useState(false);
  return (
    <article className="creative-asset" data-asset-id={a.id}>
      <img src={`${root}/assets/${a.id}`} alt={a.alt} />
      <p>
        {a.status === "approved" ? "Freigegebene Quelle" : "Prüfung offen"} ·
        eigene QA-Datei · v{a.revision}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            await api(`${root}/assets/${a.id}/metadata`, {
              expectedRevision: a.revision,
              name,
              alt,
              role,
            });
          });
        }}
      >
        <label>
          Bildname
          <input
            value={name}
            disabled={busy}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Bildbeschreibung
          <input
            value={alt}
            disabled={busy}
            maxLength={240}
            required
            onChange={(e) => setAlt(e.target.value)}
          />
        </label>
        <label>
          Verwendung
          <select
            value={role}
            disabled={busy}
            onChange={(e) => setRole(e.target.value as Asset["role"])}
          >
            <option value="business_photo">Geschäftsaufnahme</option>
            <option value="logo">Logo</option>
          </select>
        </label>
        <button className="button secondary" disabled={busy}>
          Bildangaben speichern
        </button>
      </form>
      {a.status !== "approved" && (
        <>
          <label className="pilot-checkbox">
            <input
              type="checkbox"
              checked={rights}
              disabled={busy}
              onChange={(e) => setRights(e.target.checked)}
            />
            Eigene synthetische QA-Datei. Rechte und Herkunft geprüft;
            Beschreibung stimmt.
          </label>
          <button
            className="button secondary"
            disabled={
              busy || !rights || !alt || a.alt === "Noch nicht beschrieben"
            }
            onClick={() =>
              void perform(async () => {
                await api(`${root}/assets/${a.id}/approve`, {
                  expectedRevision: a.revision,
                  rightsConfirmed: true,
                  sourceConfirmed: true,
                });
              })
            }
          >
            Quelle freigeben
          </button>
        </>
      )}
      {!deleting ? (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setDeleting(true)}
        >
          Bild löschen …
        </button>
      ) : (
        <>
          <p>
            Zugriff wird sofort gesperrt und die Datei entfernt. Verknüpfte
            Freigaben werden ungültig.
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await api(`${root}/assets/${a.id}/delete`, {
                  expectedRevision: a.revision,
                });
              })
            }
          >
            Löschen bestätigen
          </button>
          <button
            className="button secondary"
            onClick={() => setDeleting(false)}
          >
            Abbrechen
          </button>
        </>
      )}
    </article>
  );
}
