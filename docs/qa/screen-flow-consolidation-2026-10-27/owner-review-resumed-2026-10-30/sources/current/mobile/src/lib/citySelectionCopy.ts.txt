import type { NativeLocale } from "./api/contracts";
export const citySelectionCopy: Record<NativeLocale, { title: string; reassurance: string }> = {
  en: { title: "Where would\nyou like to go?", reassurance: "Explore at your own pace. No account needed." },
  de: { title: "Welche Stadt\nmöchtest du entdecken?", reassurance: "Entdecke in deinem Tempo. Ganz ohne Konto." },
  es: { title: "¿Adónde\nte gustaría ir?", reassurance: "Explora a tu ritmo. Sin necesidad de cuenta." },
  nl: { title: "Waar wil\nje naartoe?", reassurance: "Ontdek op jouw tempo. Geen account nodig." },
  da: { title: "Hvor vil\ndu gerne hen?", reassurance: "Udforsk i dit tempo. Ingen konto nødvendig." },
  sv: { title: "Vart vill\ndu åka?", reassurance: "Upptäck i din takt. Inget konto behövs." },
  ar: { title: "إلى أين تريد الذهاب؟", reassurance: "اكتشف على راحتك. لا حاجة إلى حساب." },
};
