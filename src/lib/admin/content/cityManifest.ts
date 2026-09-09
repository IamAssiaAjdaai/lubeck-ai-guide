import {
  PLACE_CATEGORIES,
  PLACE_ENVIRONMENTS,
  PLACE_PRICING,
  PLACE_STATUSES,
  type PlaceCategory,
  type PlaceEnvironment,
  type PlaceFact,
  type PlacePricing,
  type PlaceStatus,
} from "@/data/places";
import { isLocale, type Locale } from "@/lib/i18n";

export type CityManifestSource = Readonly<{
  publisher: string;
  title: string;
  canonicalUrl: string;
  verifiedAt: string;
  notes?: string;
}>;

export type CityManifestLocalization = Readonly<{
  name: string;
  shortDescription?: string;
  description?: string;
}>;

export type CityManifestPlaceLocalization = Readonly<{
  name: string;
  shortDescription: string;
  description?: string;
  story?: string;
  visitNotes?: string;
  facts?: readonly PlaceFact[];
}>;

export type CityManifestPlace = Readonly<{
  slug: string;
  category: PlaceCategory;
  coordinates: Readonly<{ lat: number; lng: number }>;
  durationMinutes: number;
  environment: PlaceEnvironment;
  pricing: PlacePricing;
  status?: PlaceStatus;
  statusVerifiedAt?: string;
  tags: readonly string[];
  publicationStatus: "draft" | "published";
  content: Readonly<Partial<Record<Locale, CityManifestPlaceLocalization>>>;
  sources: readonly CityManifestSource[];
}>;

export type CityManifestTour = Readonly<{
  slug: string;
  publicationStatus: "draft" | "published";
  estimatedDurationMinutes?: number;
  content: Readonly<Partial<Record<Locale, Readonly<{
    title: string;
    shortDescription?: string;
    description?: string;
  }>>>>;
  stops: readonly Readonly<{
    placeSlug: string;
    visitDurationMinutes?: number;
  }>[];
}>;

export type CityManifestKnowledgeChunk = Readonly<{
  placeSlug: string;
  sourceUrl: string;
  locale: Locale;
  text: string;
  topics: readonly string[];
  priority?: number;
}>;

export type CityManifest = Readonly<{
  schemaVersion: 1;
  city: Readonly<{
    slug: string;
    name: string;
    countryCode: string;
    timezone: string;
    publicationStatus: "draft" | "published";
    content: Readonly<Partial<Record<Locale, CityManifestLocalization>>>;
    sources: readonly CityManifestSource[];
  }>;
  coordinateQa: Readonly<{
    latitude: readonly [number, number];
    longitude: readonly [number, number];
  }>;
  readiness: Readonly<{
    targetPlaceCount: number;
    requiredContentLocales: readonly Locale[];
    reviewedContentLocales: readonly Locale[];
    requiredAudioLocales: readonly Locale[];
    audioTargetPlaceCount: number;
    minimumVerifiedAiPlaceCount: number;
    webQaStatus: "pending" | "passed" | "failed";
    nativeQaStatus: "pending" | "passed" | "failed";
    travelerQaStatus: "pending" | "passed" | "failed";
    premiumContentStatus: "not_required" | "pending" | "ready";
    notes?: string;
  }>;
  places: readonly CityManifestPlace[];
  tours: readonly CityManifestTour[];
  knowledge: readonly CityManifestKnowledgeChunk[];
}>;

export class CityManifestValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`City manifest validation failed: ${issues.join("; ")}`);
    this.name = "CityManifestValidationError";
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateCityManifest(manifest: CityManifest): CityManifest {
  const issues: string[] = [];
  const placeSlugs = new Set<string>();
  const coordinateKeys = new Map<string, string>();

  if (manifest.schemaVersion !== 1) issues.push("unsupported schemaVersion");
  validateSlug(manifest.city.slug, "city slug", issues);
  if (!/^[A-Z]{2}$/.test(manifest.city.countryCode)) {
    issues.push("city countryCode must be an ISO 3166-1 alpha-2 code");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: manifest.city.timezone });
  } catch {
    issues.push("city timezone must be a valid IANA timezone");
  }
  validateLocalizedNames(manifest.city.content, "city", issues);
  for (const locale of manifest.readiness.requiredContentLocales) {
    const content = manifest.city.content[locale];
    if (!content?.shortDescription?.trim() || !content.description?.trim()) {
      issues.push(`city is missing complete ${locale} traveler content`);
    }
  }
  if (manifest.city.sources.length === 0) {
    issues.push("city has no canonical source");
  }
  for (const source of manifest.city.sources) {
    validateSource(source, "city", issues);
  }

  if (manifest.places.length < 1) issues.push("at least one place is required");
  if (manifest.readiness.targetPlaceCount < 1) {
    issues.push("targetPlaceCount must be positive");
  }
  if (manifest.readiness.audioTargetPlaceCount < 0) {
    issues.push("audioTargetPlaceCount cannot be negative");
  }
  if (manifest.readiness.minimumVerifiedAiPlaceCount < 0) {
    issues.push("minimumVerifiedAiPlaceCount cannot be negative");
  }
  for (const locale of [
    ...manifest.readiness.requiredContentLocales,
    ...manifest.readiness.reviewedContentLocales,
    ...manifest.readiness.requiredAudioLocales,
  ]) {
    if (!isLocale(locale)) issues.push(`unsupported readiness locale: ${locale}`);
  }

  for (const place of manifest.places) {
    validateSlug(place.slug, "place slug", issues);
    if (placeSlugs.has(place.slug)) issues.push(`duplicate place slug: ${place.slug}`);
    placeSlugs.add(place.slug);
    if (!PLACE_CATEGORIES.includes(place.category)) {
      issues.push(`${place.slug} has invalid category`);
    }
    if (!PLACE_ENVIRONMENTS.includes(place.environment)) {
      issues.push(`${place.slug} has invalid environment`);
    }
    if (!PLACE_PRICING.includes(place.pricing)) {
      issues.push(`${place.slug} has invalid pricing`);
    }
    if (place.status && !PLACE_STATUSES.includes(place.status)) {
      issues.push(`${place.slug} has invalid status`);
    }
    if (!Number.isInteger(place.durationMinutes) || place.durationMinutes <= 0) {
      issues.push(`${place.slug} has invalid visit duration`);
    }
    const { lat, lng } = place.coordinates;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      issues.push(`${place.slug} has invalid latitude`);
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      issues.push(`${place.slug} has invalid longitude`);
    }
    if (
      lat < manifest.coordinateQa.latitude[0] ||
      lat > manifest.coordinateQa.latitude[1] ||
      lng < manifest.coordinateQa.longitude[0] ||
      lng > manifest.coordinateQa.longitude[1]
    ) {
      issues.push(`${place.slug} is outside the city coordinate QA envelope`);
    }
    const coordinateKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const duplicate = coordinateKeys.get(coordinateKey);
    if (duplicate) issues.push(`${place.slug} duplicates coordinates with ${duplicate}`);
    coordinateKeys.set(coordinateKey, place.slug);
    validateLocalizedNames(place.content, `place ${place.slug}`, issues);
    if (!hasPlausibleLocalizedIdentity(
      manifest.city.slug,
      place.slug,
      place.content,
    )) {
      issues.push(`${place.slug} has a suspicious localized place identity`);
    }
    for (const locale of manifest.readiness.requiredContentLocales) {
      if (!place.content[locale]) issues.push(`${place.slug} is missing ${locale} content`);
    }
    if (place.sources.length === 0) issues.push(`${place.slug} has no canonical source`);
    for (const source of place.sources) validateSource(source, place.slug, issues);
  }

  for (const tour of manifest.tours) {
    validateSlug(tour.slug, "tour slug", issues);
    if (tour.stops.length < 2) issues.push(`${tour.slug} needs at least two stops`);
    const usedStops = new Set<string>();
    for (const stop of tour.stops) {
      if (!placeSlugs.has(stop.placeSlug)) {
        issues.push(`${tour.slug} references unknown place ${stop.placeSlug}`);
      }
      if (usedStops.has(stop.placeSlug)) {
        issues.push(`${tour.slug} repeats place ${stop.placeSlug}`);
      }
      usedStops.add(stop.placeSlug);
    }
    validateLocalizedNames(tour.content, `tour ${tour.slug}`, issues);
  }

  for (const chunk of manifest.knowledge) {
    if (!placeSlugs.has(chunk.placeSlug)) {
      issues.push(`knowledge references unknown place ${chunk.placeSlug}`);
      continue;
    }
    const place = manifest.places.find(({ slug }) => slug === chunk.placeSlug);
    if (!place?.sources.some(({ canonicalUrl }) => canonicalUrl === chunk.sourceUrl)) {
      issues.push(`knowledge for ${chunk.placeSlug} is not linked to its source`);
    }
    if (!chunk.text.trim()) issues.push(`knowledge for ${chunk.placeSlug} is empty`);
  }

  if (issues.length > 0) throw new CityManifestValidationError(issues);
  return manifest;
}

function validateLocalizedNames(
  content: Readonly<Record<string, { name?: string; title?: string } | undefined>>,
  label: string,
  issues: string[],
) {
  const entries = Object.entries(content);
  if (entries.length === 0) issues.push(`${label} has no localizations`);
  for (const [locale, value] of entries) {
    if (!isLocale(locale)) issues.push(`${label} uses unsupported locale ${locale}`);
    if (!(value?.name ?? value?.title)?.trim()) {
      issues.push(`${label} ${locale} has no name/title`);
    }
  }
}

function validateSource(source: CityManifestSource, subject: string, issues: string[]) {
  try {
    const url = new URL(source.canonicalUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    issues.push(`${subject} has an invalid source URL`);
  }
  if (!source.publisher.trim() || !source.title.trim()) {
    issues.push(`${subject} has incomplete source metadata`);
  }
  if (!ISO_DATE_PATTERN.test(source.verifiedAt)) {
    issues.push(`${subject} source verifiedAt must use YYYY-MM-DD`);
  }
}

function validateSlug(value: string, label: string, issues: string[]) {
  if (!SLUG_PATTERN.test(value)) issues.push(`${label} must be URL-safe`);
}

function hasPlausibleLocalizedIdentity(
  citySlug: string,
  slug: string,
  content: Readonly<Record<string, { name?: string } | undefined>>,
): boolean {
  const cityTokens = citySlug
    .split("-")
    .map(normalizeIdentityText)
    .filter(Boolean);
  const tokens = slug.split("-").filter((token) =>
    token.length >= 5 && !isDerivedCityIdentityToken(token, cityTokens),
  );
  if (tokens.length === 0) return true;
  const names = Object.values(content)
    .map((value) => normalizeIdentityText(value?.name ?? ""))
    .join(" ");
  return tokens.some((token) => names.includes(normalizeIdentityText(token)));
}

function isDerivedCityIdentityToken(
  value: string,
  cityTokens: readonly string[],
): boolean {
  const token = normalizeIdentityText(value);
  return cityTokens.some((cityToken) =>
    token === cityToken ||
    (token.startsWith(cityToken) && token.length <= cityToken.length + 3),
  );
}

function normalizeIdentityText(value: string): string {
  return value.toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
