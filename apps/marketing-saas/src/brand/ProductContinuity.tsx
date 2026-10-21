import { useState } from "react";
import ConceptPack from "./ConceptPack";
const views = ["Anmeldung", "Unternehmensprofil", "Marketing-Pack"] as const;
export default function ProductContinuity() {
  const [view, setView] = useState(0);
  return (
    <section className="bc-continuity bc-wrap" id="produktstil">
      <div className="bc-section-heading">
        <span className="bc-label">EIN PRODUKT. EINE RUHIGE HANDSCHRIFT.</span>
        <h2>
          Vom ersten Hallo
          <br />
          bis <em>„passt zu uns“.</em>
        </h2>
        <p>
          So könnte sich die grüne Identität im Produkt fortsetzen. Isolierte
          Gestaltungsstudie mit fiktiven Daten; keine Kontoerstellung, keine
          Speicherung.
        </p>
      </div>
      <div
        className="bc-screen-switch"
        role="group"
        aria-label="Produktansicht wählen"
      >
        {views.map((label, i) => (
          <button
            type="button"
            key={label}
            aria-pressed={view === i}
            onClick={() => setView(i)}
          >
            {String(i + 1).padStart(2, "0")} · {label}
          </button>
        ))}
      </div>
      <div className="bc-product-shell">
        <aside className="bc-product-rail" aria-label="Gestaltungsstudie">
          <strong>
            w / <span>Name offen</span>
          </strong>
          <p>
            Dein Wissen.
            <br />
            Deine nächste Woche.
          </p>
          <span>
            GLANZ BÜROSERVICE
            <br />
            Fiktiver Beispielbetrieb
          </span>
          <small>
            Geschlossener Pilot
            <br />
            Keine öffentliche Anmeldung
          </small>
        </aside>
        <div className="bc-product-screen">
          <span className="bc-label">
            GESTALTUNGSSTUDIE · {views[view].toUpperCase()}
          </span>
          {view === 0 ? (
            <div className="bc-auth-study">
              <span className="bc-study-chip">Zugang nur nach Freigabe</span>
              <h3>
                Ein guter Anfang.
                <br />
                <em>Dein Arbeitsbereich.</em>
              </h3>
              <p>
                Die Gestaltung zeigt den vorgesehenen Zugang für freigegebene
                Konten. Diese Vorschau erfasst keine Daten.
              </p>
              <dl>
                <div>
                  <dt>E-Mail</dt>
                  <dd>beispiel@glanz.example</dd>
                </div>
                <div>
                  <dt>Passwort</dt>
                  <dd aria-label="Passwort wird nicht erfasst">••••••••••••</dd>
                </div>
              </dl>
              <button
                className="bc-button"
                type="button"
                onClick={() => setView(1)}
              >
                Nächste Designansicht →
              </button>
            </div>
          ) : view === 1 ? (
            <div className="bc-onboarding-study">
              <span className="bc-study-chip">01 / Wissen bestätigen</span>
              <h3>
                Du weißt,
                <br />
                <em>was stimmt.</em>
              </h3>
              <p>
                Aus Website-Vorschlägen werden erst nach deiner Prüfung Angaben
                für die Kampagne.
              </p>
              <article>
                <span>LEISTUNG · FIKTIVER WEBSITE-VORSCHLAG</span>
                <h4>Wir reinigen Büros in Düsseldorf.</h4>
                <p>Quelle: glanz.example · im Beispiel menschlich bestätigt</p>
              </article>
              <p className="bc-study-note">
                Die Bestätigung erteilt die Nutzungserlaubnis für den Entwurf.
                Sie ersetzt keine Wahrheitsprüfung.
              </p>
              <button
                className="bc-button"
                type="button"
                onClick={() => setView(2)}
              >
                Beispiel-Pack ansehen →
              </button>
            </div>
          ) : (
            <ConceptPack prefix="b-workspace" />
          )}
        </div>
      </div>
      <p className="bc-continuity-note">
        Nur die Gestaltung wird hier erprobt. Authentifizierung, Faktenprüfung
        und gespeicherte Versionen im bestehenden Arbeitsbereich bleiben
        unverändert.
      </p>
    </section>
  );
}
