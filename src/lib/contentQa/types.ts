export const CONTENT_QA_SEVERITIES = ["info", "warning", "error"] as const;
export type ContentQaSeverity = (typeof CONTENT_QA_SEVERITIES)[number];

export const CONTENT_QA_ORIGINS = ["deterministic", "ai_assisted"] as const;
export type ContentQaOrigin = (typeof CONTENT_QA_ORIGINS)[number];

export type ContentQaEvidence = Readonly<{
  kind: "field" | "source_fact" | "comparison";
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

export type ContentQaField = Readonly<{
  key: string;
  label?: string;
  value?: string | null;
  required?: boolean;
  maxLength?: number;
}>;

export type ContentQaClaim = Readonly<{
  id: string;
  text: string;
  affectedField?: string;
  sourceFactIds?: readonly string[];
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
  fields?: readonly ContentQaField[];
  claims?: readonly ContentQaClaim[];
  /**
   * IDs from the bounded, verified fact package supplied to QA.
   *
   * Undefined means the evidence package is unavailable, which must fail
   * safely instead of treating factual claims as supported.
   */
  allowedFactIds?: readonly string[];
  duplicateChecks?: readonly ContentQaDuplicateCheck[];
}>;
