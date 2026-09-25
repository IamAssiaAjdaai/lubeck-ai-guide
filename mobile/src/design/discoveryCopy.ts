import type { NativeLocale } from "../lib/api/contracts";

// Keep discovery labels aligned with src/translations/{en,de,ar}.json.
const copy = {
  en: {
    chooseGuidePlace: "Choose a place to ask CITYWALK about.",
    all: "All",
    see: "See",
    eat: "Eat",
    fun: "Fun",
    list: "List",
    map: "Map",
  },
  de: {
    chooseGuidePlace: "Wähle einen Ort, zu dem du CITYWALK fragen möchtest.",
    all: "Alle",
    see: "Sehen",
    eat: "Essen",
    fun: "Spaß",
    list: "Liste",
    map: "Karte",
  },
  ar: {
    chooseGuidePlace: "اختر المكان الذي تريد سؤال CITYWALK عنه.",
    all: "الكل",
    see: "معالم",
    eat: "طعام",
    fun: "ترفيه",
    list: "قائمة",
    map: "خريطة",
  },
};

export function discoveryCopy(locale: NativeLocale) {
  return copy[locale];
}
