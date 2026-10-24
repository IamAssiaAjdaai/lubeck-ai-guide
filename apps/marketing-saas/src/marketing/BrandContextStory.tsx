import { useState } from "react";
const stages = [
  {
    label: "Vorschlag",
    title: "Die Website ist ein Anfang.",
    body: "„Wir reinigen Büros in Düsseldorf.“",
    note: "Fiktive Quelle: glanz.example · noch ungeprüft",
  },
  {
    label: "Bestätigung",
    title: "Du kennst deinen Betrieb.",
    body: "Du prüfst die Quelle und erlaubst die Verwendung dieser Aussage.",
    note: "Im Beispiel bestätigt · kein automatischer Wahrheitsnachweis",
  },
  {
    label: "Marketing-Pack",
    title: "Dein Wissen bekommt ein Ziel.",
    body: "Ziel: mehr Anfragen. Ein Plan und drei Posts auf Basis der bestätigten Leistung.",
    note: "Feste Beispielvorlage · keine KI-Anfrage",
  },
];
export default function BrandContextStory() {
  const [stage, setStage] = useState(0);
  const current = stages[stage];
  return (
    <section className="m-context-story m-section" id="brand-kontext">
      <div className="m-container context-story-grid">
        <div>
          <span className="m-kicker">
            DEIN BRAND CONTEXT / WISSEN MIT HERKUNFT
          </span>
          <h2>
            Die KI braucht Kontext.
            <br />
            <em>Du bringst ihn mit.</em>
          </h2>
          <p>
            Deine Leistungen, dein Unternehmen, dein Kampagnenziel: Zusammen
            geben sie dem Entwurf eine Richtung. Eine Website allein reicht
            dafür nicht. Welche Aussagen verwendet werden dürfen, bestätigst du
            selbst.
          </p>
          <a className="m-text-link" href="#beispiel">
            Den vollständigen Weg selbst durchgehen →
          </a>
        </div>
        <div className="context-story-proof">
          <span className="m-kicker">
            SYNTHETISCHES BEISPIEL · GLANZ BÜROSERVICE
          </span>
          <div role="group" aria-label="Weg des Unternehmenswissens">
            {stages.map((s, i) => (
              <button
                type="button"
                key={s.label}
                aria-pressed={stage === i}
                onClick={() => setStage(i)}
              >
                <span>0{i + 1}</span>
                {s.label}
              </button>
            ))}
          </div>
          <div aria-live="polite" className="context-story-state">
            <h3>{current.title}</h3>
            <p>{current.body}</p>
            <small>{current.note}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
