import { normalizeCanonicalSourceUrl } from "@/lib/admin/content/editorialWorkflow";
import { CmsValidationError } from "@/lib/admin/content/validation";

export type ContentSourceInput = Readonly<{
  publisher: string;
  title: string;
  canonicalUrl: string;
  verifiedAt: string;
  validUntil?: string;
  notes?: string;
}>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateContentSourceInput(
  input: ContentSourceInput,
): ContentSourceInput {
  const verifiedAt = requireDate(input.verifiedAt, "verifiedAt");
  const validUntil = input.validUntil
    ? requireDate(input.validUntil, "validUntil")
    : undefined;
  if (validUntil && validUntil < verifiedAt) {
    throw new CmsValidationError(["validUntil cannot be before verifiedAt."]);
  }
  let canonicalUrl: string;
  try {
    canonicalUrl = normalizeCanonicalSourceUrl(input.canonicalUrl);
  } catch {
    throw new CmsValidationError(["canonicalUrl must be a valid HTTP or HTTPS URL."]);
  }
  return {
    publisher: requireText(input.publisher, "publisher", 200),
    title: requireText(input.title, "title", 300),
    canonicalUrl,
    verifiedAt,
    validUntil,
    notes: optionalText(input.notes, "notes", 2_000),
  };
}

function requireDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new CmsValidationError([`${field} must use YYYY-MM-DD.`]);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new CmsValidationError([`${field} must be a real calendar date.`]);
  }
  return value;
}

function requireText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string") {
    throw new CmsValidationError([`${field} must be text.`]);
  }
  const text = value.trim();
  if (!text || text.length > maximum) {
    throw new CmsValidationError([`${field} must contain 1 to ${maximum} characters.`]);
  }
  return text;
}

function optionalText(value: unknown, field: string, maximum: number) {
  if (value === undefined || value === "") return undefined;
  return requireText(value, field, maximum);
}
