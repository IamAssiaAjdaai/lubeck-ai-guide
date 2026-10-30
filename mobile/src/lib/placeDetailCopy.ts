import type { NativeLocale } from "./api/contracts";

type DetailCopy = { overview: string; noPhoto: string; city: string; free: string; paid: string; mixed: string };
export const placeDetailCopy: Record<NativeLocale, DetailCopy> = {
  en: { overview: "Overview", noPhoto: "Place photo unavailable", city: "City hub", free: "Free admission", paid: "Paid admission", mixed: "Some areas require a ticket" },
  de: { overview: "Überblick", noPhoto: "Kein verifiziertes Foto verfügbar", city: "Stadtübersicht", free: "Eintritt frei", paid: "Eintritt kostenpflichtig", mixed: "Einige Bereiche sind kostenpflichtig" },
  da: { overview: "Overblik", noPhoto: "Billede ikke tilgængeligt", city: "Byoversigt", free: "Gratis adgang", paid: "Betalt adgang", mixed: "Nogle områder kræver billet" },
  sv: { overview: "Översikt", noPhoto: "Bild saknas", city: "Stadsöversikt", free: "Fri entré", paid: "Entréavgift", mixed: "Vissa områden kräver biljett" },
  nl: { overview: "Overzicht", noPhoto: "Foto niet beschikbaar", city: "Stadsoverzicht", free: "Gratis toegang", paid: "Betaalde toegang", mixed: "Voor sommige delen is een kaartje nodig" },
  es: { overview: "Resumen", noPhoto: "Foto no disponible", city: "Vista de la ciudad", free: "Entrada gratuita", paid: "Entrada de pago", mixed: "Algunas zonas requieren entrada" },
  ar: { overview: "نظرة عامة", noPhoto: "الصورة غير متوفرة", city: "استكشف المدينة", free: "دخول مجاني", paid: "دخول مدفوع", mixed: "بعض المناطق تتطلب تذكرة" },
};
