export const CONTENT_QA_SEVERITIES = ["info", "warning", "error"] as const;
export type ContentQaSeverity = (typeof CONTENT_QA_SEVERITIES)[number];

export const CONTENT_QA_ORIGINS = ["deterministic", "ai_assisted"] as const;
export type ContentQaOrigin = (typeof CONTENT_QA_ORIGINS)[number];

export type ContentQaEvidence = Readonly<{
  kind: "field" | "source_fact" | "source" | "claim" | "comparison";
  id: string;
  label?: string;
}>;

export type ContentQaResult = Readonly<{
  severity: ContentQaSeverity;
  checkId: string;
  message: string;
  affectedField?: string;
  evidence?: readonly ContentQaEvidence[];
  origin: ContentQaOrigin;
}>;

export type ContentQaReport = Readonly<{
  findings: readonly ContentQaResult[];
  /** A deterministic QA run never verifies that all factual claims are true. */
  factualCertification: "not_certified";
}>;

export type ContentQaField = Readonly<{
  key: string;
  label?: string;
  value?: string | null;
  required?: boolean;
  maxLength?: number;
  role?: "cta";
}>;

export type ContentQaFactCategory = "price" | "opening_hours";
export type ContentQaFactAvailability = "available" | "unavailable" | "unknown";

export type ContentQaClaim = Readonly<{
  id: string;
  text: string;
  kind?: ContentQaFactCategory | "general";
  affectedField?: string;
  sourceFactIds?: readonly string[];
  sourceReferenceIds?: readonly string[];
}>;

export type ContentQaSourceReference = Readonly<{
  id: string;
  label?: string;
  url?: string;
}>;

export type ContentQaBrandRules = Readonly<{
  /** Applies only to fields explicitly marked with role: "cta". */
  minCtaCharacters?: number;
  weakCtaPhrases?: readonly string[];
  forbiddenPhrases?: readonly string[];
}>;

export type ContentQaComparisonText = Readonly<{
  id: string;
  text: string;
  label?: string;
}>;

export type ContentQaDuplicateCheck = Readonly<{
  field: string;
  value: string;
  compareAgainst: readonly ContentQaComparisonText[];
  threshold?: number;
}>;

export type DeterministicContentQaInput = Readonly<{
  /** Informational only: no CITYWALK-specific content schema is required. */
  contentType?: string;
  fields?: readonly ContentQaField[];
  /** Overrides field-level maxLength only when the field has no own limit. */
  lengthConstraints?: Readonly<Record<string, number>>;
  brandRules?: ContentQaBrandRules;
  claims?: readonly ContentQaClaim[];
  /**
   * IDs from the bounded, verified fact package supplied to QA.
   * Undefined means the package is unavailable, not that claims are verified.
   * Matching an ID only verifies its presence, never the truth of the text.
   */
  allowedFactIds?: readonly string[];
  sourceReferences?: readonly ContentQaSourceReference[];
  /**
   * Only explicit "unavailable" states trigger price/hours suspicion checks.
   * "unknown" and omitted categories cannot be interpreted as false claims.
   */
  factAvailability?: Readonly<
    Partial<Record<ContentQaFactCategory, ContentQaFactAvailability>>
  >;
  /** Opt in when the content type requires facts even if no claims were enumerated. */
  requireEvidence?: boolean;
  duplicateChecks?: readonly ContentQaDuplicateCheck[];
}>;
