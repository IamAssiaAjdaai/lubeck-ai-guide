/* eslint-disable @next/next/no-img-element -- Standalone Vite concept review. */
import { useEffect, useRef, useState } from "react";
import ConceptPack from "./ConceptPack";
import ProductContinuity from "./ProductContinuity";
import "./brand-concepts.css";
type Direction = "kernmut" | "wirkfaden";
const names = { kernmut: "Kernmut", wirkfaden: "Wirkfaden" };
function Mark({ direction }: { direction: Direction }) {
  return direction === "kernmut" ? (
    <svg className="bc-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M6 32V8h12v12h14v12H6Z" fill="currentColor" />
      <path d="M23 5h12v10H23V5Z" fill="currentColor" />
    </svg>
  ) : (
    <svg className="bc-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M5 10v14c0 8 11 8 11 0V15c0-8 10-8 10 0v10c0 8 10 8 10 0V10"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="8" r="3" fill="currentColor" />
    </svg>
  );
}
function ReviewBar({ direction }: { direction?: Direction }) {
  return (
    <div className="brand-review-bar">
      <a href="/design/brand">MKT-BRAND-01 · Designreview</a>
      <span>B visuell gewählt · Name offen</span>
      <nav aria-label="Konzept wechseln">
        <a
          aria-current={direction === "kernmut" ? "page" : undefined}
          href="/design/brand/kernmut"
        >
          A · Kernmut
        </a>
        <a
          aria-current={direction === "wirkfaden" ? "page" : undefined}
          href="/design/brand/wirkfaden"
        >
          B · Wirkfaden
        </a>
        <a href="/">#411 Baseline ↗</a>
      </nav>
    </div>
  );
}
function ContextFeature({ direction }: { direction: Direction }) {
  const [stage, setStage] = useState(0);
  const copy = [
    [
      "Vorschlag aus der Website",
      "„Wir reinigen Büros in Düsseldorf.“",
      "Quelle im Beispiel: glanz.example · noch ungeprüft",
    ],
    [
      "Von einem Menschen bestätigt",
      "Diese Aussage darf in das Beispiel-Pack einfließen.",
      "Bestätigung ist keine Garantie für Quellenwahrheit.",
    ],
    [
      "Als Kontext im Pack verwendet",
      "Eine konkrete Leistung. Ein passendes Kampagnenziel.",
      "Manuelle Textänderungen erneut prüfen.",
    ],
  ];
  return (
    <section className="bc-context" id="kontext">
      <div className="bc-wrap bc-context-grid">
        <div>
          <span className="bc-label">01 / DER ANFANG GUTER INHALTE</span>
          <h2>
            {direction === "kernmut" ? (
              <>
                Die KI braucht
                <br />
                keine Floskeln.
                <br />
                <em>Dein Wissen.</em>
              </>
            ) : (
              <>
                Ein guter Faden
                <br />
                beginnt mit
                <br />
                <em>deinem Wissen.</em>
              </>
            )}
          </h2>
          <p>
            Deine Website liefert Vorschläge. Du prüfst die Aussagen und ihre
            Herkunft. Erst bestätigte Fakten werden zur Grundlage deiner
            Kampagne.
          </p>
          <p className="bc-small">
            Die echte KI-Anbindung ist implementiert. Live-Qualität und Kosten
            sind noch nicht abgenommen. Dieses Beispiel lädt eine feste Vorlage.
          </p>
        </div>
        <div className="bc-context-proof">
          <div
            className="bc-context-tabs"
            role="group"
            aria-label="Kontext im Beispiel nachvollziehen"
          >
            {["Vorschlag", "Bestätigung", "Kontext"].map((s, i) => (
              <button
                key={s}
                aria-pressed={stage === i}
                onClick={() => setStage(i)}
              >
                <span>0{i + 1}</span>
                {s}
              </button>
            ))}
          </div>
          <div className="bc-fact-sheet" aria-live="polite">
            <span className="bc-label">FIKTIVER BÜROSERVICE · DEMO-1</span>
            <h3>{copy[stage][0]}</h3>
            <blockquote>{copy[stage][1]}</blockquote>
            <p>{copy[stage][2]}</p>
            <div className="bc-provenance">
              <span>Website</span>
              <span aria-hidden="true">→</span>
              <span>Dein Urteil</span>
              <span aria-hidden="true">→</span>
              <span>Kampagne</span>
            </div>
          </div>
          <span className="bc-proof-caption">
            Inhalte mit Herkunft. Entscheidungen mit einem Menschen.
          </span>
        </div>
      </div>
    </section>
  );
}
export function ConceptPage({ direction }: { direction: Direction }) {
  const [menu, setMenu] = useState(false);
  const a = direction === "kernmut";
  return (
    <div className={`brand-concept bc-${direction}`}>
      <a className="bc-skip" href="#concept-main">
        Zum Inhalt springen
      </a>
      <ReviewBar direction={direction} />
      <header className="bc-header bc-wrap">
        <a className="bc-wordmark" href={`/design/brand/${direction}`}>
          <Mark direction={direction} />
          {names[direction].toLowerCase()}
          <span>{a ? "Konzept A" : "Namensvorschlag"}</span>
        </a>
        <button
          className="bc-menu"
          aria-expanded={menu}
          aria-controls="bc-nav"
          onClick={() => setMenu(!menu)}
        >
          {menu ? "Schließen ×" : "Menü ☰"}
        </button>
        <nav
          id="bc-nav"
          className={menu ? "open" : ""}
          aria-label="Konzeptnavigation"
        >
          <a href="#kontext" onClick={() => setMenu(false)}>
            Warum Kontext?
          </a>
          <a href="#pack" onClick={() => setMenu(false)}>
            Das Marketing-Pack
          </a>
          <a href="/#pilot-status">Pilot geschlossen ↗</a>
        </nav>
        <a className="bc-header-link" href="/#beispiel">
          Bestehende Tour ↗
        </a>
      </header>
      <main id="concept-main">
        {a ? (
          <section className="bc-hero bc-wrap">
            <div className="bc-hero-copy">
              <span className="bc-label">
                <span className="bc-live-dot" /> MARKETING FÜR BETRIEBE, DIE
                ANPACKEN.
              </span>
              <h1>
                Dein Können.
                <br />
                Dein nächster
                <br />
                <em>Marketingplan.</em>
              </h1>
              <p>
                Du machst deinen Job. Wir geben deinem Marketing eine Richtung:
                sieben Tage, drei deutsche Post-Entwürfe und dein Wissen als
                Grundlage.
              </p>
              <div className="bc-actions">
                <a className="bc-button" href="#pack">
                  Beispiel-Pack entdecken <span>↘</span>
                </a>
                <a className="bc-link" href="#kontext">
                  Wie Kontext den Unterschied macht →
                </a>
              </div>
              <span className="bc-small">
                Ohne Konto · fiktive Daten · keine KI-Kosten
              </span>
            </div>
            <div className="bc-a-art">
              <div className="bc-source-note">
                <span>DER KERN: DEIN BETRIEB</span>
                <strong>
                  „Wir reinigen Büros
                  <br />
                  in Düsseldorf.“
                </strong>
                <small>Fiktive Aussage · im Beispiel bestätigt</small>
                <svg viewBox="0 0 150 70" aria-hidden="true">
                  <path
                    d="M5 5C100 5 35 63 135 55m-12-10 14 11-17 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="bc-hero-pack">
                <ConceptPack prefix="a-hero" />
              </div>
              <span className="bc-edition">
                DEIN WISSEN.
                <br />
                DEINE WOCHE.
              </span>
            </div>
          </section>
        ) : (
          <section className="bc-b-hero">
            <div className="bc-wrap bc-b-hero-grid">
              <div className="bc-b-copy">
                <span className="bc-label">
                  DEIN WISSEN. EINE WOCHE MIT PLAN.
                </span>
                <h1>
                  Dein Unternehmen kennt sich aus.{" "}
                  <em>Dein Marketing jetzt auch.</em>
                </h1>
                <p>
                  Drei deutsche Posts. Sieben Tage mit Plan. Aus deinen
                  bestätigten Fakten. Du prüfst und veröffentlichst.
                </p>
                <div className="bc-actions">
                  <a className="bc-button" href="#hero-pack">
                    Beispiel selbst bearbeiten <span>↗</span>
                  </a>
                  <span className="bc-small">
                    Fiktive Daten · ohne Konto · ohne KI-Aufruf
                  </span>
                </div>
                <div className="bc-b-source">
                  <span>WISSEN → ZIEL → PACK</span>
                  <p>
                    Deine Erfahrung ist die Grundlage.
                    <br />
                    Die Entscheidung bleibt bei dir.
                  </p>
                </div>
              </div>
              <div className="bc-b-live-preview" id="hero-pack">
                <div className="bc-b-preview-caption">
                  <span>DEIN MARKETING-PACK</span>
                  <span>Direkt ausprobieren ↙</span>
                </div>
                <ConceptPack prefix="b-hero" compact />
              </div>
            </div>
          </section>
        )}
        <section className="bc-delivery">
          <div className="bc-wrap">
            <p>
              Ein klarer Rahmen.
              <br />
              <strong>Dein Marketing-Pack.</strong>
            </p>
            <div>
              <strong>7</strong>
              <span>Tage mit Plan</span>
            </div>
            <div>
              <strong>3</strong>
              <span>editierbare Posts</span>
            </div>
            <div>
              <strong>3 + 1</strong>
              <span>Hooks & CTA</span>
            </div>
            <p className="bc-human">
              Die KI entwirft.
              <br />
              <strong>Du entscheidest.</strong>
            </p>
          </div>
        </section>
        <ContextFeature direction={direction} />
        {!a && <ProductContinuity />}
        <section className="bc-workflow bc-wrap" id="ablauf">
          <div className="bc-section-heading">
            <span className="bc-label">02 / VOM WISSEN ZUR WOCHE</span>
            <h2>
              {a ? (
                <>
                  Ein Plan, der mit
                  <br />
                  dir <em>anfängt.</em>
                </>
              ) : (
                <>
                  Dein Wissen zieht sich
                  <br />
                  durch <em>jeden Schritt.</em>
                </>
              )}
            </h2>
            <p>
              Keine Chat-Schleife. Ein nachvollziehbarer Weg von deinen Angaben
              zu Inhalten, die du prüfen und bearbeiten kannst.
            </p>
          </div>
          <ol>
            {[
              [
                "Website oder Kurzbrief",
                "Dein Unternehmen ist der Ausgangspunkt.",
              ],
              [
                "Fakten prüfen & bestätigen",
                "Du entscheidest, welche Aussagen verwendet werden dürfen.",
              ],
              [
                "Ziel wählen & Pack erstellen",
                "Ein Ziel, sieben Tage, drei editierbare Entwürfe.",
              ],
              [
                "Bearbeiten & manuell exportieren",
                "Quellen, Versionen und Veröffentlichung bleiben in deiner Hand.",
              ],
            ].map(([t, p], i) => (
              <li key={t}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </div>
              </li>
            ))}
          </ol>
          <a className="bc-link" href="/#beispiel">
            Die vollständige bestehende Produkttour öffnen ↗
          </a>
        </section>
        <section className="bc-demo-section" id="pack">
          <div className="bc-wrap">
            <div className="bc-section-heading">
              <span className="bc-label">03 / PROBIER DEN UNTERSCHIED</span>
              <h2>
                Drei Posts.
                <br />
                <em>Deine Worte.</em>
              </h2>
              <p>
                Wechsle zwischen Posts, Hooks und Plan. Bearbeite den fiktiven
                Entwurf und prüfe ihn vor dem Export. Keine echte
                KI-Generierung.
              </p>
            </div>
            <div className="bc-demo-grid">
              <ConceptPack prefix={`${direction}-demo`} />
              <aside className="bc-editorial-note">
                <span className="bc-label">BEWUSST MIT MENSCH</span>
                <h3>
                  Dein Fachwissen
                  <br />
                  hat hier das
                  <br />
                  <em>letzte Wort.</em>
                </h3>
                <p>
                  Bestätigte Fakten sind die Grundlage. Ein Textentwurf ersetzt
                  weder dein Urteil noch die Prüfung vor der Veröffentlichung.
                </p>
                <a className="bc-link" href="/auth">
                  Bestehender lokaler Arbeitsbereich ↗
                </a>
                <span className="bc-small">
                  Lokale Testkonten. Kein öffentlicher Pilot.
                </span>
              </aside>
            </div>
          </div>
        </section>
        <section className="bc-product-proof bc-wrap">
          <div>
            <span className="bc-label">04 / SCHON IM LOKALEN PRODUKT</span>
            <h2>
              Ein Entwurf ist
              <br />
              ein <em>Anfang.</em>
            </h2>
            <p>
              Im bestehenden Arbeitsbereich bearbeitest du Posts und Hooks,
              speicherst neue Versionen und siehst ihre Faktenreferenzen. Den
              geprüften Inhalt kopierst du oder exportierst ihn als Markdown.
            </p>
            <a className="bc-link" href="/">
              Akzeptierte #411-Produktoberfläche ansehen ↗
            </a>
          </div>
          <figure>
            <img
              src="/product/editor.webp"
              width="1000"
              height="694"
              loading="lazy"
              alt="Echter Editor des bestehenden lokalen Produkts mit synthetischem Büroservice, direkten Inhaltstabs und editierbarem Post"
            />
            <figcaption>
              Echter lokaler MVP · synthetische Demo · bestehende Identität
            </figcaption>
          </figure>
        </section>
      </main>
      <footer className="bc-footer">
        <div className="bc-wrap">
          <div className="bc-wordmark">
            <Mark direction={direction} />
            {names[direction].toLowerCase()}
          </div>
          <h2>
            {a ? (
              <>
                Eine Richtung.
                <br />
                Noch <em>deine Entscheidung.</em>
              </>
            ) : (
              <>
                Die Richtung steht.
                <br />
                <em>Der Pilot bleibt geschlossen.</em>
              </>
            )}
          </h2>
          <p>
            {a
              ? "Archiviertes Vergleichskonzept. "
              : "Grüne Richtung gewählt. "}
            Der Name ist nicht freigegeben. Diese Gestaltungsstudie erfasst
            keine Kontakte. Ein öffentlicher Start ist noch nicht freigegeben.
          </p>
          <nav aria-label="Designreview und Freigabestatus">
            <a className="bc-button" href="/design/brand">
              Beide Konzepte vergleichen →
            </a>
            <a className="bc-link" href="/rechtliches">
              Rechtlicher Freigabestatus ↗
            </a>
          </nav>
          <small>
            Kein öffentliches Angebot · keine Registrierung · kein Billing ·
            keine automatische Veröffentlichung
          </small>
        </div>
      </footer>
    </div>
  );
}
function MiniBrowser({
  direction,
  mobile,
}: {
  direction: Direction;
  mobile: boolean;
}) {
  const viewportWidth = mobile ? 390 : 1440;
  const ref = useRef<HTMLDivElement>(null),
    [scale, setScale] = useState(0.4);
  useEffect(() => {
    if (!ref.current) return;
    const o = new ResizeObserver(([e]) =>
      setScale(e.contentRect.width / viewportWidth),
    );
    o.observe(ref.current);
    return () => o.disconnect();
  }, [viewportWidth]);
  return (
    <div
      className="bc-mini-browser"
      ref={ref}
      style={{ aspectRatio: `${viewportWidth} / 1000` }}
    >
      <iframe
        title={`Nicht interaktive Übersicht: ${names[direction]}`}
        src={`/design/brand/${direction}?embedded=1`}
        tabIndex={-1}
        style={{ width: viewportWidth, transform: `scale(${scale})` }}
      />
    </div>
  );
}
export default function BrandConcepts() {
  const path = location.pathname.replace(/\/$/, "");
  if (path.endsWith("/kernmut")) return <ConceptPage direction="kernmut" />;
  if (path.endsWith("/wirkfaden")) return <ConceptPage direction="wirkfaden" />;
  const mobile =
    new URLSearchParams(location.search).get("viewport") === "mobile";
  return (
    <div className={`brand-review ${mobile ? "bc-review-mobile" : ""}`}>
      <ReviewBar />
      <main className="bc-review-wrap">
        <span className="bc-review-label">
          ZWEI RICHTUNGEN. EINE PRODUKTWAHRHEIT.
        </span>
        <h1>
          Mehr Charakter.
          <br />
          Dein Urteil zuerst.
        </h1>
        <p>
          Beide Entwürfe sind echte Browser-Prototypen auf Basis desselben
          Produkts. Namen, Logos und Identitäten sind Vorschläge. Die
          akzeptierte Landing und der Arbeitsbereich bleiben unverändert.
        </p>
        <nav className="bc-review-formats" aria-label="Vergleichsformat">
          <a href="/design/brand" aria-current={!mobile ? "page" : undefined}>
            Desktopvergleich ↗
          </a>
          <a
            href="/design/brand?viewport=mobile"
            aria-current={mobile ? "page" : undefined}
          >
            Mobilevergleich ↗
          </a>
        </nav>
        <div className="bc-review-grid">
          {(["kernmut", "wirkfaden"] as const).map((d, i) => (
            <article key={d}>
              <div className="bc-review-card-heading">
                <span>RICHTUNG {i === 0 ? "A" : "B"}</span>
                <h2>
                  {names[d]}
                  <small>
                    {i === 0 ? "Mutiges Editorial" : "Ruhiges Kontext-Atelier"}
                  </small>
                </h2>
                <a href={`/design/brand/${d}`}>Interaktives Konzept öffnen ↗</a>
              </div>
              <MiniBrowser direction={d} mobile={mobile} />
              <div className="bc-review-palette">
                {(i === 0
                  ? ["#342044", "#FFF8EE", "#FC6B45", "#F2D46B"]
                  : ["#162D2C", "#F0F3EC", "#D0EB8D", "#C8BCEE"]
                ).map((c) => (
                  <span key={c}>
                    <i style={{ background: c }} />
                    {c}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <section className="bc-review-recommendation">
          <span>ENTSCHEIDUNG DER INHABERIN</span>
          <h2>
            B ist die visuelle Richtung.
            <br />
            Der Name bleibt offen.
          </h2>
          <p>
            Die grüne Richtung mit Fraunces und Manrope wird weiterentwickelt:
            ruhiger Charakter, ein sichtbares Marketing-Pack und das Wissen des
            Betriebs als Ausgangspunkt. A bleibt als Vergleich archiviert.
            „Wirkfaden“ ist ausschließlich ein Namensvorschlag, ohne rechtliche
            Freigabe oder endgültige Entscheidung. Die akzeptierte #411-Landing
            bleibt bestehen.
          </p>
          <p>
            Dritter Namensvorschlag: <strong>Taktbrief</strong> – die Woche in
            Form bringen. Strategie, Risiken, Token und Domainprüfung stehen im
            Reviewbericht.
          </p>
          <a href="/">Zur akzeptierten #411-Baseline →</a>
        </section>
      </main>
    </div>
  );
}
