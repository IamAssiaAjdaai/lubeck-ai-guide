import { z } from "zod";
import {
  createBrandContext,
  confirmBrandFacts,
  getApprovedBrandFacts,
} from "@marketing/core";
import { channels, goals, type PackInput } from "../src/pack.contract";
export const scenarioSchema = z.strictObject({
  version: z.literal(1),
  id: z.string().regex(/^s\d{2}$/),
  businessName: z.string(),
  city: z.string(),
  goal: z.enum(goals),
  audience: z.string(),
  channel: z.enum(channels),
  risk: z.enum(["ordinary", "tax", "medical"]),
  facts: z
    .array(
      z.strictObject({
        id: z.string(),
        statement: z.string(),
        angle: z.string(),
        benefit: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(4),
  excluded: z.array(
    z.strictObject({
      id: z.string(),
      statement: z.string(),
      disposition: z.enum(["rejected", "unknown"]),
    }),
  ),
  audienceTerms: z.array(z.string()),
  forbiddenTerms: z.array(z.string()),
});
export type Scenario = z.infer<typeof scenarioSchema>;
const definitions = [
  {
    id: "s01",
    businessName: "Fiktiv Rheinbüro Service",
    city: "Düsseldorf",
    goal: "mehr_anfragen",
    audience: "Büroleitungen kleiner Unternehmen in Düsseldorf",
    channel: "linkedin",
    risk: "ordinary",
    facts: [
      {
        id: "s01-service",
        statement: "Wir reinigen Büros in Düsseldorf.",
        angle: "leistung",
      },
      {
        id: "s01-scope",
        statement:
          "Unser Angebot umfasst die Reinigung von Besprechungsräumen.",
        angle: "umfang",
      },
    ],
    excluded: [
      {
        id: "s01-award",
        statement: "Wir sind Deutschlands meistprämierter Reinigungsbetrieb.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Büroleitungen", "Unternehmen"],
    forbiddenTerms: ["meistprämiert", "seit 30 Jahren", "19 Euro"],
  },
  {
    id: "s02",
    businessName: "Fiktiv Strombogen Elektro",
    city: "Köln",
    goal: "mehr_anfragen",
    audience:
      "Private Hauseigentümer in Köln mit Fragen zu Elektroinstallationen",
    channel: "instagram",
    risk: "ordinary",
    facts: [
      {
        id: "s02-service",
        statement: "Wir führen Elektroinstallationen in Köln aus.",
        angle: "leistung",
      },
      {
        id: "s02-process",
        statement:
          "Wir besprechen den geplanten Installationsumfang vor Beginn mit Hauseigentümern.",
        angle: "ablauf",
        benefit: true,
      },
      {
        id: "s02-scope",
        statement: "Wir installieren Steckdosen und Beleuchtung in Wohnräumen.",
        angle: "umfang",
      },
    ],
    excluded: [
      {
        id: "s02-emergency",
        statement: "Unser Meister-Notdienst ist rund um die Uhr erreichbar.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Hauseigentümern", "Wohnräumen"],
    forbiddenTerms: ["Meister", "Notdienst", "rund um die Uhr"],
  },
  {
    id: "s03",
    businessName: "Fiktiv Kontur Steuerbüro",
    city: "Hamburg",
    goal: "sichtbarkeit",
    audience:
      "Kleine Unternehmen in Hamburg, die Abläufe einer Steuerberatung kennenlernen möchten",
    channel: "linkedin",
    risk: "tax",
    facts: [
      {
        id: "s03-service",
        statement:
          "Unser Steuerbüro in Hamburg bietet die Vorbereitung von Buchhaltungsunterlagen an.",
        angle: "leistung",
      },
      {
        id: "s03-process",
        statement:
          "Wir besprechen mit Unternehmen, welche Unterlagen für die Zusammenarbeit benötigt werden.",
        angle: "ablauf",
        benefit: true,
      },
    ],
    excluded: [
      {
        id: "s03-guarantee",
        statement:
          "Mit uns zahlt jedes Unternehmen garantiert weniger Steuern.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Unternehmen", "Unterlagen"],
    forbiddenTerms: [
      "garantiert weniger Steuern",
      "Steuern sparen garantiert",
      "rechtssicher garantiert",
    ],
  },
  {
    id: "s04",
    businessName: "Fiktiv Bewegungsraum Praxis",
    city: "München",
    goal: "sichtbarkeit",
    audience: "Menschen in München, die Informationen zum Praxisangebot suchen",
    channel: "instagram",
    risk: "medical",
    facts: [
      {
        id: "s04-service",
        statement: "Unsere Physiotherapiepraxis befindet sich in München.",
        angle: "standort",
      },
      {
        id: "s04-process",
        statement:
          "Informationen zum Ablauf des ersten Praxisbesuchs geben wir auf Anfrage.",
        angle: "ablauf",
        benefit: true,
      },
    ],
    excluded: [
      {
        id: "s04-outcome",
        statement:
          "Unsere Behandlung beseitigt Rückenschmerzen garantiert nach einer Sitzung.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Praxisbesuchs", "Informationen"],
    forbiddenTerms: [
      "beseitigt Rückenschmerzen",
      "garantiert nach einer Sitzung",
      "Heilung",
    ],
  },
  {
    id: "s05",
    businessName: "Fiktiv Netzform IT",
    city: "Berlin",
    goal: "mehr_anfragen",
    audience: "IT-Verantwortliche kleiner B2B-Unternehmen in Berlin",
    channel: "linkedin",
    risk: "ordinary",
    facts: [
      {
        id: "s05-service",
        statement:
          "Wir unterstützen kleine Unternehmen in Berlin bei ihrer IT-Infrastruktur.",
        angle: "leistung",
      },
      {
        id: "s05-inventory",
        statement:
          "Wir dokumentieren vorhandene IT-Geräte für den internen Überblick.",
        angle: "nutzen",
        benefit: true,
      },
      {
        id: "s05-process",
        statement:
          "Wir besprechen geplante Infrastrukturänderungen mit den IT-Verantwortlichen.",
        angle: "ablauf",
        benefit: true,
      },
      {
        id: "s05-scope",
        statement:
          "Unser Angebot umfasst die Einrichtung von Arbeitsplatzrechnern.",
        angle: "umfang",
      },
    ],
    excluded: [
      {
        id: "s05-iso",
        statement:
          "Wir sind ISO-27001-zertifiziert und garantieren 99,99 Prozent Verfügbarkeit.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["IT-Verantwortlichen", "Unternehmen"],
    forbiddenTerms: ["ISO-27001", "99,99", "SLA"],
  },
  {
    id: "s06",
    businessName: "Fiktiv Treppenlicht Service",
    city: "Leipzig",
    goal: "kundenbindung",
    audience: "Bestehende Hausverwaltungs-Kunden in Leipzig",
    channel: "facebook",
    risk: "ordinary",
    facts: [
      {
        id: "s06-service",
        statement: "Wir reinigen Treppenhäuser in Leipzig.",
        angle: "leistung",
      },
      {
        id: "s06-process",
        statement:
          "Bestehende Hausverwaltungs-Kunden können Hinweise zur Reinigung direkt mit uns besprechen.",
        angle: "bestandskunden",
        benefit: true,
      },
      {
        id: "s06-scope",
        statement:
          "Unser Angebot umfasst die Reinigung gemeinschaftlicher Eingangsbereiche.",
        angle: "umfang",
      },
    ],
    excluded: [
      {
        id: "s06-award",
        statement: "Wir sind Testsieger für Gebäudereinigung.",
        disposition: "unknown",
      },
    ],
    audienceTerms: ["Hausverwaltungs-Kunden", "Bestehende"],
    forbiddenTerms: ["Testsieger", "kostenlos"],
  },
  {
    id: "s07",
    businessName: "Fiktiv Speichenzeit Werkstatt",
    city: "Freiburg",
    goal: "mehr_anfragen",
    audience: "Fahrradbesitzer in Freiburg vor der nächsten Fahrradsaison",
    channel: "instagram",
    risk: "ordinary",
    facts: [
      {
        id: "s07-service",
        statement: "Wir reparieren Fahrräder in Freiburg.",
        angle: "leistung",
      },
      {
        id: "s07-check",
        statement: "Wir prüfen Bremsen und Beleuchtung am Fahrrad.",
        angle: "umfang",
      },
      {
        id: "s07-process",
        statement:
          "Den Reparaturumfang stimmen wir vor Arbeitsbeginn mit Fahrradbesitzern ab.",
        angle: "ablauf",
        benefit: true,
      },
    ],
    excluded: [
      {
        id: "s07-sale",
        statement:
          "Diese Woche gibt es 50 Prozent Rabatt und sofort freie Termine.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Fahrradbesitzern", "Bremsen"],
    forbiddenTerms: ["50 Prozent", "sofort freie Termine", "Rabatt"],
  },
  {
    id: "s08",
    businessName: "Fiktiv Wortfenster Sprachschule",
    city: "Nürnberg",
    goal: "mehr_anfragen",
    audience: "Erwachsene in Nürnberg, die Deutschkurse vergleichen",
    channel: "facebook",
    risk: "ordinary",
    facts: [
      {
        id: "s08-service",
        statement:
          "Unsere Sprachschule in Nürnberg bietet Deutschkurse für Erwachsene an.",
        angle: "leistung",
      },
      {
        id: "s08-format",
        statement:
          "Wir erklären Interessierten auf Anfrage die Unterrichtsformen.",
        angle: "ablauf",
        benefit: true,
      },
    ],
    excluded: [
      {
        id: "s08-certificate",
        statement:
          "Alle Teilnehmer erhalten in vier Wochen ein anerkanntes C1-Zertifikat.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Erwachsene", "Unterrichtsformen"],
    forbiddenTerms: ["C1-Zertifikat", "vier Wochen", "100 Prozent"],
  },
  {
    id: "s09",
    businessName: "Fiktiv Holzlinie Schreinerei",
    city: "Bremen",
    goal: "sichtbarkeit",
    audience: "Menschen in Bremen mit Ideen für individuelle Wohnmöbel",
    channel: "instagram",
    risk: "ordinary",
    facts: [
      {
        id: "s09-service",
        statement: "Wir fertigen individuelle Wohnmöbel in Bremen.",
        angle: "leistung",
      },
      {
        id: "s09-process",
        statement:
          "Maße und gewünschte Nutzung besprechen wir vor der Planung mit unseren Kunden.",
        angle: "ablauf",
        benefit: true,
      },
      {
        id: "s09-scope",
        statement: "Zu unserem Angebot gehören Regale und Einbauschränke.",
        angle: "umfang",
      },
    ],
    excluded: [
      {
        id: "s09-certified",
        statement:
          "Wir liefern in sieben Tagen ausschließlich FSC-zertifiziertes Holz.",
        disposition: "rejected",
      },
    ],
    audienceTerms: ["Wohnmöbel", "Nutzung"],
    forbiddenTerms: ["FSC", "sieben Tagen", "Liefergarantie"],
  },
  {
    id: "s10",
    businessName: "Fiktiv Nachbarsgrün Gartenservice",
    city: "Lübeck",
    goal: "sichtbarkeit",
    audience:
      "Gartenbesitzer in Lübecker Nachbarschaften mit saisonalen Gartenaufgaben",
    channel: "facebook",
    risk: "ordinary",
    facts: [
      {
        id: "s10-service",
        statement: "Wir unterstützen bei Gartenarbeiten in Lübeck.",
        angle: "leistung",
      },
    ],
    excluded: [
      {
        id: "s10-certified",
        statement:
          "Wir sind zertifizierte Baumgutachter und entfernen jeden Baum am selben Tag.",
        disposition: "rejected",
      },
      {
        id: "s10-season",
        statement: "Wir bieten im Herbst Laubabholung zu festen Preisen an.",
        disposition: "unknown",
      },
    ],
    audienceTerms: ["Gartenbesitzer", "saisonalen"],
    forbiddenTerms: ["Baumgutachter", "am selben Tag", "festen Preisen"],
  },
];
export const scenarios: Scenario[] = z
  .array(scenarioSchema)
  .length(10)
  .parse(definitions.map((d) => ({ version: 1, ...d })));
export function scenarioContext(s: Scenario) {
  const sourceId = `${s.id}-website`;
  const initial = createBrandContext(
    {
      rawText: "Vollständig synthetischer Offline-QA-Unternehmensbrief.",
      identity: { name: s.businessName, website: `https://${s.id}.example` },
      provenance: [
        {
          id: sourceId,
          kind: "website",
          label: "Fiktive Website",
          locator: `https://${s.id}.example/leistungen`,
          observedAt: "2026-10-22T00:00:00Z",
        },
      ],
      facts: [...s.facts, ...s.excluded].map((f) => ({
        id: f.id,
        statement: f.statement,
        basis: "source_backed",
        provenanceIds: [sourceId],
      })),
      tone: {
        voice: ["klar", "sachlich"],
        avoid: [],
        forbiddenClaims: s.forbiddenTerms,
      },
    },
    {
      contextId: `${s.id}-context`,
      projectId: s.id,
      createdAt: "2026-10-22T00:00:00Z",
      briefSourceId: `${s.id}-brief`,
    },
  );
  return confirmBrandFacts(
    initial,
    { expectedRevision: 1, factIds: s.facts.map((f) => f.id) },
    { actorId: "offline-human", confirmedAt: "2026-10-22T00:01:00Z" },
  );
}
export function scenarioInput(s: Scenario): PackInput {
  const approved = getApprovedBrandFacts(scenarioContext(s));
  return {
    businessName: s.businessName,
    goal: s.goal,
    audience: s.audience,
    channels: [s.channel],
    facts: approved.map((f) => ({
      id: f.id,
      statement: f.statement,
      sourceUrls: f.provenance.flatMap((p) => (p.locator ? [p.locator] : [])),
    })),
  };
}
