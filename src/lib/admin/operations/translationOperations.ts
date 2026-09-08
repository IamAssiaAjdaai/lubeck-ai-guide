import type { PlaceRevisionLocalization } from "@/lib/admin/content/placeRevision";
import type { Locale } from "@/lib/i18n";

export const TRANSLATION_FOCUS_LOCALES = [
  "de",
  "en",
  "da",
  "nl",
  "sv",
  "fr",
  "tr",
] as const satisfies readonly Locale[];

export const TRANSLATION_FIELDS = [
  "overall",
  "name",
  "shortDescription",
  "description",
  "story",
  "facts",
  "visitNotes",
] as const;

export type TranslationField = (typeof TRANSLATION_FIELDS)[number];
export type TranslationState =
  | "missing"
  | "published"
  | "draft"
  | "in_review"
  | "approved";

export type TranslationCompleteness = Readonly<{
  requiredComplete: boolean;
  fields: Readonly<Record<Exclude<TranslationField, "overall">, boolean>>;
}>;

type WorkingLocalization = Readonly<{
  locale: string;
  name: string;
  shortDescription: string;
  description: string | null;
  story: string | null;
  visitNotes: string | null;
  facts: readonly unknown[];
}>;

export function getTranslationCompleteness(
  localization: WorkingLocalization | PlaceRevisionLocalization | undefined,
): TranslationCompleteness {
  const fields = {
    name: hasText(localization?.name),
    shortDescription: hasText(localization?.shortDescription),
    description: hasText(localization?.description),
    story: hasText(localization?.story),
    facts: Boolean(localization?.facts.length),
    visitNotes: hasText(localization?.visitNotes),
  };
  return {
    requiredComplete: fields.name && fields.shortDescription,
    fields,
  };
}

export function deriveTranslationState(input: Readonly<{
  working?: WorkingLocalization;
  published?: PlaceRevisionLocalization;
  placeStatus: string;
}>): TranslationState {
  if (!input.working) return "missing";
  if (
    input.published &&
    canonicalLocalization(input.working) === canonicalLocalization(input.published)
  ) {
    return "published";
  }
  if (input.placeStatus === "in_review") return "in_review";
  if (input.placeStatus === "approved") return "approved";
  return "draft";
}

export function translationNeedsAttention(
  state: TranslationState,
  completeness: TranslationCompleteness,
  field: TranslationField,
): boolean {
  if (state === "missing") return true;
  if (field === "overall") {
    return state !== "published" || !completeness.requiredComplete;
  }
  return !completeness.fields[field] || state !== "published";
}

export function translationEditorHref(placeId: number, locale: Locale): string {
  return `/admin/places/${placeId}?locale=${locale}`;
}

function canonicalLocalization(
  localization: WorkingLocalization | PlaceRevisionLocalization,
): string {
  return stableJson({
    locale: localization.locale,
    name: normalizeText(localization.name),
    shortDescription: normalizeText(localization.shortDescription),
    description: normalizeText(localization.description),
    story: normalizeText(localization.story),
    facts: localization.facts,
    visitNotes: normalizeText(localization.visitNotes),
  });
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\r\n?/g, "\n") ?? "";
}

function hasText(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
