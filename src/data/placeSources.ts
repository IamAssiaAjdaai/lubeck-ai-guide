import type { LubeckPlaceSlug } from "@/data/places";

export const PLACE_SOURCE_TYPES = ["official", "map", "reference"] as const;

export type PlaceSourceType = (typeof PLACE_SOURCE_TYPES)[number];

export type PlaceSource = Readonly<{
  label: string;
  url: string;
  type: PlaceSourceType;
  verifiedAt: string;
}>;

export type PlaceSourceRegistry = Readonly<
  Record<string, readonly PlaceSource[]>
>;

const VERIFIED_AT = "2026-09-03";

function official(
  label: string,
  url: string,
  verifiedAt = VERIFIED_AT,
  ): PlaceSource {
  return {
    label,
    url,
    type: "official",
    verifiedAt,
  };
}

function map(label: string, url: string): PlaceSource {
  return { label, url, type: "map", verifiedAt: VERIFIED_AT };
}

export const lubeckPlaceSources = {
  "lubecker-altstadt": [
    official(
      "Lübeck tourism — Old Town",
      "https://www.visit-luebeck.com/old-town",
    ),
    official(
      "UNESCO World Heritage Centre",
      "https://whc.unesco.org/en/list/272",
    ),
  ],
  holstentor: [
    official(
      "Museum Holstentor — The Holstentor",
      "https://museum-holstentor.de/about-holstentor",
      "2026-09-04",
    ),
    official(
      "Lübeck tourism — Holsten Gate",
      "https://www.visit-luebeck.com/old-town/holsten-gate",
    ),
  ],
  marienkirche: [
    official(
      "St. Marien Lübeck — History of St Marien",
      "https://www.st-marien-luebeck.de/en/discover/history/history-of-st-marien",
      "2026-09-04",
    ),
    official(
      "City of Lübeck — St. Marien",
      "https://www.luebeck.de/de/stadtleben/tourismus/luebeck/sehenswuerdigkeiten/kirchen/st-marien",
    ),
  ],
  "europaeisches-hansemuseum": [
    official(
      "European Hansemuseum — Visit",
      "https://www.hansemuseum.eu/en/visit/",
    ),
    map("OpenStreetMap-derived place record", "https://mapcarta.com/N3551554186"),
  ],
  "st-petri-zu-luebeck": [
    official(
      "St. Petri Lübeck — Contact and visitor notice",
      "https://st-petri-luebeck.de/en/contact",
    ),
  ],
  "luebecker-dom": [
    official(
      "Lübeck tourism — Lübeck Cathedral",
      "https://www.visit-luebeck.com/old-town/poi/luebeck-cathedral-1",
    ),
  ],
  "heiligen-geist-hospital": [
    official(
      "City of Lübeck — Heiligen-Geist-Hospital",
      "https://www.luebeck.de/de/rathaus/verwaltung/stiftungsverwaltung/heiligen-geist-hospital",
      "2026-09-04",
    ),
    official(
      "Lübeck tourism — Holy Spirit Hospital",
      "https://www.visit-luebeck.com/old-town/poi/holy-spirit-hospital",
      "2026-09-04",
    ),
  ],
  rathaus: [
    official(
      "City of Lübeck — Lübeck Rathaus",
      "https://www.luebeck.de/de/stadtleben/tourismus/luebeck/sehenswuerdigkeiten/rathaus/rathaus",
      "2026-09-04",
    ),
    official(
      "Lübeck tourism — Lübeck City Hall",
      "https://www.visit-luebeck.com/old-town/poi/luebeck-city-hall",
      "2026-09-04",
    ),
  ],
  "willy-brandt-haus": [
    official(
      "Federal Chancellor Willy Brandt Foundation — Lübeck exhibition",
      "https://willy-brandt.de/ausstellungen/ausstellungen/haus-luebeck/",
      "2026-09-04",
    ),
    map("OpenStreetMap-derived place record", "https://mapcarta.com/W153789584"),
  ],
  "an-der-obertrave": [
    official(
      "Lübeck tourism — Obertrave",
      "https://www.visit-luebeck.com/old-town/poi/obertrave-enms34eg",
    ),
  ],
  salzspeicher: [
    official(
      "City of Lübeck — Salzspeicher",
      "https://www2.luebeck.de/de/stadtleben/tourismus/luebeck/sehenswuerdigkeiten/historische-gebaeude/die-salzspeicher.html",
    ),
    map(
      "OpenStreetMap-derived place record",
      "https://mapcarta.com/de/W28831875",

    ),
  ],
  buddenbrookhaus: [
    official(
      "Buddenbrookhaus — Das Haus",
      "https://buddenbrookhaus.de/das-haus",
      "2026-09-04",
    ),
    official(
      "Buddenbrookhaus",
      "https://buddenbrookhaus.de/",
    ),
  ],
  "cafe-niederegger": [
    official(
      "Niederegger — Café Niederegger",
      "https://www.niederegger.de/cafe-niederegger/",
    ),
  ],
  schiffergesellschaft: [
    official("Schiffergesellschaft", "https://schiffergesellschaft.de/", "2026-09-04"),
  ],
  fangfrisch: [
    official("Fangfrisch", "https://fangfrisch-luebeck.de/das-sind-wir/", "2026-09-04"),
  ],
  "restaurant-vai": [
    official("Restaurant VAI — Contact", "https://restaurant-vai.de/kontakt-2/", "2026-09-04"),
  ],
  "brauberger-zu-luebeck": [
    official("Brauberger zu Lübeck", "https://www.brauberger.de/", "2026-09-04"),
  ],
  "zaubertheater-luebeck": [
    official("Zaubertheater Lübeck", "https://zaubertheater-luebeck.de/", "2026-09-04"),
    map("OpenStreetMap-derived place record", "https://mapcarta.com/N5361074487"),
  ],
  "kolk-17": [
    official("KOLK 17 — Visit us", "https://kolk17.de/en/visit-us", "2026-09-04"),
    map(
      "OpenStreetMap-derived place record",
      "https://mapcarta.com/de/N446219816",
    ),
  ],
  "final-escape-luebeck": [
    official(
      "Final Escape Lübeck",
      "https://www.final-escape.com/luebeck/en/",
    ),
  ],
} as const satisfies Readonly<
  Record<LubeckPlaceSlug, readonly PlaceSource[]>
>;

export function getPlaceSources(slug: string): readonly PlaceSource[] {
  return (lubeckPlaceSources as PlaceSourceRegistry)[slug] ?? [];
}
