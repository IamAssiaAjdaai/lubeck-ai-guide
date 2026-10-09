import { isRequiredSourceValid } from "@/lib/admin/content/editorialWorkflow";
import type { AiContentQaInput } from "@/lib/contentQa/aiReview";
import type { ContentQaResult } from "@/lib/contentQa/types";

/**
 * Author-entered place facts and source links are untrusted draft copy.
 * They are never mapped to verifiedFacts or allowedFactIds.
 */
export type CmsQaPlace = Readonly<{
  localizations: readonly Readonly<{
    locale: string;
    name: string;
    shortDescription: string;
    description: string | null;
    story: string | null;
    visitNotes: string | null;
    facts: readonly Readonly<{ label: string; value: string }>[];
  }>[];
  sourceLinks: readonly Readonly<{
    required: boolean;
    source: Readonly<{ verifiedAt: string; validUntil: string | null }>;
  }>[];
}>;

export type CmsQaTour = Readonly<{
  localizations: readonly Readonly<{
    locale: string;
    title: string;
    shortDescription: string | null;
    description: string | null;
  }>[];
  estimatedDurationMinutes: number | null;
  stops: readonly Readonly<{
    placeId: number;
    position: number;
    visitDurationMinutes: number | null;
  }>[];
}>;

const factualAvailability = { opening_hours: "unavailable", price: "unavailable" } as const;

export function buildCmsPlaceQaInput(place: CmsQaPlace, locale: string): AiContentQaInput {
  const text = place.localizations.find((item) => item.locale === locale);
  return {
    contentType: "cms_place",
    requireEvidence: true,
    factAvailability: factualAvailability,
    fields: [
      { key: "name", label: "Place name", value: text?.name ?? "", required: true, maxLength: 200 },
      { key: "shortDescription", label: "Short description", value: text?.shortDescription ?? "", required: true, maxLength: 400 },
      { key: "description", label: "Description", value: text?.description, maxLength: 5000 },
      { key: "story", label: "Story", value: text?.story, maxLength: 5000 },
      { key: "visitNotes", label: "Visit notes", value: text?.visitNotes, maxLength: 1500 },
      ...(text?.facts ?? []).slice(0, 10).map((fact, i) => ({
        key: "fact_" + i,
        label: "Editor-entered fact " + (i + 1),
        value: fact.label + ": " + fact.value,
        maxLength: 600,
      })),
    ],
  };
}

export function buildCmsTourQaInput(tour: CmsQaTour, locale: string): AiContentQaInput {
  const text = tour.localizations.find((item) => item.locale === locale);
  return {
    contentType: "cms_tour",
    requireEvidence: true,
    factAvailability: factualAvailability,
    fields: [
      { key: "title", label: "Walk title", value: text?.title ?? "", required: true, maxLength: 200 },
      { key: "shortDescription", label: "Short description", value: text?.shortDescription, maxLength: 400 },
      { key: "description", label: "Description", value: text?.description, maxLength: 5000 },
    ],
  };
}

export function checkCmsPlaceQa(
  place: CmsQaPlace,
  today: Date = new Date(),
): ContentQaResult[] {
  if (!place.sourceLinks.length) return [{
    severity: "warning",
    checkId: "sources.missing",
    message: "No source is linked to this place. Draft factual copy needs human source verification.",
    origin: "deterministic",
  }];
  if (place.sourceLinks.some((link) => link.required && !isRequiredSourceValid(link.source, today))) {
    return [{
      severity: "warning",
      checkId: "sources.stale_required",
      message: "A required linked source is expired, invalid or verified in the future.",
      origin: "deterministic",
    }];
  }
  return [];
}

export function checkCmsTourQa(tour: CmsQaTour): ContentQaResult[] {
  const findings: ContentQaResult[] = [];
  if (tour.stops.length === 0) findings.push({
    severity: "warning",
    checkId: "tour.stops_missing",
    message: "This walk has no stops. Add at least one stop before requesting approval.",
    origin: "deterministic",
  });

  // Explicit stop visits provide a conservative *lower bound*: travel time is
  // not included and is not inferred.
  const minimumStopMinutes = tour.stops.reduce((sum, stop) =>
    sum + (stop.visitDurationMinutes ?? 0), 0);
  if (tour.estimatedDurationMinutes !== null &&
      minimumStopMinutes > tour.estimatedDurationMinutes) {
    findings.push({
      severity: "warning",
      checkId: "tour.duration_conflict",
      message: "Explicit stop visits alone exceed the estimated walk duration; walking time is not included.",
      affectedField: "estimatedDurationMinutes",
      origin: "deterministic",
    });
  }
  return findings;
}
