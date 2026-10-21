/* eslint-disable @next/next/no-img-element -- Standalone Vite app with optimized local product screenshots. */
import { useState } from "react";
import PackPreview from "./PackPreview";
import SampleCampaign from "./SampleCampaign";
import "./marketing.css";
const links = [
  ["Produkt", "produkt"],
  ["So funktioniert’s", "ablauf"],
  ["Beispiel", "beispiel"],
  ["Preise", "preise"],
  ["FAQ", "faq"],
];
const faq = [
  [
    "Was bekomme ich in einem Marketing-Pack?",
    "Einen Plan für sieben Tage, genau drei deutsche Social-Media-Entwürfe, drei alternative Einstiege und eine Handlungsaufforderung. Du wählst Ziel, Zielgruppe und einen Kanal: LinkedIn, Instagram oder Facebook. Bilder und automatische Veröffentlichung gehören nicht dazu.",
  ],
  [
    "Wird meine Website automatisch abgerufen?",
    "In dieser offenen Beispiel-Tour nicht: Sie verwendet ausschließlich feste, synthetische Daten. Im lokalen Arbeitsbereich startet ein Website-Import erst nach deiner Eingabe. Dort werden öffentliche HTTPS-Seiten mit technischen Abrufgrenzen gelesen; alternativ kannst du einen Kurzbrief manuell eintragen.",
  ],
  [
    "Was bedeutet „Fakten bestätigen“?",
    "Website-Aussagen sind zuerst ungeprüfte Vorschläge. Du prüfst die Aussagen und ihre Quellen und bestätigst ausdrücklich, welche verwendet werden dürfen. Nur bestätigte Fakten gehen in das Pack ein. Eine Bestätigung garantiert weder die Wahrheit einer Quelle noch die Eignung zur Veröffentlichung.",
  ],
  [
    "Veröffentlicht das Tool auf meinen Social-Media-Kanälen?",
    "Nein. Es verbindet keine Social-Media-Konten und veröffentlicht nichts automatisch. Du prüfst die gespeicherte Version, kopierst die Inhalte oder lädst Markdown herunter und veröffentlichst anschließend selbst.",
  ],
  [
    "Verbrauchen Änderungen oder Exporte mein Kontingent?",
    "Manuelles Bearbeiten, Speichern und Exportieren verbrauchen keine Generierungsversuche. Im Arbeitsbereich wird jede gespeicherte Bearbeitung als neue Version erhalten. Alte Versionen bleiben lesbar.",
  ],
  [
    "Wie funktionieren die monatlichen Grenzen?",
    "Die aktuelle Preishypothese sieht vier Versuche im Starter- und zwölf im Growth-Plan vor. Auch fehlgeschlagene Generierungen können einen Versuch belegen, wenn Kosten noch unklar sind. Weitere Kosten- und Sicherheitsgrenzen können neue Versuche stoppen. Das verfügbare Kontingent siehst du im Arbeitsbereich.",
  ],
  [
    "Ist die Beispiel-Kampagne mit KI erzeugt?",
    "Die offene Tour lädt eine feste Vorlage über denselben Pack-Assembler und Markdown-Export wie der lokale MVP. Sie ruft kein KI-Modell auf und verbraucht keine Tokens. Auch die gezeigten Screenshots stammen aus dem lokalen Demo-Modus. Qualität und Kosten echter KI-Generierungen müssen vor einem Pilotbetrieb noch geprüft werden.",
  ],
  [
    "Für welche Unternehmen ist das gedacht?",
    "Für kleine deutsche Dienstleistungsunternehmen ohne eigenes Marketingteam: zum Beispiel Handwerksbetriebe, lokale Services und B2B-Fachbetriebe. Du bringst dein Fachwissen ein; das Pack unterstützt dich bei Struktur und Textentwürfen. Es verspricht keine Reichweite und keine neuen Aufträge.",
  ],
  [
    "Kann ich das Produkt schon buchen oder testen?",
    "Aktuell nicht öffentlich. Diese lokale Vorschau ist kein freigegebener Test oder buchbares Angebot. Die Pilot-Konditionen sind in Prüfung; es gibt weder Checkout noch aktive Testphase. Bestehende lokale Testkonten können den Arbeitsbereich nutzen.",
  ],
  [
    "Sind Preise und Datenschutz bereits freigegeben?",
    "Nein. 79 € und 149 € pro Monat zuzüglich Umsatzsteuer sind unvalidierte Preishypothesen. Betreiberangaben, Datenschutzinformationen, Verträge, Hosting, E-Mail-Versand, Aufbewahrung und weitere Betriebsanforderungen müssen vor einer externen Freigabe geprüft werden. Wir behaupten keine bestätigte DSGVO-Konformität oder Hosting in Deutschland.",
  ],
];
function Brand() {
  return (
    <a className="m-brand" href="/" aria-label="Marketing Workspace Startseite">
      <span aria-hidden="true">✦</span>
      <span>
        Marketing<span className="brand-light"> Workspace</span>
        <small>PRODUKTNAME IN PRÜFUNG</small>
      </span>
    </a>
  );
}
export default function LandingPage() {
  const [menu, setMenu] = useState(false);
  const [workflow, setWorkflow] = useState(0);
  const workflowItems = [
    [
      "Dein Unternehmen als Ausgangspunkt.",
      "Website oder Kurzbrief: Beginne mit dem, was dein Betrieb wirklich anbietet. Die offene Tour verwendet feste Beispieldaten.",
      "01 · WEBSITE & KURZBRIEF",
      "https://glanz.example",
      "Fiktiver Büroservice · Düsseldorf",
    ],
    [
      "Gute Inhalte brauchen deine Bestätigung.",
      "Prüfe vorgeschlagene Aussagen und ihre Quellen. Du entscheidest ausdrücklich, welche Fakten in deine Kampagne einfließen.",
      "02 · FAKTEN PRÜFEN",
      "Wir reinigen Büros in Düsseldorf.",
      "Vorschlag → von dir bestätigt",
    ],
    [
      "Aus einem Ziel wird deine Woche.",
      "Mehr Anfragen, mehr Sichtbarkeit oder Kundenbindung: Wähle dein Ziel und erhalte einen Plan mit drei deutschen Post-Entwürfen.",
      "03 · ZIEL & MARKETING-PACK",
      "7 Tage · 3 Posts · 3 Hooks · 1 CTA",
      "Ein Plan mit konkreten nächsten Schritten",
    ],
    [
      "Der letzte Schritt bleibt bei dir.",
      "Passe Texte an, speichere eine neue Version und prüfe den Inhalt vor dem Export. Veröffentlicht wird anschließend von dir.",
      "04 · BEARBEITEN & EXPORTIEREN",
      "Entwurf → Version 2 → Markdown",
      "Deine Änderungen bleiben nachvollziehbar",
    ],
  ];
  const current = workflowItems[workflow];
  return (
    <div className="marketing-page">
      <a className="m-skip" href="#inhalt">
        Zum Inhalt springen
      </a>
      <div className="m-release">
        Lokale Produktvorschau <span>·</span> Mit fiktiven Daten entdecken.
        Öffentlicher Start noch nicht freigegeben.
      </div>
      <header className="m-header">
        <div className="m-container m-header-inner">
          <Brand />
          <button
            className="m-menu"
            aria-expanded={menu}
            aria-controls="marketing-nav"
            onClick={() => setMenu(!menu)}
          >
            {menu ? "Schließen ×" : "Menü ☰"}
          </button>
          <nav
            id="marketing-nav"
            className={menu ? "is-open" : ""}
            aria-label="Hauptnavigation"
          >
            {links.map(([title, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
                {title}
              </a>
            ))}
            <a className="m-login" href="/auth">
              Anmelden <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </header>
      <main id="inhalt">
        <section className="m-hero m-container">
          <div className="hero-copy">
            <span className="m-kicker">
              <i /> FÜR KLEINE UNTERNEHMEN MIT VIEL VOR
            </span>
            <h1>
              Deine Website.
              <br />
              Dein nächster <em>Marketingplan.</em>
            </h1>
            <p className="m-lead">
              Dein Betrieb verdient gute Inhalte. Auch ohne Marketingteam. Plane
              sieben Tage, bearbeite drei deutsche Social-Posts und zeig, was
              dein Unternehmen ausmacht.
            </p>
            <div className="m-actions">
              <a className="m-button primary" href="#beispiel">
                Beispiel-Kampagne ansehen <span>→</span>
              </a>
              <a className="m-text-link" href="#ablauf">
                So funktioniert’s <span>↗</span>
              </a>
            </div>
            <p className="m-caption">
              Ohne Anmeldung · Fiktives Beispiel · Keine KI-Kosten
            </p>
            <div className="hero-principles">
              <span>✓ Von dir bestätigte Fakten</span>
              <span>✓ Du veröffentlichst selbst</span>
            </div>
          </div>
          <div className="hero-product">
            <div className="hero-annotation">
              Nicht nur ein Text. Dein nächster Schritt. <span>↙</span>
            </div>
            <PackPreview />
            <p className="m-caption">
              Echte interaktive Produktoberfläche · feste Beispieldaten · keine
              Kundenreferenz
            </p>
          </div>
        </section>
        <section
          className="m-deliverables"
          aria-label="In jedem Marketing-Pack"
        >
          <div className="m-container">
            {[
              ["07", "Tage mit Richtung"],
              ["03", "editierbare Social-Posts"],
              ["03", "passende Hooks"],
              ["01", "klare Handlungsaufforderung"],
            ].map(([n, t]) => (
              <div key={t}>
                <strong>{n}</strong>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </section>
        <section id="produkt" className="m-section m-container">
          <div className="m-section-heading">
            <span className="m-kicker">
              WENIGER LEERE SEITEN. MEHR RICHTUNG.
            </span>
            <h2>
              Das Tagesgeschäft wartet nicht.
              <br />
              Dein Marketing braucht trotzdem einen Plan.
            </h2>
            <p>
              Du kennst deinen Betrieb. Das Pack hilft dir, daraus eine
              überschaubare Woche mit brauchbaren Inhalten zu machen.
            </p>
          </div>
          <div className="m-grid-three">
            {[
              [
                "01",
                "Statt „Was poste ich?“",
                "Ein konkreter Wochenplan",
                "Sieben Tage mit Aufgaben, die zusammen auf dein gewähltes Kampagnenziel einzahlen.",
              ],
              [
                "02",
                "Statt austauschbarer Aussagen",
                "Dein Betrieb als Grundlage",
                "Bestätigte Fakten bilden die Basis. Ungeprüfte Website-Vorschläge bleiben außen vor.",
              ],
              [
                "03",
                "Statt Copy & Paste ohne Überblick",
                "Ein Entwurf, den du übernimmst",
                "Drei Posts zum Bearbeiten. Mit Hooks, CTA und gespeicherten Versionen im Arbeitsbereich.",
              ],
            ].map(([n, k, t, p]) => (
              <article className="m-benefit" key={n}>
                <span className="m-number">{n}</span>
                <small>{k}</small>
                <h3>{t}</h3>
                <p>{p}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="ablauf" className="m-section m-soft">
          <div className="m-container">
            <div className="m-section-heading">
              <span className="m-kicker">VOM BETRIEB ZUR KAMPAGNE</span>
              <h2>Vier Schritte. Du bleibst am Steuer.</h2>
              <p>
                Ein nachvollziehbarer Ablauf – vom ersten Vorschlag bis zu
                deinem geprüften Export.
              </p>
            </div>
            <div
              className="workflow-tabs"
              role="tablist"
              aria-label="So funktioniert das Produkt"
            >
              {[
                "Unternehmen verstehen",
                "Fakten bestätigen",
                "Kampagne planen",
                "Prüfen & exportieren",
              ].map((title, i) => (
                <button
                  key={title}
                  id={`workflow-tab-${i}`}
                  role="tab"
                  aria-selected={workflow === i}
                  aria-controls="workflow-panel"
                  tabIndex={workflow === i ? 0 : -1}
                  onClick={() => setWorkflow(i)}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                    ) {
                      e.preventDefault();
                      const next =
                        e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? 3
                            : (workflow + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                      setWorkflow(next);
                      document.getElementById(`workflow-tab-${next}`)?.focus();
                    }
                  }}
                >
                  <span>0{i + 1}</span>
                  {title}
                </button>
              ))}
            </div>
            <div
              className="workflow-panel"
              id="workflow-panel"
              role="tabpanel"
              aria-labelledby={`workflow-tab-${workflow}`}
            >
              <div>
                <h3>{current[0]}</h3>
                <p>{current[1]}</p>
                <a className="m-text-link" href="#beispiel">
                  Selbst im Beispiel durchgehen →
                </a>
              </div>
              <div className="workflow-state">
                <span className="m-kicker">{current[2]}</span>
                <strong>{current[3]}</strong>
                <p>{current[4]}</p>
                <span className="m-badge">Fiktive Beispieldaten</span>
              </div>
            </div>
          </div>
        </section>
        <section id="beispiel" className="m-section m-container">
          <div className="m-section-heading">
            <span className="m-kicker">AUSPROBIEREN STATT NUR LESEN</span>
            <h2>
              Eine echte Tour.
              <br />
              Ein bewusst fiktiver Betrieb.
            </h2>
            <p>
              Begleite „Glanz Büroservice“ vom Website-Vorschlag bis zum Export.
              Bestätige Fakten, wähle ein Ziel und bearbeite dein Beispiel-Pack
              direkt hier.
            </p>
          </div>
          <SampleCampaign />
        </section>
        <section className="m-section m-soft">
          <div className="m-container">
            <div className="m-feature">
              <div>
                <span className="m-kicker">01 / FAKTEN MIT HERKUNFT</span>
                <h2>
                  Dein Wissen macht
                  <br />
                  den Unterschied.
                </h2>
                <p>
                  Eine Website kann veraltet sein. Deshalb siehst du
                  vorgeschlagene Aussagen mit Quellenhinweisen und bestätigst
                  sie selbst. Änderungen erfordern eine neue Prüfung.
                </p>
                <ul className="m-checklist">
                  <li>Ungeprüfte Vorschläge klar gekennzeichnet</li>
                  <li>Bestätigung vor der Pack-Erstellung</li>
                  <li>Faktenreferenzen im fertigen Pack</li>
                </ul>
                <a className="m-text-link" href="#beispiel">
                  Faktenprüfung ausprobieren →
                </a>
              </div>
              <figure>
                <a href="/product/facts.webp" target="_blank" rel="noreferrer">
                  <img
                    src="/product/facts.webp"
                    loading="lazy"
                    width="1000"
                    height="694"
                    alt="Lokaler Arbeitsbereich: vorgeschlagene Fakten des fiktiven Büroservices mit Checkboxen und Quellen zur menschlichen Bestätigung"
                  />
                </a>
                <figcaption>
                  Echter lokaler MVP · synthetische Daten · zum Vergrößern
                  öffnen
                </figcaption>
              </figure>
            </div>
            <div className="m-feature reverse">
              <div>
                <span className="m-kicker">02 / DEIN PACK, DEINE WORTE</span>
                <h2>
                  Ein Plan, der in deinem
                  <br />
                  Arbeitsalltag ankommt.
                </h2>
                <p>
                  Sieben Tage geben dir Struktur. Drei deutsche Post-Entwürfe
                  geben dir einen Anfang. Passe Posts, Hooks und CTA an – und
                  speichere deine Änderungen als eigene Version.
                </p>
                <ul className="m-checklist">
                  <li>Aktuelle und frühere Versionen ansehen</li>
                  <li>
                    Geprüfte Inhalte kopieren oder als Markdown exportieren
                  </li>
                  <li>Nutzung und verbleibende Versuche im Blick</li>
                </ul>
                <a className="m-text-link" href="#beispiel">
                  Beispiel bearbeiten & exportieren →
                </a>
              </div>
              <figure>
                <a href="/product/editor.webp" target="_blank" rel="noreferrer">
                  <img
                    src="/product/editor.webp"
                    loading="lazy"
                    width="1000"
                    height="694"
                    alt="Echter Post-Editor mit drei deutschen Entwürfen aus dem lokalen Demo-Modus, speicherbaren Versionen und manuellem Export"
                  />
                </a>
                <figcaption>
                  Echter lokaler MVP · feste Demo-Vorlage · keine echte
                  KI-Generierung
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
        <section className="m-section m-container">
          <div className="m-section-heading">
            <span className="m-kicker">FÜR BETRIEBE, DIE SELBST ANPACKEN</span>
            <h2>
              Deine Leistung ist da.
              <br />
              Mach ein Thema daraus.
            </h2>
            <p>
              Mögliche Einsatzideen, keine Kundenberichte oder
              Erfolgsversprechen.
            </p>
          </div>
          <div className="m-grid-three">
            {[
              [
                "↗",
                "Handwerk",
                "Eine Leistung verständlich erklären.",
                "Aus einer bestätigten Leistungsbeschreibung wird ein Post, der eine konkrete Frage deiner Kundschaft aufgreift.",
              ],
              [
                "⌂",
                "Lokale Dienstleistungen",
                "Zeigen, wie Zusammenarbeit beginnt.",
                "Nutze dein tatsächliches Angebot als Anlass, mit Menschen aus deiner Region ins Gespräch zu kommen.",
              ],
              [
                "▤",
                "B2B-Fachbetriebe",
                "Wissen in Gespräche übersetzen.",
                "Plane Inhalte für Entscheider, erkläre dein Angebot und lade zu einer konkreten Rückfrage ein.",
              ],
            ].map(([icon, t, h, p]) => (
              <article className="m-usecase" key={t}>
                <span aria-hidden="true">{icon}</span>
                <small>{t}</small>
                <h3>{h}</h3>
                <p>{p}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="preise" className="m-section m-soft">
          <div className="m-container">
            <div className="m-section-heading">
              <span className="m-kicker">TRANSPARENTE PREISHYPOTHESE</span>
              <h2>
                Ein überschaubarer Rahmen.
                <br />
                Noch kein buchbares Angebot.
              </h2>
              <p>
                Diese Preise sind unvalidierte Hypothesen. Pilot-Konditionen und
                Leistungsumfang sind in Prüfung.
              </p>
            </div>
            <div className="m-pricing">
              {[
                ["Starter", "79", "4", "Für einen fokussierten Einstieg."],
                ["Growth", "149", "12", "Für mehrere Kampagnenideen im Monat."],
              ].map(([name, price, attempts, description]) => (
                <article className="m-price-card" key={name}>
                  <span className="m-badge">Pilot-Konditionen in Prüfung</span>
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <div className="m-price">
                    {price} €<span>/ Monat</span>
                  </div>
                  <p className="m-caption">
                    Zuzüglich gesetzlicher Umsatzsteuer
                  </p>
                  <ul className="m-checklist">
                    <li>
                      <strong>{attempts} Generierungsversuche pro Monat</strong>
                    </li>
                    <li>Je Pack: 7 Tage, 3 Posts, 3 Hooks und CTA</li>
                    <li>Manuell bearbeiten und Versionen speichern</li>
                    <li>Markdown-Export und Inhalte kopieren</li>
                    <li>Keine automatische Veröffentlichung</li>
                  </ul>
                  <a className="m-button secondary" href="#pilot-status">
                    Pilot-Status ansehen →
                  </a>
                </article>
              ))}
            </div>
            <p className="pricing-note">
              Ein neuer Generierungsversuch zählt zum Kontingent; auch
              fehlgeschlagene Versuche können zählen. Manuelles Bearbeiten und
              Export sind kontingentfrei. Weitere Budgetgrenzen können neue
              Versuche begrenzen. Kein Checkout, kein aktives Abo, keine
              freigegebene Testphase.
            </p>
          </div>
        </section>
        <section className="m-section m-container">
          <div className="m-trust">
            <div>
              <span className="m-kicker">MIT MENSCHLICHEM URTEIL</span>
              <h2>
                Die KI entwirft.
                <br />
                Du entscheidest.
              </h2>
              <p>
                Gute Texte brauchen Kontext. Und jemanden, der den eigenen
                Betrieb kennt. Du prüfst die Fakten vor der Erstellung und den
                fertigen Inhalt vor dem Export.
              </p>
            </div>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>Nur bestätigte Aussagen als Grundlage</h3>
                  <p>
                    Quellenhinweise helfen beim Prüfen. Sie ersetzen deine
                    Einschätzung nicht.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Änderungen bleiben sichtbar</h3>
                  <p>
                    Manuell bearbeitete Inhalte sind nicht automatisch
                    faktengeprüft. Gespeicherte Versionen halten den Verlauf
                    fest.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Veröffentlichen bleibt Handarbeit</h3>
                  <p>
                    Keine verbundenen Social-Konten, keine automatischen Posts.
                    Die letzte Prüfung liegt bei dir.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>
        <section id="faq" className="m-section m-soft">
          <div className="m-container m-faq">
            <div>
              <span className="m-kicker">NOCH FRAGEN?</span>
              <h2>
                Gut zu wissen,
                <br />
                bevor du loslegst.
              </h2>
              <p>
                Was das Produkt heute kann.
                <br />
                Und was noch geprüft wird.
              </p>
            </div>
            <div>
              {faq.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section id="pilot-status" className="m-section m-container">
          <div className="m-final">
            <span className="m-kicker">DEIN NÄCHSTER SCHRITT</span>
            <h2>
              Sieh, was aus einer
              <br />
              Woche werden kann.
            </h2>
            <p>
              Entdecke die Beispiel-Kampagne. Ohne Konto, ohne echte Firmendaten
              und ohne KI-Kosten.
            </p>
            <a className="m-button primary" href="#beispiel">
              Beispiel-Kampagne ansehen →
            </a>
            <div className="pilot-status">
              <strong>Pilot-Zugang: noch nicht freigegeben</strong>
              <p>
                Die Kontaktaufnahme ist hier deaktiviert. Wir sammeln keine
                Interessenten-Daten, solange rechtliche und operative Freigaben
                ausstehen.
              </p>
              <button className="m-button secondary" disabled>
                Pilot-Anfragen derzeit geschlossen
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="m-footer">
        <div className="m-container">
          <div className="footer-top">
            <div>
              <Brand />
              <p>
                Dein Unternehmen. Deine Fakten.
                <br />
                Dein nächster Marketingplan.
              </p>
              <small>
                Arbeitsname · lokale Vorschau · kein öffentliches Angebot
              </small>
            </div>
            <nav aria-label="Produkt im Footer">
              <strong>Entdecken</strong>
              {links.map(([title, id]) => (
                <a key={id} href={`#${id}`}>
                  {title}
                </a>
              ))}
            </nav>
            <nav aria-label="Zugang und rechtliche Hinweise">
              <strong>Zugang & Hinweise</strong>
              <a href="/auth">Anmelden · lokale Testkonten</a>
              <a href="#pilot-status">Pilot-Status</a>
              <a href="/rechtliches#impressum">
                Impressum · Freigabe ausstehend
              </a>
              <a href="/rechtliches#datenschutz">
                Datenschutz · Freigabe ausstehend
              </a>
              <a href="/rechtliches#bedingungen">
                Bedingungen · Freigabe ausstehend
              </a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Marketing Workspace · Produktname in
              Prüfung
            </span>
            <span>
              Synthetische Beispiele. Keine Kunden- oder Leistungsversprechen.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export function LegalStatus() {
  return (
    <div className="marketing-page">
      <header className="m-container legal-header">
        <Brand />
        <a href="/">← Zur Produktvorschau</a>
      </header>
      <main className="m-container m-section legal-page">
        <span className="m-kicker">
          LOKALE VORSCHAU · KEINE RECHTLICHE FREIGABE
        </span>
        <h1>Rechtliche Angaben in Prüfung.</h1>
        <p>
          Diese Seite dokumentiert den Freigabestatus. Sie ist kein
          freigegebenes Impressum, keine Datenschutzerklärung und kein
          Vertragsangebot. Der öffentliche Start und die Erfassung von
          Interessenten-Daten bleiben gesperrt.
        </p>
        {[
          [
            "impressum",
            "Impressum",
            "Betreiberidentität, ladungsfähige Anschrift und erforderliche Kontaktangaben sind noch nicht zur Veröffentlichung freigegeben.",
          ],
          [
            "datenschutz",
            "Datenschutz",
            "Informationen zu Verantwortlichen, Verarbeitungszwecken, Empfängern, Hosting, Rechtsgrundlagen, Aufbewahrung und Betroffenenrechten müssen vor einem externen Betrieb geprüft und freigegeben werden. Die offene Beispiel-Tour sendet keine Formularinhalte an ein Backend, verwendet keine Analytics und speichert ihre Beispielversionen nur im Arbeitsspeicher des Browsers.",
          ],
          [
            "bedingungen",
            "Bedingungen & Preise",
            "Vertragsbedingungen, Pilotumfang und Preisgestaltung sind nicht freigegeben. Die gezeigten Preise sind Hypothesen; es gibt keinen Online-Vertragsschluss.",
          ],
        ].map(([id, title, p]) => (
          <section id={id} key={id}>
            <h2>{title}</h2>
            <p>{p}</p>
            <span className="m-badge">Freigabe ausstehend</span>
          </section>
        ))}
        <a className="m-button primary" href="/#beispiel">
          Fiktive Beispiel-Kampagne ansehen →
        </a>
      </main>
    </div>
  );
}
