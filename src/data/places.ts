import type { LandmarkContent } from "@/data/landmarkTranslations";
import { getLandmarkAudioMap } from "@/data/landmarkAudio";
import { landmarks as legacyLandmarks } from "@/data/landmarks";
import { locales, type Locale } from "@/lib/i18n";

export const PLACE_CATEGORIES = ["see", "eat", "fun"] as const;
export const PLACE_ENVIRONMENTS = ["indoor", "outdoor", "mixed"] as const;
export const PLACE_PRICING = ["free", "paid", "mixed", "unknown"] as const;
export const PLACE_STATUSES = [
  "open",
  "closed",
  "renovation",
  "seasonal",
  "unknown",
] as const;
export const HIDDEN_GEM_TAG = "hidden-gem" as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type PlaceEnvironment = (typeof PLACE_ENVIRONMENTS)[number];
export type PlacePricing = (typeof PLACE_PRICING)[number];
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export type PlaceCoordinates = Readonly<{
  lat: number;
  lng: number;
}>;

export type PlaceFact = Readonly<{
  label: string;
  value: string;
}>;

export type PlaceContent = Readonly<{
  name: string;
  shortDescription: string;
  description?: string;
  story?: string;
  facts?: readonly PlaceFact[];
  visitNote?: string;
}>;

export type Place = Readonly<{
  slug: string;
  city: string;
  category: PlaceCategory;
  image?: string;
  coordinates: PlaceCoordinates;
  durationMinutes: number;
  environment: PlaceEnvironment;
  pricing: PlacePricing;
  status?: PlaceStatus;
  statusVerifiedAt?: string;
  visitNoteVerifiedAt?: string;
  visitNoteValidUntil?: string;
  tags: readonly string[];
  audio?: Readonly<Partial<Record<Locale, string>>>;
  content: Readonly<Partial<Record<Locale, PlaceContent>>>;
}>;

export type LandmarkPlaceContent = PlaceContent &
  Readonly<Required<Pick<PlaceContent, "description" | "story" | "facts">>>;

export type LandmarkPlace = Omit<Place, "image" | "content"> &
  Readonly<{
    image: string;
    content: Readonly<Record<Locale, LandmarkPlaceContent>>;
  }>;

export type ResolvedPlaceContent = Readonly<{
  requestedLocale: Locale;
  actualLocale: Locale;
  didFallback: boolean;
  content: PlaceContent;
}>;

type LubeckLandmarkSlug =
  | "holstentor"
  | "marienkirche"
  | "rathaus"
  | "heiligen-geist-hospital"
  | "buddenbrookhaus";

type PlaceMetadata = Readonly<
  Pick<
    Place,
    | "category"
    | "coordinates"
    | "durationMinutes"
    | "environment"
    | "pricing"
    | "status"
    | "statusVerifiedAt"
    | "visitNoteVerifiedAt"
    | "visitNoteValidUntil"
    | "tags"
  >
>;

// Coordinates come from the corresponding Wikidata/OpenStreetMap records.
// Pricing stays unknown until current, verified visitor information is added.
const lubeckLandmarkMetadata = {
  holstentor: {
    category: "see",
    coordinates: { lat: 53.8662, lng: 10.6797 },
    durationMinutes: 30,
    environment: "mixed",
    pricing: "unknown",
    tags: ["history", "architecture", "brick-gothic", "city-gate"],
  },
  marienkirche: {
    category: "see",
    coordinates: { lat: 53.8678, lng: 10.6851 },
    durationMinutes: 30,
    environment: "indoor",
    pricing: "unknown",
    tags: ["history", "architecture", "brick-gothic", "church"],
  },
  rathaus: {
    category: "see",
    coordinates: { lat: 53.867, lng: 10.6855 },
    durationMinutes: 20,
    environment: "outdoor",
    pricing: "unknown",
    tags: ["history", "architecture", "brick-gothic", "renaissance", "town-hall"],
  },
  "heiligen-geist-hospital": {
    category: "see",
    coordinates: { lat: 53.8714, lng: 10.6899 },
    durationMinutes: 30,
    environment: "indoor",
    pricing: "unknown",
    tags: ["history", "social-history", "medieval", "hospital"],
  },
  buddenbrookhaus: {
    category: "see",
    coordinates: { lat: 53.8683, lng: 10.6858 },
    durationMinutes: 10,
    environment: "indoor",
    pricing: "unknown",
    status: "renovation",
    statusVerifiedAt: "2026-09-03",
    visitNoteVerifiedAt: "2026-09-03",
    tags: ["history", "literature", "museum", "thomas-mann"],
  },
} as const satisfies Record<LubeckLandmarkSlug, PlaceMetadata>;

const landmarkVisitNotes: Partial<
  Record<LubeckLandmarkSlug, Partial<Record<Locale, string>>>
> = {
  buddenbrookhaus: {
    de: "Das Buddenbrookhaus ist derzeit wegen Umbau geschlossen. Angebote und Ausstellungen finden an anderen Orten statt; aktuelle Hinweise stehen auf der offiziellen Website.",
    en: "Buddenbrookhaus is currently closed for renovation. Events and exhibitions continue at other locations; check the official website for current visitor information.",
  },
};

function placeKey(city: string, slug: string): string {
  return `${city}/${slug}`;
}

function toPlaceContent(content: LandmarkContent): LandmarkPlaceContent {
  return {
    name: content.name,
    shortDescription: content.description,
    description: content.description,
    story: content.story,
    facts: content.facts,
  };
}

function toLocalizedContent(
  slug: LubeckLandmarkSlug,
  content: Record<Locale, LandmarkContent>,
): Readonly<Record<Locale, LandmarkPlaceContent>> {
  return Object.fromEntries(
    locales.map((locale) => {
      const visitNote = landmarkVisitNotes[slug]?.[locale];

      return [
        locale,
        {
          ...toPlaceContent(content[locale]),
          ...(visitNote ? { visitNote } : {}),
        },
      ];
    }),
  ) as Record<Locale, LandmarkPlaceContent>;
}

const legacyDurationLabels = Object.fromEntries(
  legacyLandmarks.map((landmark) => [
    placeKey("lubeck", landmark.slug),
    Object.fromEntries(
      locales.map((locale) => [locale, landmark.content[locale].duration]),
    ) as Record<Locale, string>,
  ]),
) as Readonly<Record<string, Readonly<Record<Locale, string>>>>;

export const lubeckLandmarks: readonly LandmarkPlace[] = legacyLandmarks.map(
  (landmark) => {
    const metadata =
      lubeckLandmarkMetadata[landmark.slug as LubeckLandmarkSlug];

    if (!metadata) {
      throw new Error(`Missing Place metadata for lubeck/${landmark.slug}`);
    }

    return {
      slug: landmark.slug,
      city: "lubeck",
      image: landmark.image,
      ...metadata,
      audio: getLandmarkAudioMap(landmark.slug),
      content: toLocalizedContent(
        landmark.slug as LubeckLandmarkSlug,
        landmark.content,
      ),
    };
  },
);

function localizedCardContent(
  de: PlaceContent,
  en: PlaceContent,
): Readonly<Partial<Record<Locale, PlaceContent>>> {
  return { de, en };
}

const residentialHiddenGemVisitNotes = {
  de: "Bitte respektiere die Privatsphäre der Anwohnenden und halte dich beim Besuch leise.",
  en: "Please respect residents' privacy and keep noise low while visiting.",
} as const satisfies Readonly<Record<"de" | "en", string>>;

// Verified against official venue/tourism information and OpenStreetMap-
// derived location records. CW-11 additions were checked on 2026-09-05.
// Missing images are intentional.
const additionalLubeckPlaces = [
  {
    slug: "lubecker-altstadt",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8681, lng: 10.6861 },
    durationMinutes: 120,
    environment: "outdoor",
    pricing: "free",
    tags: ["must-see", "history", "architecture", "unesco", "outdoor", "photo-spot"],
    content: localizedCardContent(
      {
        name: "Lübecker Altstadt",
        shortDescription:
          "Die von Wasser umgebene historische Altstadt gehört seit 1987 zum UNESCO-Welterbe.",
      },
      {
        name: "Lübeck Old Town",
        shortDescription:
          "The historic old town surrounded by water has been a UNESCO World Heritage Site since 1987.",
      },
    ),
  },
  {
    slug: "europaeisches-hansemuseum",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.874, lng: 10.6896 },
    durationMinutes: 90,
    environment: "indoor",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["must-see", "history", "museum", "family", "indoor"],
    content: localizedCardContent(
      {
        name: "Europäisches Hansemuseum",
        shortDescription:
          "Ein modernes Museum zur Geschichte der Hanse mit Zugang zum historischen Burgkloster.",
      },
      {
        name: "European Hansemuseum",
        shortDescription:
          "A modern museum about the Hanseatic League with access to the historic Castle Friary.",
      },
    ),
  },
  {
    slug: "st-petri-zu-luebeck",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8659, lng: 10.6825 },
    durationMinutes: 30,
    environment: "indoor",
    pricing: "mixed",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    visitNoteVerifiedAt: "2026-09-03",
    tags: ["architecture", "church", "culture", "viewpoint", "indoor"],
    content: localizedCardContent(
      {
        name: "St. Petri zu Lübeck",
        shortDescription:
          "Eine Kultur- und Universitätskirche im Zentrum der Altstadt, bekannt für Ausstellungen und Veranstaltungen.",
        visitNote:
          "Der Kirchenraum ist zugänglich; der Turmbesuch ist derzeit nicht möglich. Bitte aktuelle Hinweise auf der offiziellen Website prüfen.",
      },
      {
        name: "St. Petri zu Lübeck",
        shortDescription:
          "A cultural and university church in the old-town centre, known for exhibitions and events.",
        visitNote:
          "The church interior is accessible, but the tower is currently unavailable. Check the official website for current information.",
      },
    ),
  },
  {
    slug: "luebecker-dom",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8609, lng: 10.6858 },
    durationMinutes: 30,
    environment: "indoor",
    pricing: "unknown",
    tags: ["history", "architecture", "church", "indoor"],
    content: localizedCardContent(
      {
        name: "Lübecker Dom",
        shortDescription:
          "Der historische Dom ist eine der großen Backsteinkirchen der Lübecker Altstadt.",
      },
      {
        name: "Lübeck Cathedral",
        shortDescription:
          "The historic cathedral is one of the major brick churches in Lübeck's old town.",
      },
    ),
  },
  {
    slug: "willy-brandt-haus",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8697, lng: 10.6895 },
    durationMinutes: 60,
    environment: "indoor",
    pricing: "free",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    visitNoteVerifiedAt: "2026-09-03",
    visitNoteValidUntil: "2026-12-18",
    tags: ["history", "museum", "politics", "family", "indoor"],
    content: localizedCardContent(
      {
        name: "Willy-Brandt-Haus Lübeck",
        shortDescription:
          "Eine multimediale Ausstellung über Willy Brandts politisches Leben und die deutsche Zeitgeschichte.",
        visitNote:
          "Die aktuelle Ausstellung ist laut Betreiber noch bis 18. Dezember 2026 geöffnet. Vor dem Besuch bitte aktuelle Hinweise prüfen.",
      },
      {
        name: "Willy Brandt House Lübeck",
        shortDescription:
          "A multimedia exhibition about Willy Brandt's political life and modern German history.",
        visitNote:
          "The current exhibition is scheduled to remain open through 18 December 2026. Check current information before visiting.",
      },
    ),
  },
  {
    slug: "an-der-obertrave",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8632, lng: 10.6806 },
    durationMinutes: 30,
    environment: "outdoor",
    pricing: "free",
    tags: ["waterfront", "walk", "outdoor", "photo-spot"],
    content: localizedCardContent(
      {
        name: "An der Obertrave",
        shortDescription:
          "Eine Uferpromenade an der Altstadt mit historischen Fassaden und Blick auf die Trave.",
      },
      {
        name: "An der Obertrave",
        shortDescription:
          "An old-town waterfront promenade with historic façades and views across the River Trave.",
      },
    ),
  },
  {
    slug: "salzspeicher",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8659, lng: 10.6802 },
    durationMinutes: 10,
    environment: "outdoor",
    pricing: "free",
    tags: ["history", "architecture", "photo-spot", "outdoor"],
    content: localizedCardContent(
      {
        name: "Salzspeicher",
        shortDescription:
          "Eine markante Gruppe historischer Lagerhäuser direkt an der Trave neben dem Holstentor.",
      },
      {
        name: "Salt Storehouses",
        shortDescription:
          "A distinctive group of historic storehouses beside the River Trave and the Holsten Gate.",
      },
    ),
  },
  {
    slug: "fuechtingshof",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.869632, lng: 10.6908538 },
    durationMinutes: 15,
    environment: "outdoor",
    pricing: "unknown",
    visitNoteVerifiedAt: "2026-09-05",
    tags: [HIDDEN_GEM_TAG, "history", "architecture", "courtyard", "outdoor"],
    content: localizedCardContent(
      {
        name: "Füchtingshof",
        shortDescription:
          "Ein frühbarocker Stiftungshof Johann Füchtings, der bis heute als Wohnhof genutzt wird.",
        visitNote:
          `Der Hof kann normalerweise von 10–12 Uhr und 15–18 Uhr besichtigt werden, wenn das Tor geöffnet ist. ${residentialHiddenGemVisitNotes.de}`,
      },
      {
        name: "Füchtingshof",
        shortDescription:
          "An early-Baroque charitable courtyard founded through Johann Füchting's legacy and still used as housing.",
        visitNote:
          `The courtyard can normally be viewed from 10am–12pm and 3–6pm when the gate is open. ${residentialHiddenGemVisitNotes.en}`,
      },
    ),
  },
  {
    slug: "dunkelgruener-gang",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8731584, lng: 10.6867884 },
    durationMinutes: 15,
    environment: "outdoor",
    pricing: "unknown",
    visitNoteVerifiedAt: "2026-09-05",
    tags: [HIDDEN_GEM_TAG, "history", "alley", "outdoor"],
    content: localizedCardContent(
      {
        name: "Dunkelgrüner Gang",
        shortDescription:
          "Ein verwinkelter Wohngang zwischen Untertrave und Engelswisch mit kleinen Häusern, Gärten und versteckten Durchgängen.",
        visitNote: residentialHiddenGemVisitNotes.de,
      },
      {
        name: "Dunkelgrüner Gang",
        shortDescription:
          "A winding residential passage between Untertrave and Engelswisch, with small houses, gardens and hidden exits.",
        visitNote: residentialHiddenGemVisitNotes.en,
      },
    ),
  },
  {
    slug: "kalandsgang",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8620556, lng: 10.6809059 },
    durationMinutes: 10,
    environment: "outdoor",
    pricing: "unknown",
    visitNoteVerifiedAt: "2026-09-05",
    tags: [HIDDEN_GEM_TAG, "history", "alley", "outdoor"],
    content: localizedCardContent(
      {
        name: "Kalandsgang",
        shortDescription:
          "Ein historischer Gang an der Hartengrube 52, dessen Name auf die Kaland-Bruderschaft zurückgeht.",
        visitNote: residentialHiddenGemVisitNotes.de,
      },
      {
        name: "Kalandsgang",
        shortDescription:
          "A historic passage at Hartengrube 52 whose name traces back to the Kaland brotherhood.",
        visitNote: residentialHiddenGemVisitNotes.en,
      },
    ),
  },
  {
    slug: "malerwinkel",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8619857, lng: 10.6794443 },
    durationMinutes: 20,
    environment: "outdoor",
    pricing: "free",
    tags: [HIDDEN_GEM_TAG, "garden", "viewpoint", "outdoor", "photo-spot", "quiet"],
    content: localizedCardContent(
      {
        name: "Malerwinkel",
        shortDescription:
          "Eine kleine Grünanlage an der Wallstraße mit Blick über die Trave auf die Altstadt und das Domviertel.",
      },
      {
        name: "Malerwinkel",
        shortDescription:
          "A small riverside green space on Wallstraße with views across the Trave toward the old town and cathedral quarter.",
      },
    ),
  },
  {
    slug: "buergergaerten",
    city: "lubeck",
    category: "see",
    coordinates: { lat: 53.8705631, lng: 10.6907062 },
    durationMinutes: 20,
    environment: "outdoor",
    pricing: "unknown",
    tags: [HIDDEN_GEM_TAG, "garden", "outdoor", "quiet"],
    content: localizedCardContent(
      {
        name: "Bürgergärten",
        shortDescription:
          "Mehrere verbundene Gärten mit grünen Wegen, Sitzplätzen, Skulpturen und Blick auf historische Hausrückseiten.",
      },
      {
        name: "Bürgergärten",
        shortDescription:
          "Connected gardens with green paths, seating, sculptures and views toward the backs of historic town houses.",
      },
    ),
  },
  {
    slug: "cafe-niederegger",
    city: "lubeck",
    category: "eat",
    coordinates: { lat: 53.8666, lng: 10.6858 },
    durationMinutes: 60,
    environment: "indoor",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["food", "local-food", "cafe", "marzipan", "indoor"],
    content: localizedCardContent(
      {
        name: "Café Niederegger",
        shortDescription:
          "Das traditionsreiche Stammhaus serviert Konditoreispezialitäten und beherbergt ein Marzipan-Museum.",
      },
      {
        name: "Café Niederegger",
        shortDescription:
          "The traditional flagship café serves confectionery specialities and houses a marzipan museum.",
      },
    ),
  },
  {
    slug: "schiffergesellschaft",
    city: "lubeck",
    category: "eat",
    coordinates: { lat: 53.8712, lng: 10.6882 },
    durationMinutes: 90,
    environment: "mixed",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["food", "local-food", "history", "architecture", "indoor"],
    content: localizedCardContent(
      {
        name: "Schiffergesellschaft",
        shortDescription:
          "Hanseatische und moderne Küche in der historischen Halle des ehemaligen Lübecker Gildehauses.",
      },
      {
        name: "Schiffergesellschaft",
        shortDescription:
          "Hanseatic and modern cooking in the historic hall of Lübeck's former guild house.",
      },
    ),
  },
  {
    slug: "fangfrisch",
    city: "lubeck",
    category: "eat",
    coordinates: { lat: 53.8722, lng: 10.6838 },
    durationMinutes: 60,
    environment: "mixed",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["food", "local-food", "seafood", "waterfront"],
    content: localizedCardContent(
      {
        name: "Fangfrisch",
        shortDescription:
          "Ein Fischrestaurant an der Untertrave mit Schwerpunkt auf nordischer Küche und regionalen Produkten.",
      },
      {
        name: "Fangfrisch",
        shortDescription:
          "A fish restaurant on the Untertrave focused on Nordic cooking and regional produce.",
      },
    ),
  },
  {
    slug: "restaurant-vai",
    city: "lubeck",
    category: "eat",
    coordinates: { lat: 53.8658, lng: 10.6885 },
    durationMinutes: 90,
    environment: "mixed",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["food", "restaurant", "mediterranean", "wine", "indoor"],
    content: localizedCardContent(
      {
        name: "Restaurant VAI",
        shortDescription:
          "Ein Restaurant in der Hüxstraße mit mediterranen und deutschen Gerichten sowie einer vielseitigen Weinauswahl.",
      },
      {
        name: "Restaurant VAI",
        shortDescription:
          "A Hüxstraße restaurant serving Mediterranean and German dishes with a varied wine selection.",
      },
    ),
  },
  {
    slug: "brauberger-zu-luebeck",
    city: "lubeck",
    category: "eat",
    coordinates: { lat: 53.8683, lng: 10.6809 },
    durationMinutes: 90,
    environment: "mixed",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["food", "local-food", "brewery", "history", "indoor"],
    content: localizedCardContent(
      {
        name: "Brauberger zu Lübeck",
        shortDescription:
          "Eine Altstadtbrauerei mit Braukesseln im Gastraum, herzhaften Gerichten und historischem Bierkeller.",
      },
      {
        name: "Brauberger zu Lübeck",
        shortDescription:
          "An old-town brewery with brewing kettles in the dining room, hearty food and a historic beer cellar.",
      },
    ),
  },
  {
    slug: "zaubertheater-luebeck",
    city: "lubeck",
    category: "fun",
    coordinates: { lat: 53.8696, lng: 10.6811 },
    durationMinutes: 90,
    environment: "indoor",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["entertainment", "theatre", "magic", "hidden-gem", "indoor"],
    content: localizedCardContent(
      {
        name: "Zaubertheater Lübeck",
        shortDescription:
          "Ein kleines privates Theater in der Altstadt mit inszenierter Magie, Comedy und persönlichen Geschichten.",
      },
      {
        name: "Zaubertheater Lübeck",
        shortDescription:
          "A small private old-town theatre presenting staged magic, comedy and personal storytelling.",
      },
    ),
  },
  {
    slug: "kolk-17",
    city: "lubeck",
    category: "fun",
    coordinates: { lat: 53.8656, lng: 10.6824 },
    durationMinutes: 90,
    environment: "indoor",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["entertainment", "museum", "puppet-theatre", "family", "indoor"],
    content: localizedCardContent(
      {
        name: "KOLK 17 Figurentheater & Museum",
        shortDescription:
          "Figurentheater und Museum verbinden Aufführungen mit Ausstellungen zur Welt des Figurenspiels.",
      },
      {
        name: "KOLK 17 Puppet Theatre & Museum",
        shortDescription:
          "A puppet theatre and museum combining live performances with exhibitions about puppetry.",
      },
    ),
  },
  {
    slug: "final-escape-luebeck",
    city: "lubeck",
    category: "fun",
    coordinates: { lat: 53.8666, lng: 10.6835 },
    durationMinutes: 90,
    environment: "indoor",
    pricing: "paid",
    status: "open",
    statusVerifiedAt: "2026-09-03",
    tags: ["entertainment", "escape-room", "team", "indoor"],
    content: localizedCardContent(
      {
        name: "Final Escape Lübeck",
        shortDescription:
          "Indoor-Escape-Games mit thematischen Räumen, Teamrätseln und deutsch- oder englischsprachigem Spiel.",
      },
      {
        name: "Final Escape Lübeck",
        shortDescription:
          "Indoor escape games with themed rooms, team puzzles and play available in German or English.",
      },
    ),
  },
] as const satisfies readonly Place[];

export const LUBECK_PLACE_SLUGS = [
  "lubecker-altstadt",
  "holstentor",
  "marienkirche",
  "europaeisches-hansemuseum",
  "st-petri-zu-luebeck",
  "luebecker-dom",
  "heiligen-geist-hospital",
  "rathaus",
  "willy-brandt-haus",
  "an-der-obertrave",
  "salzspeicher",
  "fuechtingshof",
  "dunkelgruener-gang",
  "kalandsgang",
  "malerwinkel",
  "buergergaerten",
  "buddenbrookhaus",
  "cafe-niederegger",
  "schiffergesellschaft",
  "fangfrisch",
  "restaurant-vai",
  "brauberger-zu-luebeck",
  "zaubertheater-luebeck",
  "kolk-17",
  "final-escape-luebeck",
] as const;

export type LubeckPlaceSlug = (typeof LUBECK_PLACE_SLUGS)[number];

const lubeckPlaceBySlug = new Map<string, Place>(
  [...lubeckLandmarks, ...additionalLubeckPlaces].map(
    (place) => [place.slug, place] as const,
  ),
);

export const lubeckPlaces: readonly Place[] = LUBECK_PLACE_SLUGS.map((slug) => {
  const place = lubeckPlaceBySlug.get(slug);

  if (!place) {
    throw new Error(`Missing curated Place data for lubeck/${slug}`);
  }

  return place;
});

export const places: readonly Place[] = [...lubeckPlaces];


export function getPlace(city: string, slug: string): Place | undefined {
  return places.find((place) => place.city === city && place.slug === slug);
}

export function resolvePlaceContent(
  place: Place,
  requestedLocale: Locale,
): ResolvedPlaceContent | undefined {
  const requestedContent = place.content[requestedLocale];

  if (requestedContent) {
    return {
      requestedLocale,
      actualLocale: requestedLocale,
      didFallback: false,
      content: requestedContent,
    };
  }

  const fallbackLocales: readonly Locale[] = ["en", "de", ...locales];

  for (const actualLocale of fallbackLocales) {
    const content = place.content[actualLocale];

    if (content) {
      return {
        requestedLocale,
        actualLocale,
        didFallback: true,
        content,
      };
    }
  }

  return undefined;
}

export function getPlacesByCategory(
  category: PlaceCategory,
  city?: string,
): readonly Place[] {
  return places.filter(
    (place) => place.category === category && (!city || place.city === city),
  );
}

export function getPlaceDurationLabel(place: Place, locale: Locale): string {
  return (
    legacyDurationLabels[placeKey(place.city, place.slug)]?.[locale] ??
    `${place.durationMinutes} min`
  );
}
