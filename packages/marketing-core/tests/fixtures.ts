import type { RawBusinessBriefInput } from "../src/index";

// Synthetic design-partner brief, not certified live business/place evidence.
export const citywalkBrief: RawBusinessBriefInput = {
  rawText: "CITYWALK helps visitors discover cities through self-guided walks. Start with Lübeck; communicate clearly in German, English and French. Avoid unsupported historical claims.",
  identity: {
    name: "CITYWALK",
    summary: "A city guide for independent travelers taking self-guided walks.",
    businessType: "Digital travel product",
    website: "https://getcitywalk.com",
  },
  offerings: [{ id: "walks", name: "Self-guided walks", description: "City discovery on a traveler's phone." }],
  targetAudiences: [{ id: "visitors", description: "Independent visitors who want to explore on foot." }],
  marketingGoals: [{ id: "activation", description: "Help visitors start their first walk.", cta: "Build your walk" }],
  tone: { voice: ["clear", "welcoming"], avoid: ["hype"], forbiddenClaims: ["Do not invent historical facts."] },
  markets: [{ id: "germany", name: "Germany", countryCode: "DE" }],
  languages: ["de", "en", "fr"],
  provenance: [{ id: "product-brief", kind: "document", label: "Owner-supplied product brief" }],
  facts: [
    { id: "product", statement: "CITYWALK offers self-guided city walks.", provenanceIds: ["product-brief"], basis: "source_backed" },
    { id: "design-partner", statement: "CITYWALK is the internal design partner for the marketing product." },
  ],
  hypotheses: [{ id: "weekend", statement: "Weekend visitors may be a useful audience.", rationale: "Needs audience research." }],
  missingInformation: [{ id: "budget", field: "other", question: "What is the launch marketing budget?" }],
};

// Unrelated, fictional German SME; deliberately no city/traveler identifiers.
export const germanSmeBrief: RawBusinessBriefInput = {
  rawText: "Nordlicht Metallbau GmbH fertigt Metallteile für regionale Gewerbekunden. Ziel: qualifizierte Angebotsanfragen statt Reichweite ohne Nachfrage.",
  identity: {
    name: "Nordlicht Metallbau GmbH",
    summary: "Individuelle Metallfertigung für gewerbliche Auftraggeber.",
    businessType: "Handwerk und Fertigung",
    website: "https://nordlicht-metallbau.example",
  },
  offerings: [{ id: "custom-parts", name: "Metallteile nach Maß", description: "Fertigung nach kundenseitiger Zeichnung." }],
  targetAudiences: [{ id: "purchasers", description: "Technische Einkäufer regionaler Gewerbebetriebe." }],
  marketingGoals: [{ id: "quotes", description: "Mehr qualifizierte Angebotsanfragen.", cta: "Zeichnung für ein Angebot senden" }],
  tone: { voice: ["sachlich", "zuverlässig"], avoid: ["Superlative"], forbiddenClaims: ["Keine unbelegten Zertifizierungen behaupten."] },
  markets: [{ id: "b2b-de", name: "Deutscher B2B-Markt", countryCode: "DE" }],
  languages: ["de-DE", "en-GB"],
  provenance: [{ id: "owner-brief", kind: "manual", label: "Geschäftsführer-Briefing" }],
  facts: [{ id: "made-to-order", statement: "Metallteile werden nach kundenseitiger Zeichnung gefertigt.", provenanceIds: ["owner-brief"] }],
  hypotheses: [{ id: "lead-time", statement: "Transparente Lieferzeiten könnten die Anfragequote verbessern." }],
  missingInformation: [{ id: "capacity", field: "offerings", question: "Welche monatliche Fertigungskapazität ist bestätigt?" }],
};
