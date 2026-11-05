import type { NativeLocale } from "./api/contracts";
export const interestOnboardingCopy: Record<NativeLocale, { title: string; help: string; skip: string }> = {
  en: { title: "What interests you most?", help: "Choose as many as you like, or skip this step.", skip: "Skip for now" },
  de: { title: "Was interessiert dich am meisten?", help: "Wähle, was dir gefällt, oder überspringe diesen Schritt.", skip: "Vorerst überspringen" },
  es: { title: "¿Qué te interesa más?", help: "Elige lo que te guste o salta este paso.", skip: "Omitir por ahora" },
  nl: { title: "Wat interesseert je het meest?", help: "Kies wat je leuk vindt of sla deze stap over.", skip: "Voor nu overslaan" },
  da: { title: "Hvad interesserer dig mest?", help: "Vælg det, du kan lide, eller spring dette trin over.", skip: "Spring over nu" },
  sv: { title: "Vad intresserar dig mest?", help: "Välj det du gillar eller hoppa över det här steget.", skip: "Hoppa över nu" },
  ar: { title: "ما الذي يهمك أكثر؟", help: "اختر ما تحبه أو تخط هذه الخطوة.", skip: "تخط الآن" },
};
