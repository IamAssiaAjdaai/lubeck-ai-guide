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

function official(label: string, url: string): PlaceSource {
  return { label, url, type: "official", verifiedAt: VERIFIED_AT };
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
      "Lübeck tourism — Holsten Gate",
      "https://www.visit-luebeck.com/old-town/holsten-gate",
    ),
  ],
  marienkirche: [
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
      "Lübeck tourism — Holy Spirit Hospital",
      "https://www.visit-luebeck.com/old-town/poi/holy-spirit-hospital",
    ),
  ],
  rathaus: [
    official(
      "Lübeck tourism — Lübeck City Hall",
      "https://www.visit-luebeck.com/old-town/poi/luebeck-city-hall",
    ),
  ],
  "willy-brandt-haus": [
    official(
      "Federal Chancellor Willy Brandt Foundation — Lübeck exhibition",
      "https://willy-brandt.de/ausstellungen/ausstellungen/haus-luebeck/",
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
    official("Buddenbrookhaus", "https://buddenbrookhaus.de/"),
  ],
  "cafe-niederegger": [
    official(
      "Niederegger — Café Niederegger",
      "https://www.niederegger.de/cafe-niederegger/",
    ),
  ],
  schiffergesellschaft: [
    official("Schiffergesellschaft", "https://schiffergesellschaft.de/"),
  ],
  fangfrisch: [
    official("Fangfrisch", "https://fangfrisch-luebeck.de/das-sind-wir/"),
  ],
  "restaurant-vai": [
    official("Restaurant VAI — Contact", "https://restaurant-vai.de/kontakt-2/"),
  ],
  "brauberger-zu-luebeck": [
    official("Brauberger zu Lübeck", "https://www.brauberger.de/"),
  ],
  "zaubertheater-luebeck": [
    official("Zaubertheater Lübeck", "https://zaubertheater-luebeck.de/"),
    map("OpenStreetMap-derived place record", "https://mapcarta.com/N5361074487"),
  ],
  "kolk-17": [
    official("KOLK 17 — Visit us", "https://kolk17.de/en/visit-us"),
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
