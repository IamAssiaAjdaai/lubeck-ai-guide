import { useState } from "react";
import { sampleFacts, samplePack, packMarkdown, downloadText } from "./sample";
import type { Pack } from "../../../marketing-saas-api/src/pack.contract";
const steps = [
  "Website & Kurzbrief",
  "Fakten prüfen",
  "Ziel & Marketing-Pack",
  "Bearbeiten & exportieren",
];
export default function SampleCampaign() {
  const [step, setStep] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [ack, setAck] = useState(false);
  const [goal, setGoal] = useState("mehr_anfragen");
  const [versions, setVersions] = useState<Pack[]>([]),
    [version, setVersion] = useState(0),
    [draft, setDraft] = useState<Pack | null>(null);
  const [reviewed, setReviewed] = useState(false),
    [notice, setNotice] = useState("");
  const saved = versions[version];
  const dirty =
    !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  function edit(next: Pack) {
    setDraft({ ...next, editorialStatus: "human_edited" });
    setReviewed(false);
    setNotice("");
  }
  function selectStep(next: number) {
    if (dirty) {
      setNotice("Speichere oder verwirf zuerst deine Änderungen.");
      return;
    }
    setStep(next);
    setNotice("");
  }
  function resetFacts(ids: string[]) {
    setSelected(ids);
    setConfirmed(false);
    setAck(false);
    setVersions([]);
    setDraft(null);
    setReviewed(false);
  }
  function generate() {
    const pack = samplePack(goal, selected);
    setVersions([pack]);
    setVersion(0);
    setDraft(pack);
    setStep(3);
    setReviewed(false);
    setNotice("Beispiel-Pack geladen. Keine KI-Anfrage, keine Kosten.");
  }
  async function exportExample(copy = false) {
    if (!draft || dirty || !reviewed || version !== versions.length - 1) return;
    const text =
      "FIKTIVES BEISPIEL — keine reale Firma. Nur im Browser; keine dauerhafte Speicherung.\n\n" +
      packMarkdown(draft, "demo", "synthetic-fixture", version + 1);
    try {
      if (copy) {
        await navigator.clipboard.writeText(text);
        setNotice("Beispiel in die Zwischenablage kopiert.");
      } else {
        downloadText(text);
        setNotice("Beispiel-Markdown heruntergeladen.");
      }
    } catch {
      setNotice("Kopieren nicht verfügbar. Nutze den Markdown-Download.");
    }
  }
  return (
    <div className="sample-workspace">
      <div className="sample-sidebar">
        <div className="sample-brand">
          <span>G</span>
          <div>
            <strong>Glanz Büroservice</strong>
            <small>Fiktives Unternehmen</small>
          </div>
        </div>
        <nav aria-label="Schritte der Beispiel-Kampagne">
          {steps.map((s, i) => (
            <button
              key={s}
              aria-current={step === i ? "step" : undefined}
              disabled={(i === 2 && !confirmed) || (i === 3 && !draft)}
              onClick={() => selectStep(i)}
            >
              <span>0{i + 1}</span>
              {s}
            </button>
          ))}
        </nav>
        <p>
          Interaktives Beispiel mit festen Daten. Keine Anmeldung. Kein
          Website-Abruf. Keine echte KI.
        </p>
        <button
          className="sample-reset"
          onClick={() => {
            setStep(0);
            resetFacts([]);
            setNotice("Beispiel zurückgesetzt.");
          }}
        >
          Beispiel zurücksetzen ↺
        </button>
      </div>
      <div className="sample-main">
        <div className="sample-top">
          <span>PRODUKTTOUR · 0{step + 1} / 04</span>
          <span className="m-badge">Synthetische Daten</span>
        </div>
        <h3 tabIndex={-1}>{steps[step]}</h3>
        {step === 0 && (
          <>
            <p>
              Am Anfang steht dein Unternehmen. Im Arbeitsbereich importierst du
              eine öffentliche Website oder schreibst einen Kurzbrief. Hier
              laden wir ausschließlich feste Beispieldaten.
            </p>
            <label className="m-field">
              Website des fiktiven Betriebs
              <input value="https://glanz.example" readOnly />
            </label>
            <div className="sample-brief">
              <span className="m-kicker">DER BEISPIELBETRIEB</span>
              <h4>Büroreinigung mit persönlichem Kontakt.</h4>
              <p>
                Glanz Büroservice ist ein erfundener Dienstleistungsbetrieb in
                Düsseldorf. Alle Namen, Aussagen und Inhalte dieser Tour sind
                synthetisch.
              </p>
            </div>
            <button className="m-button primary" onClick={() => setStep(1)}>
              Beispiel-Fakten ansehen <span>→</span>
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <p>
              Eine Aussage auf einer Website ist zunächst ein Vorschlag. Wähle
              die Fakten, die in deine Kampagne einfließen dürfen. Im echten
              Arbeitsbereich werden Bestätigungen mit einer Revision
              gespeichert.
            </p>
            <div className="sample-facts">
              {sampleFacts.map((f) => (
                <label key={f.id} className="sample-fact">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.id)}
                    onChange={(e) =>
                      resetFacts(
                        e.target.checked
                          ? [...selected, f.id]
                          : selected.filter((id) => id !== f.id),
                      )
                    }
                  />
                  <span>
                    <strong>{f.statement}</strong>
                    <small>
                      {confirmed
                        ? "Im Beispiel bestätigt"
                        : "Vorschlag · noch nicht bestätigt"}{" "}
                      · {f.sourceUrls[0]}
                      <br />
                      Fiktive Quelle, kein externer Link
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <label className="m-check">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              Ich habe die ausgewählten Beispielfakten geprüft.
            </label>
            <button
              className="m-button primary"
              disabled={!selected.length || !ack}
              onClick={() => {
                setConfirmed(true);
                setStep(2);
              }}
            >
              Fakten im Beispiel bestätigen →
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <p>
              Dein Ziel gibt der Woche eine Richtung. Die Demo lädt einen festen
              Plan mit genau den Beispielfakten, die du bestätigt hast. Sie
              bewertet keine Kampagnenleistung.
            </p>
            <label className="m-field">
              Was möchtest du erreichen?
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option value="mehr_anfragen">Mehr Anfragen gewinnen</option>
                <option value="sichtbarkeit">Bekannter werden</option>
                <option value="kundenbindung">
                  Mit Kunden in Kontakt bleiben
                </option>
              </select>
            </label>
            <div className="sample-summary">
              <div>
                <small>Zielgruppe</small>
                <strong>Büroleitungen in Düsseldorf</strong>
              </div>
              <div>
                <small>Kanal</small>
                <strong>LinkedIn · manuell veröffentlichen</strong>
              </div>
              <div>
                <small>Grundlage</small>
                <strong>{selected.length} im Beispiel bestätigte Fakten</strong>
              </div>
            </div>
            <button className="m-button primary" onClick={generate}>
              Beispiel-Pack laden <span>→</span>
            </button>
            <p className="m-caption">
              Fester Beispielinhalt. Kein KI-Kontingent wird verbraucht.
            </p>
          </>
        )}
        {step === 3 && draft && (
          <>
            <div className="sample-result-title">
              <div>
                <span className="m-kicker">DEIN MARKETING-PACK</span>
                <h4>Die nächste Woche kann kommen.</h4>
                <p>7 Tage · 3 Posts · 3 Hooks · 1 CTA</p>
              </div>
              <label className="m-field">
                Beispielversion
                <select
                  aria-label="Beispielversion"
                  value={version}
                  disabled={dirty}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVersion(v);
                    setDraft(versions[v]);
                    setReviewed(false);
                    setNotice("");
                  }}
                >
                  {versions.map((_, i) => (
                    <option key={i} value={i}>
                      Version {i + 1}
                      {i === versions.length - 1 ? " · aktuell" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="m-caption">
              Ziel:{" "}
              {
                {
                  mehr_anfragen: "Mehr Anfragen gewinnen",
                  sichtbarkeit: "Bekannter werden",
                  kundenbindung: "Mit Kunden in Kontakt bleiben",
                }[draft.goal]
              }
              . Zeitangaben sind Vorschläge, keine terminierten
              Veröffentlichungen.
            </p>
            <ol className="sample-plan">
              {draft.days.map((d) => (
                <li key={d.day}>
                  <span>
                    TAG {d.day}
                    <small>{d.time} · LinkedIn</small>
                  </span>
                  <p>{d.task}</p>
                </li>
              ))}
            </ol>
            <div className="sample-posts">
              {draft.posts.map((p, i) => (
                <label className="m-field" key={i}>
                  <span className="editor-label">
                    POST 0{i + 1}
                    <small>LinkedIn · {p.factIds.join(", ")}</small>
                  </span>
                  <textarea
                    rows={7}
                    maxLength={3000}
                    value={p.text}
                    readOnly={version !== versions.length - 1}
                    onChange={(e) =>
                      edit({
                        ...draft,
                        posts: draft.posts.map((item, index) =>
                          index === i
                            ? { ...item, text: e.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <details className="sample-hooks">
              <summary>Drei Hooks & Handlungsaufforderung bearbeiten</summary>
              {draft.hooks.map((hook, i) => (
                <label key={i} className="m-field">
                  Hook {i + 1}
                  <input
                    value={hook}
                    maxLength={300}
                    readOnly={version !== versions.length - 1}
                    onChange={(e) =>
                      edit({
                        ...draft,
                        hooks: draft.hooks.map((h, index) =>
                          index === i ? e.target.value : h,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label className="m-field">
                Handlungsaufforderung
                <textarea
                  maxLength={500}
                  value={draft.cta}
                  readOnly={version !== versions.length - 1}
                  onChange={(e) => edit({ ...draft, cta: e.target.value })}
                />
              </label>
            </details>
            <details className="sample-hooks">
              <summary>Bestätigte Beispiel-Fakten der Grundlage</summary>
              <ul>
                {draft.facts.map((f) => (
                  <li key={f.id}>
                    [{f.id}] {f.statement}
                  </li>
                ))}
              </ul>
            </details>
            <p className="m-caption">
              {dirty ? "Ungespeicherte Änderungen. " : ""}Manuelle Änderungen
              sind nicht automatisch faktengeprüft. Beispielversionen bleiben
              nur bis zum Neuladen dieser Seite erhalten. Im angemeldeten
              Arbeitsbereich werden Versionen dauerhaft gespeichert.
            </p>
            <div className="m-actions">
              <button
                className="m-button primary"
                disabled={
                  !dirty ||
                  draft.posts.some((p) => !p.text.trim()) ||
                  draft.hooks.some((h) => !h.trim()) ||
                  !draft.cta.trim()
                }
                onClick={() => {
                  setVersions([...versions, draft]);
                  setVersion(versions.length);
                  setNotice(
                    "Neue Beispielversion gespeichert – nur in dieser Sitzung.",
                  );
                }}
              >
                Beispielversion speichern
              </button>
              {dirty && (
                <button
                  className="m-button secondary"
                  onClick={() => {
                    setDraft(saved);
                    setReviewed(false);
                    setNotice("Änderungen verworfen.");
                  }}
                >
                  Änderungen verwerfen
                </button>
              )}
            </div>
            <label className="m-check">
              <input
                type="checkbox"
                disabled={dirty || version !== versions.length - 1}
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              Ich habe diese Beispielversion geprüft. Ich veröffentliche selbst.
            </label>
            <div className="m-actions">
              <button
                className="m-button primary"
                disabled={dirty || !reviewed || version !== versions.length - 1}
                onClick={() => void exportExample()}
              >
                Beispiel als Markdown exportieren ↓
              </button>
              <button
                className="m-button secondary"
                disabled={dirty || !reviewed || version !== versions.length - 1}
                onClick={() => void exportExample(true)}
              >
                Inhalte kopieren
              </button>
            </div>
          </>
        )}
        <p className="sample-status" role="status">
          {notice}
        </p>
      </div>
    </div>
  );
}
