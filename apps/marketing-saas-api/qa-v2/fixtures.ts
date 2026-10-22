/** Human-authored synthetic candidates. NOT model responses or measured AI quality. */
import { scenarios, scenarioContext, type Scenario } from "../qa/scenarios";
import { snapshot, type Draft } from "./engine";
const authored: Record<
  string,
  { openings: string[]; frames: string[]; topics: string[]; tasks: string[] }
> = {
  s01: {
    openings: [
      "Wenn das Büro zum Thema wird.",
      "Der Besprechungsraum gehört dazu.",
      "Welche Räume stehen bei euch im Fokus?",
    ],
    frames: [
      "Welche Bereiche möchtet ihr für eine Anfrage festhalten?",
      "Auch der Raum für eure Gespräche darf Teil der Anfrage sein. Was möchtet ihr dazu wissen?",
    ],
    topics: ["Büroreinigung", "Besprechungsräume"],
    tasks: [
      "Notiere, welche Fragen Büroleitungen zur Büroreinigung stellen könnten.",
      "Lege den bestätigten Umfang für Besprechungsräume neben den Entwurf.",
      "Wähle ein eigenes freigegebenes Foto eines leeren Besprechungsraums.",
      "Prüfe, ob die beiden Texte unterschiedliche Fragen von Büroleitungen aufgreifen.",
      "Entscheide nach Faktenprüfung manuell, ob du den Büro-Beitrag auf LinkedIn teilen möchtest.",
      "Sammle eingegangene Anfragen und notiere die angesprochenen Räume.",
      "Vergleiche die Raumfragen aus Anfragen und wähle das nächste Erklärungsthema.",
    ],
  },
  s02: {
    openings: [
      "Eine Idee für dein Zuhause?",
      "Erst den Umfang besprechen.",
      "Licht oder Steckdose: Was planst du?",
    ],
    frames: [
      "Was steht auf deiner Liste für das Zuhause? Beschreibe dein Vorhaben in deiner Anfrage.",
      "Welche Räume und Wünsche möchtest du vorab ansprechen? Nimm deine Notizen mit ins Gespräch.",
      "Wo möchtest du ansetzen? Eine Beschreibung des Raums ist ein guter Gesprächseinstieg.",
    ],
    topics: [
      "Elektroinstallation",
      "Abstimmung vor Beginn",
      "Steckdosen und Licht",
    ],
    tasks: [
      "Sammle typische Fragen von Hauseigentümern zur Elektroinstallation.",
      "Markiere im Entwurf die Aussage zur Abstimmung vor Beginn.",
      "Wähle ein eigenes freigegebenes Foto von Beleuchtung ohne Personen.",
      "Prüfe den Licht-Beitrag auf unbelegte Sicherheits- oder Verfügbarkeitsaussagen.",
      "Teile den freigegebenen Installations-Beitrag bei Bedarf manuell auf Instagram.",
      "Ordne eingegangene Anfragen nach Raum und gewünschter Installation.",
      "Notiere, welche Angaben Hauseigentümer für das Vorgespräch ergänzen möchten.",
    ],
  },
  s03: {
    openings: [
      "Buchhaltungsunterlagen: Wo beginnt das Gespräch?",
      "Zusammenarbeit beginnt mit Fragen.",
      "Was möchtest du über den Ablauf wissen?",
    ],
    frames: [
      "Welche Fragen möchtest du zur Vorbereitung stellen? Sammle sie für ein persönliches Gespräch.",
      "Welche Unterlagen sind für dein Unternehmen relevant? Frage nach dem Ablauf, statt Annahmen zu treffen.",
    ],
    topics: ["Unterlagen vorbereiten", "Zusammenarbeit verstehen"],
    tasks: [
      "Sammle Fragen kleiner Unternehmen zur Vorbereitung von Buchhaltungsunterlagen.",
      "Ordne dem Ablauf-Beitrag die bestätigte Unterlagen-Aussage zu.",
      "Wähle eine eigene freigegebene Grafik ohne Mandantendaten.",
      "Lass beide Entwürfe fachlich auf unbelegte steuerliche Vorteile prüfen.",
      "Entscheide erst nach Fachfreigabe manuell über den Informationsbeitrag auf LinkedIn.",
      "Notiere, welche Ablauf-Fragen in Kommentaren auftauchen; beantworte Einzelfälle persönlich.",
      "Vergleiche die Rückfragen und wähle das nächste reine Informationsthema.",
    ],
  },
  s04: {
    openings: [
      "Die Praxis kennenlernen.",
      "Vor dem ersten Besuch.",
      "Welche Frage möchtest du mitbringen?",
    ],
    frames: [
      "Du möchtest dir vorab ein Bild machen? Welche Informationen fehlen dir für deinen Besuch?",
      "Was möchtest du zum Ablauf wissen? Notiere deine Frage und frage persönlich nach.",
    ],
    topics: ["Praxisort", "Erster Besuch"],
    tasks: [
      "Sammle organisatorische Fragen zum ersten Praxisbesuch ohne Gesundheitsdaten.",
      "Vergleiche den Ablauf-Entwurf mit der bestätigten Auskunft auf Anfrage.",
      "Wähle ein eigenes freigegebenes Praxisfoto ohne Patienten.",
      "Lass die Texte fachlich auf Wirkversprechen und individuelle Gesundheitstipps prüfen.",
      "Entscheide nach Fachfreigabe manuell über den Praxis-Beitrag auf Instagram.",
      "Sammle nur allgemeine organisatorische Rückfragen; verweise persönliche Anliegen ins direkte Gespräch.",
      "Wähle anhand der Rückfragen ein weiteres organisatorisches Informationsthema.",
    ],
  },
  s05: {
    openings: [
      "IT im kleinen Unternehmen: Wo setzt ihr an?",
      "Was gehört zu eurer Geräteübersicht?",
      "Änderungen an der Infrastruktur besprechen.",
    ],
    frames: [
      "Welches Infrastrukturthema steht bei euch an? Beschreibt den Ausgangspunkt für ein Gespräch.",
      "Welche Geräte möchtet ihr im internen Überblick erfassen? Bringt eure Fragen dazu mit.",
      "Was möchten eure IT-Verantwortlichen vorab klären? Legt die offenen Punkte für das Gespräch zusammen.",
    ],
    topics: ["Infrastrukturbedarf", "Geräteüberblick", "Änderungen abstimmen"],
    tasks: [
      "Sammle Infrastrukturfragen kleiner B2B-Unternehmen für LinkedIn.",
      "Ordne dem Geräte-Beitrag die bestätigte Dokumentationsleistung zu.",
      "Erstelle eine freigegebene Skizze ohne reale Gerätedaten oder Zugangsdaten.",
      "Gleiche die Abstimmungs-Aussage mit der bestätigten Beschreibung des Gesprächs ab.",
      "Teile einen geprüften Entwurf bei Bedarf manuell mit IT-Verantwortlichen auf LinkedIn.",
      "Notiere eingegangene Anfragen getrennt nach Bestandsaufnahme und geplanter Änderung.",
      "Vergleiche die Themen der Anfragen und wähle die nächste fachliche Erklärung.",
    ],
  },
  s06: {
    openings: [
      "Was beschäftigt euch im Treppenhaus?",
      "Ein Hinweis aus eurem Objekt?",
      "Auch der Eingang ist ein Thema.",
    ],
    frames: [
      "Welcher Punkt aus eurem Objekt soll im Gespräch nicht fehlen?",
      "Ihr betreut das Objekt und habt eine Rückfrage? Haltet den konkreten Hinweis für das Gespräch fest.",
      "Welche Frage habt ihr zum gemeinschaftlichen Eingangsbereich? Gebt sie gern weiter.",
    ],
    topics: [
      "Treppenhaus",
      "Bestandskunden im Gespräch",
      "Gemeinsamer Eingang",
    ],
    tasks: [
      "Sammle allgemeine Rückfragen bestehender Hausverwaltungs-Kunden zur Treppenhausreinigung.",
      "Ordne dem Dialog-Beitrag den bestätigten direkten Gesprächsweg zu.",
      "Wähle ein eigenes freigegebenes Eingangsbild ohne Namen oder Klingelschilder.",
      "Prüfe die Texte auf einen wertschätzenden Ton für bestehende Kunden.",
      "Teile den geprüften Dialog-Beitrag bei Bedarf manuell auf Facebook.",
      "Bündele eingegangene Hinweise objektbezogen im persönlichen Gespräch.",
      "Notiere wiederkehrende Rückfragen und plane dazu die nächste Kundeninformation.",
    ],
  },
  s07: {
    openings: [
      "Was steht an deinem Fahrrad an?",
      "Bremsen und Licht im Blick.",
      "Vor der Reparatur miteinander sprechen.",
    ],
    frames: [
      "Welche Beobachtung möchtest du der Werkstatt beschreiben? Notiere sie für deine Anfrage.",
      "Was möchtest du zu Bremsen oder Beleuchtung fragen? Beschreibe dein Anliegen, statt eine Diagnose zu vermuten.",
      "Welche Arbeiten möchtest du vorab ansprechen? Halte deine Fragen für die Abstimmung fest.",
    ],
    topics: ["Reparaturanfrage", "Prüfung am Rad", "Umfang abstimmen"],
    tasks: [
      "Sammle Fragen von Fahrradbesitzern zu Reparaturen vor der Saison.",
      "Markiere im Prüf-Beitrag die bestätigte Aussage zu Bremsen und Beleuchtung.",
      "Wähle ein eigenes freigegebenes Fahrradfoto ohne Kundendaten.",
      "Prüfe alle Texte auf unbelegte Termin- oder Sicherheitsversprechen.",
      "Teile den geprüften Reparatur-Beitrag bei Bedarf manuell auf Instagram.",
      "Ordne Rückfragen nach Reparaturthema und gewünschter Abstimmung.",
      "Wähle anhand der Anfragen das nächste Werkstatt-Erklärungsthema.",
    ],
  },
  s08: {
    openings: [
      "Deutsch lernen als Erwachsener?",
      "Welche Unterrichtsform passt zu deinen Fragen?",
      "Was möchtest du vor einer Anfrage wissen?",
    ],
    frames: [
      "Was möchtest du über einen Kurs wissen? Sammle deine Fragen, bevor du verschiedene Angebote vergleichst.",
      "Du vergleichst Kurse? Frage nach der Unterrichtsform und halte fest, was du noch klären möchtest.",
    ],
    topics: ["Kursangebot", "Unterrichtsformen klären"],
    tasks: [
      "Sammle Fragen Erwachsener zum Vergleich von Deutschkursen.",
      "Ordne dem Format-Beitrag die bestätigte Erklärung auf Anfrage zu.",
      "Wähle eine eigene freigegebene Kursgrafik ohne Teilnehmerdaten.",
      "Prüfe die Texte auf unbelegte Abschluss-, Niveau- oder Zeitversprechen.",
      "Teile den geprüften Kurs-Beitrag bei Bedarf manuell auf Facebook.",
      "Ordne Anfragen nach Fragen zu Angebot und Unterrichtsformen.",
      "Notiere offene Formatfragen und wähle das nächste Kursthema.",
    ],
  },
  s09: {
    openings: [
      "Eine Möbelidee für deinen Wohnraum?",
      "Maße und Nutzung zuerst besprechen.",
      "Ein Regal oder ein Einbauschrank?",
    ],
    frames: [
      "Welche Idee möchtest du für deinen Wohnraum mitbringen? Sammle deine Gedanken für das Gespräch.",
      "Wie möchtest du dein Möbel nutzen? Halte deine Wünsche und vorhandene Maße für die Planung fest.",
      "Was möchtest du unterbringen? Beschreibe den Platz und deine Fragen für ein Gespräch.",
    ],
    topics: [
      "Individuelle Möbelidee",
      "Planungsgespräch",
      "Regal und Einbauschrank",
    ],
    tasks: [
      "Sammle Fragen zu individuellen Wohnmöbeln in Bremen.",
      "Ordne dem Planungs-Beitrag die bestätigte Abstimmung zu Maßen und Nutzung zu.",
      "Wähle ein eigenes freigegebenes Möbelbild ohne unbelegte Materialkennzeichnung.",
      "Gleiche jeden Satz im Möbel-Entwurf mit den bestätigten Fakten ab.",
      "Teile den geprüften Möbel-Beitrag bei Bedarf manuell auf Instagram.",
      "Sammle allgemeine Rückfragen zu Möbelideen ohne fremde Wohnungsfotos zu veröffentlichen.",
      "Vergleiche die Rückfragen und wähle das nächste Planungsthema.",
    ],
  },
  s10: {
    openings: [
      "Was beschäftigt dich im Garten?",
      "Eine Frage für dein Gartengespräch.",
      "Welche Gartenaufgabe möchtest du klären?",
    ],
    frames: [
      "Welche Gartenaufgabe möchtest du ansprechen? Frage zunächst nach, ob sie zum Angebot gehört.",
    ],
    topics: ["Angebot zunächst klären"],
    tasks: [
      "Notiere, dass bislang nur allgemeine Gartenunterstützung in Lübeck bestätigt ist.",
      "Frage den Betrieb, welche konkreten Gartenarbeiten zum Angebot gehören.",
      "Bitte um eine bestätigte Beschreibung des Ablaufs einer Anfrage.",
      "Ergänze keine saisonalen Leistungen oder Konditionen ohne Bestätigung.",
      "Prüfe den einzelnen Entwurf und entscheide erst danach über manuelles Teilen auf Facebook.",
      "Sammle Rückfragen von Gartenbesitzern als offene Fragen, nicht als Leistungszusagen.",
      "Ergänze bestätigte Fakten und plane erst dann weitere eigenständige Beiträge.",
    ],
  },
};
export function sourceFor(s: Scenario) {
  return snapshot(scenarioContext(s), {
    tenantId: "synthetic-tenant",
    risk: s.risk,
    goal: s.goal,
    audience: s.audience,
    channel: s.channel,
  });
}
export function authoredDraft(s: Scenario): Draft {
  const source = sourceFor(s),
    copy = authored[s.id];
  const facts = source.facts.slice(0, Math.min(3, source.facts.length));
  return {
    schemaVersion: 2,
    origin: "authored-offline-mock",
    snapshotHash: source.hash,
    claims: facts.map((f, i) => ({
      id: `claim-${i}`,
      text: f.statement,
      factIds: [f.id],
      snapshotHash: source.hash,
    })),
    posts: facts.map((_, i) => ({
      angle: copy.topics[i],
      channel: s.channel,
      segments: [
        { kind: "editorial", text: copy.openings[i] },
        { kind: "claim", claimId: `claim-${i}` },
        { kind: "editorial", text: copy.frames[i] },
      ],
    })),
    hooks: copy.openings,
    cta:
      s.goal === "mehr_anfragen"
        ? "Beschreibe dein Anliegen in einer persönlichen Nachricht. Welche Frage möchtest du zuerst klären?"
        : s.goal === "kundenbindung"
          ? "Welchen Hinweis aus eurem Objekt möchtet ihr besprechen? Meldet euch mit eurer Rückfrage."
          : "Welche Frage möchtest du zum Angebot stellen? Teile sie im persönlichen Gespräch.",
    days: copy.tasks.map((task, i) => ({
      day: i + 1,
      channel: s.channel,
      task,
      factIds: [facts[i % facts.length].id],
    })),
    missingInformation:
      facts.length < 3
        ? [
            "Welche weitere eigenständige Leistung oder welcher konkrete Ablauf kann bestätigt werden?",
            "Welchen nachvollziehbaren Nutzen dürfen wir anhand einer bestätigten Aussage beschreiben?",
          ]
        : [],
  };
}
export const fixtureCases = scenarios;
