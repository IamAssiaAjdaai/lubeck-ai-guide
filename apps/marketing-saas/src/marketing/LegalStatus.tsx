import BrandIdentity from "../brand/BrandIdentity";
export function LegalStatus() {
  return (
    <div className="marketing-page">
      <header className="m-container legal-header">
        <BrandIdentity />
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
            "Vertragsbedingungen, Pilotumfang und Preisgestaltung sind nicht freigegeben. Es gibt keinen Online-Vertragsschluss.",
          ],
        ].map(([id, title, p]) => (
          <section id={id} key={id}>
            <h2>{title}</h2>
            <p>{p}</p>
            <span className="m-badge">Freigabe ausstehend</span>
          </section>
        ))}
        <a className="m-button primary" href="/#ablauf">
          Fiktive Beispiel-Kampagne ansehen →
        </a>
      </main>
    </div>
  );
}
