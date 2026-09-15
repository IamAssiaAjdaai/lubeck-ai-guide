export type NativeLocale = "en" | "de" | "ar";

export type PublicMediaAttribution = Readonly<{
  text: string;
  creator?: string;
}>;

export type PublicMedia = Readonly<{
  assetKey: string;
  kind: "image" | "audio" | "video" | "document";
  purpose: "hero" | "card" | "gallery" | "thumbnail" | "audio" | "video" | "document";
  url: string;
  mimeType: string;
  durationSeconds?: number;
  locale?: string;
  variants?: PublicImageVariantUrls;
  attribution?: PublicMediaAttribution;
}>;

export type PublicImageVariantUrls = Readonly<{
  thumbnail: string;
  card: string;
  detail: string;
  hero: string;
}>;

export type LocalizedContent<TContent> = Readonly<{
  requestedLocale: string;
  resolvedLocale: string;
  didFallback: boolean;
  content: TContent;
}>;

export type PublicCitySummary = Readonly<{
  slug: string;
  countryCode?: string;
  timezone?: string;
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
  facts?: readonly PublicFact[];
}>> & Readonly<{
  slug: string;
  countryCode?: string;
  timezone?: string;
  category: "see" | "eat" | "fun";
  coordinates: Readonly<{ lat: number; lng: number }>;
  durationMinutes: number;
  environment?: "indoor" | "outdoor" | "mixed";
  pricing?: "free" | "paid" | "mixed" | "unknown";
  status?: "open" | "closed" | "renovation" | "seasonal" | "unknown";
  tags?: readonly string[];
  image?: string;
  imageVariants?: PublicImageVariantUrls;
  media: readonly PublicMedia[];
}>;

export type PublicPlaceCard = LocalizedContent<Readonly<{
  name: string;
  shortDescription: string;
}>> & Omit<PublicPlace, keyof LocalizedContent<unknown> | "content">;

export type PublicFact = Readonly<{
  label: string;
  value: string;
}>;

export type PublicTourStop = Readonly<{
  placeSlug: string;
  position: number;
  visitDurationMinutes?: number;
}>;

export type PublicTour = LocalizedContent<Readonly<{
  title: string;
  shortDescription?: string;
  description?: string;
}>> & Readonly<{
  slug: string;
  estimatedDurationMinutes?: number;
  stops: readonly PublicTourStop[];
  media: readonly PublicMedia[];
}>;

export type PublicCity = LocalizedContent<Readonly<{
  name: string;
  shortDescription?: string;
  description?: string;
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
  tours: readonly PublicTour[];
}>;

export type PublicCitySummaryResponse = Readonly<{
  city: PublicCity;
  places: readonly PublicPlaceCard[];
  tours: readonly PublicTour[];
}>;

export type PublicPlaceResponse = Readonly<{
  city: PublicCity;
  place: PublicPlace;
}>;

export type GuideEligibilityResponse = Readonly<{
  eligible: boolean;
}>;

export type GuideSource = Readonly<{
  label: string;
  url: string;
  verifiedAt: string;
  citySlug: string;
  placeSlug: string;
  chunkIds: readonly string[];
}>;

export type GuideAnswerResponse = Readonly<{
  answer: string;
  sources: readonly GuideSource[];
  allowance?: GuideAllowance;
}>;

export type GuideAllowance = Readonly<{
  kind: "daily_guide";
  tier: "free" | "premium";
  limit: number;
  remaining: number;
  resetAt: number;
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
    tours: object.tours.map((tour) => parseTour(tour)),
  };
}

export function parseCitySummaryResponse(value: unknown): PublicCitySummaryResponse {
  const object = asObject(value, "city summary");
  if (!Array.isArray(object.places) || !Array.isArray(object.tours)) {
    throw new Error("Invalid city summary response.");
  }
  return {
    city: parseCity(object.city),
    places: object.places.map((place) => parsePlaceCard(place)),
    tours: object.tours.map((tour) => parseTour(tour)),
  };
}

export function parsePlaceResponse(value: unknown): PublicPlaceResponse {
  const object = asObject(value, "place detail");
  return { city: parseCity(object.city), place: parsePlace(object.place) };
}

export function parseGuideEligibilityResponse(value: unknown): GuideEligibilityResponse {
  const object = asObject(value, "guide eligibility");
  return { eligible: asBoolean(object.eligible, "guide eligibility") };
}

export function parseGuideAnswerResponse(value: unknown): GuideAnswerResponse {
  const object = asObject(value, "guide answer");
  if (!Array.isArray(object.sources)) throw new Error("Invalid guide sources.");
  return {
    answer: asString(object.answer, "guide answer"),
    sources: object.sources.map(parseGuideSource),
    ...(object.allowance === undefined
      ? {}
      : { allowance: parseGuideAllowance(object.allowance) }),
  };
}

export function parseGuideAllowance(value: unknown): GuideAllowance {
  const object = asObject(value, "guide allowance");
  if (
    object.kind !== "daily_guide" ||
    (object.tier !== "free" && object.tier !== "premium")
  ) {
    throw new Error("Invalid guide allowance.");
  }
  const limit = asNonNegativeInteger(object.limit, "guide allowance limit");
  const remaining = asNonNegativeInteger(object.remaining, "guide allowance remaining");
  const resetAt = asNonNegativeInteger(object.resetAt, "guide allowance reset");
  if (limit < 1 || remaining > limit) throw new Error("Invalid guide allowance.");
  return { kind: "daily_guide", tier: object.tier, limit, remaining, resetAt };
}

function parseCitySummary(value: unknown): PublicCitySummary {
  const object = asObject(value, "city summary");
  return {
    slug: asString(object.slug, "city slug"),
    ...(typeof object.countryCode === "string" ? { countryCode: object.countryCode } : {}),
    ...(typeof object.timezone === "string" ? { timezone: object.timezone } : {}),
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
    ...(typeof object.countryCode === "string" ? { countryCode: object.countryCode } : {}),
    ...(typeof object.timezone === "string" ? { timezone: object.timezone } : {}),
    ...localized,
    content: {
      name: asString(content.name, "city name"),
      ...(typeof content.shortDescription === "string"
        ? { shortDescription: content.shortDescription }
        : {}),
      ...(typeof content.description === "string"
        ? { description: content.description }
        : {}),
    },
    media: parseMediaArray(object.media),
  };
}

function parsePlace(value: unknown): PublicPlace {
  const card = parsePlaceCard(value);
  const object = asObject(value, "place");
  const content = asObject(object.content, "place content");
  return {
    ...card,
    content: {
      ...card.content,
      ...(typeof content.description === "string" ? { description: content.description } : {}),
      ...(typeof content.story === "string" ? { story: content.story } : {}),
      ...(typeof content.visitNote === "string" ? { visitNote: content.visitNote } : {}),
      ...(content.facts === undefined ? {} : { facts: parseFacts(content.facts) }),
    },
  };
}

function parsePlaceCard(value: unknown): PublicPlaceCard {
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
    ...(isEnvironment(object.environment) ? { environment: object.environment } : {}),
    ...(isPricing(object.pricing) ? { pricing: object.pricing } : {}),
    ...(isPlaceStatus(object.status) ? { status: object.status } : {}),
    tags: Array.isArray(object.tags)
      ? object.tags.flatMap((tag) => typeof tag === "string" && tag.trim() ? [tag] : [])
      : [],
    ...(typeof object.image === "string" ? { image: object.image } : {}),
    ...(parseImageVariants(object.imageVariants)
      ? { imageVariants: parseImageVariants(object.imageVariants) }
      : {}),
    media: parseMediaArray(object.media),
    ...localized,
    content: {
      name: asString(content.name, "place name"),
      shortDescription: asString(content.shortDescription, "place description"),
    },
  };
}

function parseTour(value: unknown): PublicTour {
  const object = asObject(value, "tour");
  const localized = parseLocalizedContent(object);
  const content = asObject(localized.content, "tour content");
  if (!Array.isArray(object.stops)) throw new Error("Invalid tour stops.");
  return {
    slug: asString(object.slug, "tour slug"),
    ...(object.estimatedDurationMinutes === undefined
      ? {}
      : {
          estimatedDurationMinutes: asPositiveNumber(
            object.estimatedDurationMinutes,
            "tour duration",
          ),
        }),
    stops: object.stops.map(parseTourStop),
    media: parseMediaArray(object.media),
    ...localized,
    content: {
      title: asString(content.title, "tour title"),
      ...(typeof content.shortDescription === "string"
        ? { shortDescription: content.shortDescription }
        : {}),
      ...(typeof content.description === "string"
        ? { description: content.description }
        : {}),
    },
  };
}

function parseTourStop(value: unknown): PublicTourStop {
  const object = asObject(value, "tour stop");
  const position = asFiniteNumber(object.position, "tour stop position");
  if (!Number.isInteger(position) || position < 0) {
    throw new Error("Invalid tour stop position.");
  }
  return {
    placeSlug: asString(object.placeSlug, "tour stop place slug"),
    position,
    ...(object.visitDurationMinutes === undefined
      ? {}
      : {
          visitDurationMinutes: asPositiveNumber(
            object.visitDurationMinutes,
            "tour stop visit duration",
          ),
        }),
  };
}

function parseFacts(value: unknown): readonly PublicFact[] {
  if (!Array.isArray(value)) throw new Error("Invalid place facts.");
  return value.map((fact) => {
    if (typeof fact === "string") {
      return { label: "", value: asString(fact, "legacy place fact") };
    }
    const object = asObject(fact, "place fact");
    return {
      label: asString(object.label, "place fact label"),
      value: asString(object.value, "place fact value"),
    };
  });
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
    if (!isMediaKind(media.kind) || !isMediaPurpose(media.purpose)) return [];
    if (
      typeof media.assetKey !== "string" || !media.assetKey.trim() ||
      typeof media.url !== "string" || !media.url.trim() ||
      typeof media.mimeType !== "string" || !media.mimeType.trim()
    ) return [];
    const attribution = parseMediaAttribution(media.attribution);
    return [{
      assetKey: media.assetKey,
      kind: media.kind,
      purpose: media.purpose,
      url: media.url,
      mimeType: media.mimeType,
      ...(typeof media.durationSeconds === "number" &&
      Number.isFinite(media.durationSeconds) && media.durationSeconds > 0
        ? { durationSeconds: media.durationSeconds }
        : {}),
      ...(typeof media.locale === "string" && media.locale
        ? { locale: media.locale }
        : {}),
      ...(parseImageVariants(media.variants)
        ? { variants: parseImageVariants(media.variants) }
        : {}),
      ...(attribution ? { attribution } : {}),
    }];
  });
}

function parseImageVariants(value: unknown): PublicImageVariantUrls | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const variants = value as Record<string, unknown>;
  if (!["thumbnail", "card", "detail", "hero"].every(
    (name) => typeof variants[name] === "string" && variants[name] !== "",
  )) return undefined;
  return {
    thumbnail: variants.thumbnail as string,
    card: variants.card as string,
    detail: variants.detail as string,
    hero: variants.hero as string,
  };
}

function parseMediaAttribution(value: unknown): PublicMediaAttribution | undefined {
  if (value === undefined) return undefined;
  const object = asObject(value, "media attribution");
  return {
    text: asString(object.text, "media attribution text"),
    ...(typeof object.creator === "string" && object.creator.trim()
      ? { creator: object.creator }
      : {}),
  };
}

function parseGuideSource(value: unknown): GuideSource {
  const object = asObject(value, "guide source");
  if (!Array.isArray(object.chunkIds)) throw new Error("Invalid guide source chunks.");
  const url = asString(object.url, "guide source URL");
  const protocol = new URL(url).protocol;
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error("Invalid guide source URL.");
  }
  return {
    label: asString(object.label, "guide source label"),
    url,
    verifiedAt: asString(object.verifiedAt, "guide source verification date"),
    citySlug: asString(object.citySlug, "guide source city"),
    placeSlug: asString(object.placeSlug, "guide source place"),
    chunkIds: object.chunkIds.map((id) => asString(id, "guide source chunk")),
  };
}

function isMediaKind(value: unknown): value is PublicMedia["kind"] {
  return value === "image" || value === "audio" || value === "video" || value === "document";
}

function isEnvironment(value: unknown): value is NonNullable<PublicPlace["environment"]> {
  return value === "indoor" || value === "outdoor" || value === "mixed";
}

function isPricing(value: unknown): value is NonNullable<PublicPlace["pricing"]> {
  return value === "free" || value === "paid" || value === "mixed" || value === "unknown";
}

function isPlaceStatus(value: unknown): value is NonNullable<PublicPlace["status"]> {
  return value === "open" || value === "closed" || value === "renovation" ||
    value === "seasonal" || value === "unknown";
}

function isMediaPurpose(value: unknown): value is PublicMedia["purpose"] {
  return value === "hero" || value === "card" || value === "gallery" ||
    value === "thumbnail" || value === "audio" || value === "video" || value === "document";
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

function asPositiveNumber(value: unknown, label: string): number {
  const number = asFiniteNumber(value, label);
  if (number <= 0) throw new Error(`Invalid ${label}.`);
  return number;
}

function asNonNegativeInteger(value: unknown, label: string): number {
  const number = asFiniteNumber(value, label);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`Invalid ${label}.`);
  return number;
}
