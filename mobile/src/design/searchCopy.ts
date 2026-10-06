const copy = {
  en: {
    placeholder: "Search places, cafés, sights…",
    recent: "Recent",
    suggestions: "Suggestions",
    results: "Results",
    clear: "Clear",
    noResults: "No places found. Try another search.",
  },
  de: {
    placeholder: "Orte, Cafés und Sehenswürdigkeiten suchen…",
    recent: "Zuletzt",
    suggestions: "Vorschläge",
    results: "Ergebnisse",
    clear: "Löschen",
    noResults: "Keine Orte gefunden. Versuche eine andere Suche.",
  },
  da: {
    placeholder: "Søg efter steder, caféer og seværdigheder…",
    recent: "Seneste",
    suggestions: "Forslag",
    results: "Resultater",
    clear: "Ryd",
    noResults: "Ingen steder fundet. Prøv en anden søgning.",
  },
  sv: {
    placeholder: "Sök platser, kaféer och sevärdheter…",
    recent: "Senaste",
    suggestions: "Förslag",
    results: "Resultat",
    clear: "Rensa",
    noResults: "Inga platser hittades. Prova en annan sökning.",
  },
  nl: {
    placeholder: "Zoek plaatsen, cafés en bezienswaardigheden…",
    recent: "Recent",
    suggestions: "Suggesties",
    results: "Resultaten",
    clear: "Wissen",
    noResults: "Geen plaatsen gevonden. Probeer een andere zoekopdracht.",
  },
  es: {
    placeholder: "Busca lugares, cafés y sitios de interés…",
    recent: "Recientes",
    suggestions: "Sugerencias",
    results: "Resultados",
    clear: "Borrar",
    noResults: "No se encontraron lugares. Prueba otra búsqueda.",
  },
  ar: {
    placeholder: "ابحث عن أماكن ومقاهٍ ومعالم…",
    recent: "الأخيرة",
    suggestions: "اقتراحات",
    results: "النتائج",
    clear: "مسح",
    noResults: "لم يتم العثور على أماكن. جرّب بحثًا آخر.",
  },
} as const;

export function searchCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}
