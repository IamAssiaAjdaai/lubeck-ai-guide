// Browser-safe deterministic fixture. Uses the same assembler and exporter as the API.
// No credentials, network requests, crawling or provider calls.
import {
  actions,
  assemblePack,
  hooks,
  callsToAction,
  type Pack,
} from "../../../marketing-saas-api/src/pack.contract";
export { packMarkdown } from "../../../marketing-saas-api/src/pack.contract";
export const sampleFacts = [
  {
    id: "demo-1",
    statement: "Wir reinigen Büros in Düsseldorf.",
    sourceUrls: ["https://glanz.example/"],
  },
  {
    id: "demo-2",
    statement: "Wir bieten regelmäßige Unterhaltsreinigung für Unternehmen an.",
    sourceUrls: ["https://glanz.example/leistungen"],
  },
  {
    id: "demo-3",
    statement:
      "Ein persönliches Gespräch ist der erste Schritt zur Zusammenarbeit.",
    sourceUrls: ["https://glanz.example/kontakt"],
  },
];
export function samplePack(
  goal = "mehr_anfragen",
  factIds = sampleFacts.map((f) => f.id),
): Pack {
  const facts = sampleFacts.filter((f) => factIds.includes(f.id));
  if (!facts.length)
    throw new Error("Mindestens einen Beispielfakt bestätigen.");
  return assemblePack(
    {
      schemaVersion: 1,
      days: actions.map((action, i) => ({
        day: i + 1,
        channel: "linkedin",
        action,
        time: "09:00",
        factIds: [facts[i % facts.length].id],
      })),
      posts: facts.length
        ? Array.from({ length: 3 }, (_, i) => ({
            channel: "linkedin",
            hook: hooks[i],
            factIds: [facts[i % facts.length].id],
          }))
        : [],
      hooks: hooks.slice(0, 3),
      cta: callsToAction[0],
    },
    {
      businessName: "Glanz Büroservice · fiktiv",
      goal: goal as "mehr_anfragen" | "sichtbarkeit" | "kundenbindung",
      audience: "Büroleitungen in Düsseldorf",
      channels: ["linkedin"],
      facts,
    },
  );
}
export function downloadText(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "beispiel-marketing-pack.md";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
