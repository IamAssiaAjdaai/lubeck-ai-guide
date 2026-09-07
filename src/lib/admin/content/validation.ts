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
import {
  EDITORIAL_WORKFLOW_STATES,
  getEditorialTransition,
} from "@/lib/admin/content/editorialWorkflow";

export const PUBLICATION_STATUSES = EDITORIAL_WORKFLOW_STATES;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export type CityLocalizationInput = Readonly<{
  locale: Locale;
  name: string;
  shortDescription?: string;
}>;

export type PlaceLocalizationInput = Readonly<{
  locale: Locale;
  name: string;
  shortDescription: string;
  description?: string;
  story?: string;
  visitNotes?: string;
  facts: readonly PlaceFact[];
}>;

export type TourLocalizationInput = Readonly<{
  locale: Locale;
  title: string;
  shortDescription?: string;
  description?: string;
}>;

export type CityInput = Readonly<{
  slug: string;
  publicationStatus: PublicationStatus;
  localizations: readonly CityLocalizationInput[];
}>;

export type PlaceInput = Readonly<{
  cityId: number;
  slug: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  durationMinutes: number;
  environment: PlaceEnvironment;
  pricing: PlacePricing;
  status?: PlaceStatus;
  statusVerifiedAt?: string;
  visitNoteVerifiedAt?: string;
  visitNoteValidUntil?: string;
  image?: string;
  tagSlugs: readonly string[];
  publicationStatus: PublicationStatus;
  localizations: readonly PlaceLocalizationInput[];
}>;

export type TourStopInput = Readonly<{
  placeId: number;
  position: number;
  visitDurationMinutes?: number;
}>;

export type TourInput = Readonly<{
  cityId: number;
  slug: string;
  publicationStatus: PublicationStatus;
  estimatedDurationMinutes?: number;
  localizations: readonly TourLocalizationInput[];
  stops: readonly TourStopInput[];
}>;

export class CmsValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(issues.join(" "));
    this.name = "CmsValidationError";
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateSlug(value: unknown, field = "slug"): string {
  const slug = requireText(value, field, 100);
  if (!SLUG_PATTERN.test(slug)) {
    throw new CmsValidationError([
      `${field} must use lowercase kebab-case.`,
    ]);
  }
  return slug;
}

export function validateCoordinates(latitude: unknown, longitude: unknown) {
  const lat = requireFiniteNumber(latitude, "latitude");
  const lng = requireFiniteNumber(longitude, "longitude");
  if (lat < -90 || lat > 90) {
    throw new CmsValidationError(["latitude must be between -90 and 90."]);
  }
  if (lng < -180 || lng > 180) {
    throw new CmsValidationError(["longitude must be between -180 and 180."]);
  }
  return { latitude: lat, longitude: lng } as const;
}

export function validateDuration(
  value: unknown,
  field = "durationMinutes",
  optional = false,
): number | undefined {
  if (optional && (value === undefined || value === null || value === "")) {
    return undefined;
  }
  const duration = requireFiniteNumber(value, field);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1_440) {
    throw new CmsValidationError([
      `${field} must be an integer between 1 and 1440.`,
    ]);
  }
  return duration;
}

export function validatePublicationStatus(
  value: unknown,
): PublicationStatus {
  return requireEnum(value, PUBLICATION_STATUSES, "publicationStatus");
}

export function validateFacts(value: unknown): readonly PlaceFact[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new CmsValidationError(["facts must be an array with at most 50 items."]);
  }
  return value.map((fact, index) => {
    if (!fact || typeof fact !== "object") {
      throw new CmsValidationError([`facts[${index}] must be an object.`]);
    }
    const candidate = fact as Record<string, unknown>;
    return {
      label: requireText(candidate.label, `facts[${index}].label`, 120),
      value: requireText(candidate.value, `facts[${index}].value`, 500),
    };
  });
}

export function validateTagSlugs(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new CmsValidationError([
      "tagSlugs must be an array with at most 50 items.",
    ]);
  }
  return [...new Set(value.map((tag) => validateSlug(tag, "tag")))];
}

export function validateCityInput(value: CityInput): CityInput {
  const result: CityInput = {
    slug: validateSlug(value.slug),
    publicationStatus: validatePublicationStatus(value.publicationStatus),
    localizations: validateUniqueLocalizations(
      value.localizations,
      (localization) => ({
        locale: validateLocale(localization.locale),
        name: requireText(localization.name, "name", 200),
        shortDescription: optionalText(
          localization.shortDescription,
          "shortDescription",
          1_000,
        ),
      }),
    ),
  };
  validatePublicationRequirements(result.publicationStatus, result.localizations);
  return result;
}

export function validatePlaceInput(value: PlaceInput): PlaceInput {
  const coordinates = validateCoordinates(value.latitude, value.longitude);
  const status = value.status
    ? requireEnum(value.status, PLACE_STATUSES, "status")
    : undefined;
  const result: PlaceInput = {
    cityId: requirePositiveInteger(value.cityId, "cityId"),
    slug: validateSlug(value.slug),
    category: requireEnum(value.category, PLACE_CATEGORIES, "category"),
    ...coordinates,
    durationMinutes: validateDuration(value.durationMinutes) as number,
    environment: requireEnum(
      value.environment,
      PLACE_ENVIRONMENTS,
      "environment",
    ),
    pricing: requireEnum(value.pricing, PLACE_PRICING, "pricing"),
    status,
    statusVerifiedAt: optionalDate(value.statusVerifiedAt, "statusVerifiedAt"),
    visitNoteVerifiedAt: optionalDate(
      value.visitNoteVerifiedAt,
      "visitNoteVerifiedAt",
    ),
    visitNoteValidUntil: optionalDate(
      value.visitNoteValidUntil,
      "visitNoteValidUntil",
    ),
    image: optionalText(value.image, "image", 2_000),
    tagSlugs: validateTagSlugs(value.tagSlugs),
    publicationStatus: validatePublicationStatus(value.publicationStatus),
    localizations: validateUniqueLocalizations(
      value.localizations,
      (localization) => ({
        locale: validateLocale(localization.locale),
        name: requireText(localization.name, "name", 200),
        shortDescription: requireText(
          localization.shortDescription,
          "shortDescription",
          1_000,
        ),
        description: optionalText(localization.description, "description", 20_000),
        story: optionalText(localization.story, "story", 20_000),
        visitNotes: optionalText(localization.visitNotes, "visitNotes", 5_000),
        facts: validateFacts(localization.facts),
      }),
    ),
  };
  validatePublicationRequirements(result.publicationStatus, result.localizations);
  return result;
}

export function validateTourInput(value: TourInput): TourInput {
  const stops = value.stops.map((stop, index) => ({
    placeId: requirePositiveInteger(stop.placeId, `stops[${index}].placeId`),
    position: requirePositiveInteger(stop.position, `stops[${index}].position`),
    visitDurationMinutes: validateDuration(
      stop.visitDurationMinutes,
      `stops[${index}].visitDurationMinutes`,
      true,
    ),
  }));
  const positions = new Set(stops.map(({ position }) => position));
  const placeIds = new Set(stops.map(({ placeId }) => placeId));
  if (positions.size !== stops.length || placeIds.size !== stops.length) {
    throw new CmsValidationError([
      "Tour stops must use unique positions and places.",
    ]);
  }
  if (stops.some((stop, index) => stop.position !== index + 1)) {
    throw new CmsValidationError([
      "Tour stop positions must be contiguous and start at 1.",
    ]);
  }
  const result: TourInput = {
    cityId: requirePositiveInteger(value.cityId, "cityId"),
    slug: validateSlug(value.slug),
    publicationStatus: validatePublicationStatus(value.publicationStatus),
    estimatedDurationMinutes: validateDuration(
      value.estimatedDurationMinutes,
      "estimatedDurationMinutes",
      true,
    ),
    localizations: validateUniqueLocalizations(
      value.localizations,
      (localization) => ({
        locale: validateLocale(localization.locale),
        title: requireText(localization.title, "title", 200),
        shortDescription: optionalText(
          localization.shortDescription,
          "shortDescription",
          1_000,
        ),
        description: optionalText(localization.description, "description", 20_000),
      }),
    ),
    stops,
  };
  validatePublicationRequirements(result.publicationStatus, result.localizations);
  if (result.publicationStatus === "published" && stops.length === 0) {
    throw new CmsValidationError(["Published tours require at least one stop."]);
  }
  return result;
}

export function canTransitionPublication(
  current: PublicationStatus,
  next: PublicationStatus,
): boolean {
  return Boolean(getEditorialTransition(current, next));
}

function validatePublicationRequirements(
  status: PublicationStatus,
  localizations: readonly unknown[],
) {
  if (status !== "draft" && status !== "archived" && localizations.length === 0) {
    throw new CmsValidationError([
      "Published content requires at least one authored localization.",
    ]);
  }
}

function validateUniqueLocalizations<TInput, TOutput extends { locale: Locale }>(
  localizations: readonly TInput[],
  validate: (localization: TInput) => TOutput,
): readonly TOutput[] {
  if (!Array.isArray(localizations) || localizations.length > 27) {
    throw new CmsValidationError([
      "localizations must be an array with at most 27 items.",
    ]);
  }
  const result = localizations.map(validate);
  if (new Set(result.map(({ locale }) => locale)).size !== result.length) {
    throw new CmsValidationError(["Localization locales must be unique."]);
  }
  return result;
}

function validateLocale(value: unknown): Locale {
  if (!isLocale(value)) {
    throw new CmsValidationError(["locale is not supported by CITYWALK."]);
  }
  return value;
}

function requireText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string") {
    throw new CmsValidationError([`${field} must be text.`]);
  }
  const text = value.trim();
  if (!text || text.length > maximum) {
    throw new CmsValidationError([
      `${field} must contain 1 to ${maximum} characters.`,
    ]);
  }
  return text;
}

function optionalText(
  value: unknown,
  field: string,
  maximum: number,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireText(value, field, maximum);
}

function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new CmsValidationError([`${field} must use YYYY-MM-DD.`]);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new CmsValidationError([`${field} must be a real calendar date.`]);
  }
  return value;
}

function requireFiniteNumber(value: unknown, field: string): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(result)) {
    throw new CmsValidationError([`${field} must be a finite number.`]);
  }
  return result;
}

function requirePositiveInteger(value: unknown, field: string): number {
  const result = requireFiniteNumber(value, field);
  if (!Number.isInteger(result) || result < 1) {
    throw new CmsValidationError([`${field} must be a positive integer.`]);
  }
  return result;
}

function requireEnum<TValue extends string>(
  value: unknown,
  values: readonly TValue[],
  field: string,
): TValue {
  if (typeof value !== "string" || !values.includes(value as TValue)) {
    throw new CmsValidationError([`${field} has an unsupported value.`]);
  }
  return value as TValue;
}
