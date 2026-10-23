import type { AllowedFact } from "./pack.contract";
// Conservative admission aid, not a semantic truth detector. Approval of the sources
// and an explicit human theme check are both necessary; IDs/count alone never admit.
export const themeRules = [
    { id: "service", title: "Deine Leistung", question: "Welche konkrete Leistung bietest du an?", pattern: /reinig|repar|berat|gestalt|wartung|unterricht|schulung|schnitt|pflege|montage|bieten|service/iu },
    { id: "process", title: "So beginnt die Zusammenarbeit", question: "Wie läuft eine Anfrage oder der erste Schritt tatsächlich ab?", pattern: /anfrage|kontakt|erstgespräch|erstgespraech|ablauf|besprech|terminvereinbarung/iu },
    { id: "preparation", title: "Gut vorbereitet", question: "Welche Angaben oder Unterlagen sollen Interessierte vorbereiten?", pattern: /vorbereit|unterlagen|mitbringen|benötigen|benoetigen|bereithalten|\bbereit\b/iu },
    { id: "scope", title: "Für wen und wo", question: "Für welche Kundengruppe oder welches Einsatzgebiet gilt dein Angebot?", pattern: /zielgruppe|richten uns|einsatzgebiet|arbeiten für|arbeiten fuer|betreuen|regional|ausschließlich in/iu },
] as const;
const signature = (s: string) => s.normalize("NFKC").toLocaleLowerCase("de-DE").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function assessThemes(facts: AllowedFact[]) {
    const normalized = [...new Map(facts.map(f => [signature(f.statement), f])).values()];
    const blocked = normalized.some(f => /ignorier|system.?prompt|garantier|heilung|heilen|rendite|risikofrei|zertifiz|\b(?:iso|din)\b|\b\d+[.,]?\d*\s*(?:€|euro|%)/iu.test(f.statement));
    const regulated = normalized.some(f => /medizin|arzt|ärzt|therap|gesundheit|steuerberat|rechtsberat|finanz|versicherung|anlageberat/iu.test(f.statement));
    const priority = [themeRules[2], themeRules[1], themeRules[3], themeRules[0]];
    const category = (statement: string) => priority.find(r => r.pattern.test(statement))?.id;
    const used = new Set<string>();
    const themes = themeRules.flatMap(rule => {
        const f = normalized.find(f => !used.has(f.id) && category(f.statement) === rule.id);
        if (!f)
            return [];
        used.add(f.id);
        return [{ id: rule.id, title: rule.title, factIds: [f.id], statement: f.statement }];
    }).slice(0, 3);
    const questions = themeRules.filter(rule => !themes.some(t => t.id === rule.id)).map(r => r.question).slice(0, 2);
    return { ready: !blocked && !regulated && themes.length === 3, themes,
        reason: regulated ? "specialist_required" : blocked ? "source_review_required" : themes.length === 3 ? "ready" : "missing_themes",
        questions: regulated ? ["Für diesen Fachbereich ist eine gesonderte fachliche Prüfung nötig. Die Erstellung bleibt gesperrt."] : blocked ? ["Bitte mögliche Versprechen, sensible Aussagen oder Anweisungen in deinen Fakten klären und korrigieren."] : questions,
        limitation: "Konservative Wortregeln und deine Quellenprüfung ersetzen keine semantische oder fachliche Prüfung.",
    };
}
export type Sufficiency = ReturnType<typeof assessThemes>;
