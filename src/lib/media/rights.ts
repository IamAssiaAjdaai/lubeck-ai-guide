import { MediaValidationError } from "@/lib/media/types";

export const MEDIA_RIGHTS_BASES = [
  "owned",
  "commissioned",
  "licensed",
  "creative_commons",
  "public_domain",
  "partner_supplied",
  "other",
] as const;

export type MediaRightsBasis = (typeof MEDIA_RIGHTS_BASES)[number];
export type MediaRightsStatus = "incomplete" | "unverified" | "verified";

export type MediaRightsInput = Readonly<{
  rightsBasis: MediaRightsBasis;
  creator?: string | null;
  rightsHolder?: string | null;
  attributionRequired: boolean;
  attributionText?: string | null;
  evidenceReference?: string | null;
  rightsNotes?: string | null;
}>;

export type MediaRightsEvidence = MediaRightsInput & Readonly<{
  verifiedAt?: Date | null;
  verifiedByUserId?: string | null;
}>;

export function parseMediaRightsInput(input: Readonly<{
  rightsBasis: unknown;
  creator?: unknown;
  rightsHolder?: unknown;
  attributionRequired?: unknown;
  attributionText?: unknown;
  evidenceReference?: unknown;
  rightsNotes?: unknown;
}>): MediaRightsInput {
  if (!isMediaRightsBasis(input.rightsBasis)) {
    throw new MediaValidationError("Select a valid rights basis.");
  }

  const evidenceReference = optionalText(
    input.evidenceReference,
    "Rights evidence",
    2_000,
  );
  if (evidenceReference && hasInvalidUrlSemantics(evidenceReference)) {
    throw new MediaValidationError(
      "Rights evidence URLs must use a valid HTTP or HTTPS URL.",
    );
  }

  return {
    rightsBasis: input.rightsBasis,
    creator: optionalText(input.creator, "Creator", 500),
    rightsHolder: optionalText(input.rightsHolder, "Rights holder", 500),
    attributionRequired: input.attributionRequired === true,
    attributionText: optionalText(input.attributionText, "Attribution text", 1_000),
    evidenceReference,
    rightsNotes: optionalText(input.rightsNotes, "Rights notes", 2_000),
  };
}

export function getMediaRightsValidationIssues(
  evidence: MediaRightsEvidence,
): readonly string[] {
  const issues: string[] = [];

  if (!isMediaRightsBasis(evidence.rightsBasis)) {
    issues.push("rights_basis_missing");
  }
  const evidenceReference = evidence.evidenceReference?.trim();
  if (!evidenceReference) {
    issues.push("rights_evidence_missing");
  } else if (hasInvalidUrlSemantics(evidenceReference)) {
    issues.push("rights_evidence_url_invalid");
  }
  if (
    evidence.rightsBasis !== "public_domain" &&
    !evidence.creator?.trim() &&
    !evidence.rightsHolder?.trim()
  ) {
    issues.push("creator_or_rights_holder_missing");
  }
  if (evidence.attributionRequired && !evidence.attributionText?.trim()) {
    issues.push("required_attribution_missing");
  }
  if (evidence.rightsBasis === "other" && !evidence.rightsNotes?.trim()) {
    issues.push("other_rights_basis_notes_missing");
  }

  return issues;
}

export function getMediaRightsStatus(
  evidence: MediaRightsEvidence | null | undefined,
): MediaRightsStatus {
  if (!evidence) return "unverified";
  if (getMediaRightsValidationIssues(evidence).length > 0) {
    return "incomplete";
  }
  return evidence.verifiedAt && evidence.verifiedByUserId?.trim()
    ? "verified"
    : "unverified";
}

export function isMediaRightsCleared(
  evidence: MediaRightsEvidence | null | undefined,
): boolean {
  return getMediaRightsStatus(evidence) === "verified";
}

export function assertMediaRightsCanBeVerified(
  evidence: MediaRightsEvidence,
): void {
  const issues = getMediaRightsValidationIssues(evidence);
  if (issues.length > 0) {
    throw new MediaValidationError(
      `Rights metadata is incomplete: ${issues.join(", ")}.`,
    );
  }
}

export function isMediaRightsBasis(value: unknown): value is MediaRightsBasis {
  return MEDIA_RIGHTS_BASES.some((basis) => basis === value);
}

function optionalText(
  value: unknown,
  label: string,
  maximumLength: number,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new MediaValidationError(`${label} must be text.`);
  }
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!normalized) return undefined;
  if (normalized.length > maximumLength) {
    throw new MediaValidationError(`${label} is too long.`);
  }
  return normalized;
}

function hasInvalidUrlSemantics(value: string): boolean {
  if (!/^https?:/i.test(value) && !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return !["http:", "https:"].includes(parsed.protocol) || !parsed.hostname;
  } catch {
    return true;
  }
}
