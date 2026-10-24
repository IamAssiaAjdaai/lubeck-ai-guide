/** Authored fictional examples. Never a provider response or real tenant record. */
export const demoContext = Object.freeze({
  businessName: 'Glanz Büroservice',
  city: 'Düsseldorf',
  channel: 'linkedin',
  provenance: 'Frei erfunden; vom Owner nur für diese Demo bestätigt. Keine realen Unternehmensdaten.',
});
export const demoFacts = [
  { id: 'demo01-f1', statement: 'Büroreinigung für Unternehmen in Düsseldorf.' },
  { id: 'demo01-f2', statement: 'Regelmäßige Unterhaltsreinigung für Büroräume.' },
  { id: 'demo01-f3', statement: 'Möglichkeit, ein persönliches Erstgespräch anzufragen.' },
] as const;
export const curatedPosts = [
  {
    theme: 'service', label: 'Die Leistung', title: 'Büroreinigung erklären',
    hook: 'Du suchst Büroreinigung für dein Unternehmen in Düsseldorf?',
    claim: 'Glanz Büroservice bietet Büroreinigung für Unternehmen in Düsseldorf an.',
    editorial: 'Wenn du eine Anfrage vorbereitest, beschreibe die Büroräume und notiere deine Fragen zur Reinigung.',
    cta: 'Frag nach Büroreinigung für dein Unternehmen.', factId: 'demo01-f1',
  },
  {
    theme: 'regular', label: 'Regelmäßige Reinigung', title: 'Den Rhythmus ansprechen',
    hook: 'Wie regelmäßig brauchst du eine Reinigung deiner Büroräume?',
    claim: 'Glanz Büroservice bietet regelmäßige Unterhaltsreinigung für Büroräume an.',
    editorial: 'Welche Räume sind betroffen? Welchen Rhythmus wünschst du dir? Notiere diese Angaben für deine Anfrage.',
    cta: 'Sprich deinen Bedarf an regelmäßiger Unterhaltsreinigung an.', factId: 'demo01-f2',
  },
  {
    theme: 'conversation', label: 'Das Erstgespräch', title: 'Persönlich ins Gespräch kommen',
    hook: 'Du möchtest erst einmal persönlich sprechen?',
    claim: 'Bei Glanz Büroservice kannst du ein persönliches Erstgespräch anfragen.',
    editorial: 'Notiere vorab, worum es dir geht und welche Fragen du klären möchtest. So beginnt deine Anfrage mit deinen eigenen Themen.',
    cta: 'Frag ein persönliches Erstgespräch an.', factId: 'demo01-f3',
  },
] as const;
export const demoPlan = [
  { task: 'Beitrag 1 lesen und prüfen, ob er die Büroreinigung treffend erklärt.', factId: 'demo01-f1' },
  { task: 'Eine häufige Frage zur Büroreinigung notieren. Fehlende Antworten nicht erfinden.', factId: 'demo01-f1' },
  { task: 'Beitrag 2 zur regelmäßigen Unterhaltsreinigung überarbeiten.', factId: 'demo01-f2' },
  { task: 'Optional ein eigenes freigegebenes Foto auswählen. Text allein ist auch möglich.', factId: 'demo01-f1' },
  { task: 'Beitrag 3 zum Erstgespräch prüfen und die Einladung anpassen.', factId: 'demo01-f3' },
  { task: 'Geprüfte Texte manuell herunterladen und bei Bedarf selbst veröffentlichen.', factId: 'demo01-f1' },
  { task: 'Rückmeldungen lesen, falls vorhanden; ein Thema für die nächste Woche notieren.', factId: 'demo01-f2' },
] as const;
