export type NativeLocale = "en" | "de" | "ar";

export type PublicMedia = Readonly<{
  assetKey: string;
  kind: "image" | "audio" | "video" | "document";
  purpose: "hero" | "card" | "gallery" | "thumbnail" | "audio" | "video" | "document";
  url: string;
  mimeType: string;
  durationSeconds?: number;
  locale?: string;
}>;

export type LocalizedContent<TContent> = Readonly<{
  requestedLocale: string;
  resolvedLocale: string;
  didFallback: boolean;
  content: TContent;
}>;

export type PublicCitySummary = Readonly<{
  slug: string;
  name: string;
  shortDescription?: string;
  requestedLocale: string;
  resolvedLocale: string;
  didFallback: boolean;
  media: readonly PublicMedia[];
}>;

export type PublicPlace = LocalizedContent<Readonly<{
  name: string;
  shortDescription: string;
  description?: string;
  story?: string;
  visitNote?: string;
  facts?: readonly string[];
}>> & Readonly<{
  slug: string;
  category: "see" | "eat" | "fun";
  coordinates: Readonly<{ lat: number; lng: number }>;
  durationMinutes: number;
  image?: string;
  media: readonly PublicMedia[];
}>;

export type PublicCity = LocalizedContent<Readonly<{
  name: string;
  shortDescription?: string;
}>> & Readonly<{
  slug: string;
  media: readonly PublicMedia[];
}>;

export type PublicCityIndexResponse = Readonly<{
  cities: readonly PublicCitySummary[];
}>;

export type PublicCityResponse = Readonly<{
  city: PublicCity;
  places: readonly PublicPlace[];
  tours: readonly unknown[];
}>;

export function parseCityIndexResponse(value: unknown): PublicCityIndexResponse {
  const object = asObject(value, "city index");
  if (!Array.isArray(object.cities)) throw new Error("Invalid city index response.");
  return {
    cities: object.cities.map((city) => parseCitySummary(city)),
  };
}

export function parseCityResponse(value: unknown): PublicCityResponse {
  const object = asObject(value, "city");
  if (!Array.isArray(object.places) || !Array.isArray(object.tours)) {
    throw new Error("Invalid city response.");
  }
  return {
    city: parseCity(object.city),
    places: object.places.map((place) => parsePlace(place)),
    tours: object.tours,
  };
}

function parseCitySummary(value: unknown): PublicCitySummary {
  const object = asObject(value, "city summary");
  return {
    slug: asString(object.slug, "city slug"),
    name: asString(object.name, "city name"),
    ...(typeof object.shortDescription === "string"
      ? { shortDescription: object.shortDescription }
      : {}),
    requestedLocale: asString(object.requestedLocale, "requested locale"),
    resolvedLocale: asString(object.resolvedLocale, "resolved locale"),
    didFallback: asBoolean(object.didFallback, "fallback state"),
    media: parseMediaArray(object.media),
  };
}

function parseCity(value: unknown): PublicCity {
  const object = asObject(value, "city");
  const localized = parseLocalizedContent(object);
  const content = asObject(localized.content, "city content");
  return {
    slug: asString(object.slug, "city slug"),
    ...localized,
    content: {
      name: asString(content.name, "city name"),
      ...(typeof content.shortDescription === "string"
        ? { shortDescription: content.shortDescription }
        : {}),
    },
    media: parseMediaArray(object.media),
  };
}

function parsePlace(value: unknown): PublicPlace {
  const object = asObject(value, "place");
  const localized = parseLocalizedContent(object);
  const content = asObject(localized.content, "place content");
  const coordinates = asObject(object.coordinates, "coordinates");
  const category = asString(object.category, "place category");
  if (category !== "see" && category !== "eat" && category !== "fun") {
    throw new Error("Invalid place category.");
  }
  return {
    slug: asString(object.slug, "place slug"),
    category,
    coordinates: {
      lat: asFiniteNumber(coordinates.lat, "latitude"),
      lng: asFiniteNumber(coordinates.lng, "longitude"),
    },
    durationMinutes: asFiniteNumber(object.durationMinutes, "visit duration"),
    ...(typeof object.image === "string" ? { image: object.image } : {}),
    media: parseMediaArray(object.media),
    ...localized,
    content: {
      name: asString(content.name, "place name"),
      shortDescription: asString(content.shortDescription, "place description"),
      ...(typeof content.description === "string" ? { description: content.description } : {}),
      ...(typeof content.story === "string" ? { story: content.story } : {}),
      ...(typeof content.visitNote === "string" ? { visitNote: content.visitNote } : {}),
      ...(Array.isArray(content.facts) && content.facts.every((fact) => typeof fact === "string")
        ? { facts: content.facts }
        : {}),
    },
  };
}

function parseLocalizedContent(object: Record<string, unknown>) {
  return {
    requestedLocale: asString(object.requestedLocale, "requested locale"),
    resolvedLocale: asString(object.resolvedLocale, "resolved locale"),
    didFallback: asBoolean(object.didFallback, "fallback state"),
    content: object.content,
  };
}

function parseMediaArray(value: unknown): readonly PublicMedia[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const media = entry as Record<string, unknown>;
    if (
      typeof media.assetKey !== "string" ||
      typeof media.kind !== "string" ||
      typeof media.purpose !== "string" ||
      typeof media.url !== "string" ||
      typeof media.mimeType !== "string"
    ) return [];
    return [media as PublicMedia];
  });
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} response.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${label}.`);
  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Invalid ${label}.`);
  return value;
}

function asFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid ${label}.`);
  return value;
}
