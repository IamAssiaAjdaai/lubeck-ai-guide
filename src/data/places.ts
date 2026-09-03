import type { LandmarkContent } from "@/data/landmarkTranslations";
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
  tags: readonly string[];
  audio?: Readonly<Partial<Record<Locale, string>>>;
  content: Readonly<Record<Locale, PlaceContent>>;
}>;

export type LandmarkPlaceContent = PlaceContent &
  Readonly<Required<Pick<PlaceContent, "description" | "story" | "facts">>>;

export type LandmarkPlace = Omit<Place, "image" | "content"> &
  Readonly<{
    image: string;
    content: Readonly<Record<Locale, LandmarkPlaceContent>>;
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
    | "tags"
  >
>;

// Coordinates come from the corresponding Wikidata/OpenStreetMap records.
// Pricing stays unknown until current, verified visitor information is added.
const lubeckLandmarkMetadata = {
  holstentor: {
    category: "see",
    coordinates: { lat: 53.8662, lng: 10.6797 },
    durationMinutes: 2,
    environment: "mixed",
    pricing: "unknown",
    tags: ["history", "architecture", "brick-gothic", "city-gate"],
  },
  marienkirche: {
    category: "see",
    coordinates: { lat: 53.8678, lng: 10.6851 },
    durationMinutes: 2,
    environment: "indoor",
    pricing: "unknown",
    tags: ["history", "architecture", "brick-gothic", "church"],
  },
  rathaus: {
    category: "see",
    coordinates: { lat: 53.867, lng: 10.6855 },
    durationMinutes: 2,
    environment: "outdoor",
    pricing: "unknown",
    tags: ["history", "architecture", "brick-gothic", "renaissance", "town-hall"],
  },
  "heiligen-geist-hospital": {
    category: "see",
    coordinates: { lat: 53.8714, lng: 10.6899 },
    durationMinutes: 2,
    environment: "indoor",
    pricing: "unknown",
    tags: ["history", "social-history", "medieval", "hospital"],
  },
  buddenbrookhaus: {
    category: "see",
    coordinates: { lat: 53.8683, lng: 10.6858 },
    durationMinutes: 2,
    environment: "indoor",
    pricing: "unknown",
    tags: ["history", "literature", "museum", "thomas-mann"],
  },
} as const satisfies Record<LubeckLandmarkSlug, PlaceMetadata>;

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
  content: Record<Locale, LandmarkContent>,
): Readonly<Record<Locale, LandmarkPlaceContent>> {
  return Object.fromEntries(
    locales.map((locale) => [locale, toPlaceContent(content[locale])]),
  ) as Record<Locale, LandmarkPlaceContent>;
}

function toLocalizedAudio(
  content: Record<Locale, LandmarkContent>,
): Readonly<Partial<Record<Locale, string>>> | undefined {
  const audio = Object.fromEntries(
    locales.flatMap((locale) => {
      const source = content[locale].audio;
      return source ? ([[locale, source]] as const) : [];
    }),
  ) as Partial<Record<Locale, string>>;

  return Object.keys(audio).length > 0 ? audio : undefined;
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
      audio: toLocalizedAudio(landmark.content),
      content: toLocalizedContent(landmark.content),
    };
  },
);

export const places: readonly Place[] = [...lubeckLandmarks];

export const lubeckPlaces = places.filter((place) => place.city === "lubeck");

export function getPlace(city: string, slug: string): Place | undefined {
  return places.find((place) => place.city === city && place.slug === slug);
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
