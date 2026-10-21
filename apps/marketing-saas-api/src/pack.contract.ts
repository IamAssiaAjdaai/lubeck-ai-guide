import { z } from "zod";
export const channels = ["instagram", "facebook", "linkedin"] as const;
export const goals = [
  "mehr_anfragen",
  "sichtbarkeit",
  "kundenbindung",
] as const;
export const hooks = [
  "Ein klarer Blick auf dein nächstes Projekt.",
  "Was ist dir bei deinem Dienstleister wichtig?",
  "Was brauchst du für deinen nächsten Schritt?",
  "Lass uns über deinen Bedarf sprechen.",
  "Gut informiert entscheiden.",
  "Eine Frage, die sich lohnt: Was brauchst du gerade?",
] as const;
export const callsToAction = [
  "Du möchtest mehr erfahren? Schreib uns eine Nachricht.",
  "Welche Fragen hast du? Melde dich bei uns.",
  "Lass uns über deinen Bedarf sprechen. Nimm Kontakt mit uns auf.",
] as const;
export const actions = [
  "unternehmen_vorstellen",
  "leistung_erklaeren",
  "frage_stellen",
  "einblick_planen",
  "post_veroeffentlichen",
  "antworten_pruefen",
  "woche_auswerten",
] as const;
export const actionText: Record<(typeof actions)[number], string> = {
  unternehmen_vorstellen:
    "Stelle dein Unternehmen mit einer bestätigten Aussage kurz vor.",
  leistung_erklaeren:
    "Erkläre eine bestätigte Leistung und lade zu Fragen ein.",
  frage_stellen:
    "Frage deine Zielgruppe, welche Unterstützung sie gerade braucht.",
  einblick_planen:
    "Wähle ein eigenes, zur Veröffentlichung freigegebenes Foto für einen Einblick in deine Arbeit.",
  post_veroeffentlichen:
    "Prüfe einen Entwurf und veröffentliche ihn bei Bedarf manuell auf deinem Kanal.",
  antworten_pruefen:
    "Lies eingegangene Kommentare und beantworte konkrete Fragen persönlich.",
  woche_auswerten:
    "Notiere Rückmeldungen und entscheide, welches Thema du nächste Woche vertiefen möchtest.",
};
const refs = z.array(z.string().min(1).max(128)).min(1).max(3);
export const packSelectionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  days: z
    .array(
      z.strictObject({
        day: z.number().int().min(1).max(7),
        channel: z.enum(channels),
        action: z.enum(actions),
        time: z.enum(["09:00", "12:00", "18:00"]),
        factIds: refs,
      }),
    )
    .length(7),
  posts: z
    .array(
      z.strictObject({
        channel: z.enum(channels),
        hook: z.enum(hooks),
        factIds: refs,
      }),
    )
    .length(3),
  hooks: z.array(z.enum(hooks)).length(3),
  cta: z.enum(callsToAction),
});
export const campaignCommandSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  goal: z.enum(goals),
  audience: z.string().trim().min(3).max(300),
  language: z.literal("de-DE"),
  channels: z.array(z.enum(channels)).min(1).max(3),
  idempotencyKey: z.uuid(),
});
export type CampaignCommand = z.infer<typeof campaignCommandSchema>;
export type PackSelection = z.infer<typeof packSelectionSchema>;
export type AllowedFact = {
  id: string;
  statement: string;
  sourceUrls: string[];
};
export type PackInput = {
  businessName: string;
  goal: CampaignCommand["goal"];
  audience: string;
  channels: CampaignCommand["channels"];
  facts: AllowedFact[];
};
export type Pack = {
  schemaVersion: 1;
  businessName: string;
  goal: string;
  audience: string;
  language: "de-DE";
  days: {
    day: number;
    channel: string;
    task: string;
    time: string;
    factIds: string[];
  }[];
  posts: { channel: string; text: string; factIds: string[] }[];
  hooks: string[];
  cta: string;
  facts: AllowedFact[];
  editorialStatus: "draft" | "human_edited";
};
export const editPackSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  posts: z.array(z.string().trim().min(1).max(3000)).length(3),
  hooks: z.array(z.string().trim().min(1).max(300)).length(3),
  cta: z.string().trim().min(1).max(500),
});
export function assemblePack(raw: unknown, input: PackInput): Pack {
  const selected = packSelectionSchema.parse(raw);
  const facts = new Map(input.facts.map((f) => [f.id, f]));
  if (
    new Set(selected.days.map((d) => d.day)).size !== 7 ||
    new Set(selected.hooks).size !== 3
  )
    throw new Error("INVALID_PACK_STRUCTURE");
  for (const item of [...selected.days, ...selected.posts]) {
    if (
      !input.channels.includes(item.channel) ||
      item.factIds.some((id) => !facts.has(id)) ||
      new Set(item.factIds).size !== item.factIds.length
    )
      throw new Error("UNAPPROVED_PACK_REFERENCE");
  }
  return {
    schemaVersion: 1,
    businessName: input.businessName,
    goal: input.goal,
    audience: input.audience,
    language: "de-DE",
    days: selected.days
      .sort((a, b) => a.day - b.day)
      .map((d) => ({ ...d, task: actionText[d.action] })),
    posts: selected.posts.map((p) => ({
      channel: p.channel,
      factIds: p.factIds,
      text: [
        p.hook,
        ...p.factIds.map((id) => facts.get(id)!.statement),
        selected.cta,
      ].join("\n\n"),
    })),
    hooks: selected.hooks,
    cta: selected.cta,
    facts: input.facts,
    editorialStatus: "draft",
  };
}
export function packMarkdown(
  pack: Pack,
  provider: string,
  model: string,
  version: number,
) {
  return [
    `# Marketing-Pack: ${pack.businessName}`,
    `Version ${version} · ${provider}/${model} · ${pack.editorialStatus === "human_edited" ? "Manuell bearbeitet" : "Entwurf zur Prüfung"}`,
    provider === "demo"
      ? "DEMO — deterministische lokale Vorlage, keine echte KI-Generierung."
      : "KI-gestützter Entwurf. Keine Veröffentlichung erfolgt.",
    `Ziel: ${pack.goal} · Zielgruppe (deine Vorgabe): ${pack.audience}`,
    "## 7-Tage-Plan (Europe/Berlin; Vorschläge, nicht terminiert)",
    ...pack.days.map(
      (d) =>
        `${d.day}. ${d.channel} · ${d.time}: ${d.task} [${d.factIds.join(", ")}]`,
    ),
    "## Drei Social-Media-Entwürfe",
    ...pack.posts.map(
      (p, i) =>
        `### Beitrag ${i + 1} (${p.channel})\n${p.text}\nFaktenreferenzen der Ursprungsversion: ${p.factIds.join(", ")}`,
    ),
    "## Alternative Einstiege",
    ...pack.hooks.map((h) => `- ${h}`),
    "## Handlungsaufforderung",
    pack.cta,
    "## Bestätigte Fakten der Generierungsgrundlage",
    ...pack.facts.map(
      (f) =>
        `- [${f.id}] ${f.statement}${f.sourceUrls.length ? " — " + f.sourceUrls.join(", ") : " (eigene Angabe, ausdrücklich bestätigt)"}`,
    ),
    "Unbestätigte Vorschläge und unbekannte Angaben wurden nicht zur Generierung verwendet. Manuelle Änderungen werden nicht automatisch auf Fakten geprüft. Vor Veröffentlichung prüfen.",
  ].join("\n\n");
}
