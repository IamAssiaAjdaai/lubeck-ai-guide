import type {
  ContentQaDuplicateCheck,
  ContentQaField,
  ContentQaReport,
  ContentQaResult,
  DeterministicContentQaInput,
} from "@/lib/contentQa/types";

const DEFAULT_DUPLICATE_THRESHOLD = 0.86;
const MIN_NEAR_DUPLICATE_TOKENS = 5;
const DEFAULT_MIN_CTA_CHARACTERS = 6;
const DEFAULT_WEAK_CTA_PHRASES = ["click here", "learn more", "read more"];
const PRICE_PATTERN =
  /(?:[$€£]\s*\d|\b(?:EUR|USD|GBP)\s*\d|\b\d+(?:[.,]\d+)?\s*(?:€|£|\bEUR\b|\bUSD\b|\bGBP\b))/iu;
const OPENING_HOURS_PATTERN =
  /\b(?:[01]?\d|2[0-3])[:.][0-5]\d\s*[-–—]\s*(?:[01]?\d|2[0-3])[:.][0-5]\d\b|\b24\s*\/\s*7\b/iu;

/**
 * Deterministic findings only. An empty array is NOT proof of factual accuracy:
 * the caller must supply/identify claims and a bounded verified-fact package.
 */
export function runDeterministicContentQa(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  return [
    ...checkRequiredAndLength(input),
    ...checkCtaAndBrandRules(input),
    ...checkClaimEvidence(input),
    ...checkUnavailableFactClaims(input),
    ...checkDuplicateCopy(input.duplicateChecks ?? []),
  ];
}

/** Use this wrapper when a UI needs an explicit no-certification signal. */
export function evaluateDeterministicContentQa(
  input: DeterministicContentQaInput,
): ContentQaReport {
  return {
    findings: runDeterministicContentQa(input),
    factualCertification: "not_certified",
  };
}

function checkRequiredAndLength(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  const results: ContentQaResult[] = [];

  for (const field of input.fields ?? []) {
    const value = field.value ?? "";
    const label = field.label ?? field.key;

    if (field.required && value.trim().length === 0) {
      results.push({
        severity: "error",
        checkId: "field.required",
        message: `${label} is required.`,
        affectedField: field.key,
        evidence: [{ kind: "field", id: field.key, label }],
        origin: "deterministic",
      });
      continue;
    }

    const maxLength = field.maxLength ?? input.lengthConstraints?.[field.key];
    if (
      maxLength !== undefined &&
      Number.isFinite(maxLength) &&
      maxLength >= 0 &&
      Array.from(value).length > maxLength
    ) {
      results.push({
        severity: "warning",
        checkId: "field.too_long",
        message: `${label} is longer than the configured ${maxLength}-character limit.`,
        affectedField: field.key,
        evidence: [{ kind: "field", id: field.key, label }],
        origin: "deterministic",
      });
    }
  }

  return results;
}

function checkCtaAndBrandRules(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  const results: ContentQaResult[] = [];
  const minimum = input.brandRules?.minCtaCharacters;
  const minCtaCharacters =
    minimum !== undefined && Number.isFinite(minimum) && minimum >= 1
      ? minimum
      : DEFAULT_MIN_CTA_CHARACTERS;
  const weakPhrases = new Set([
    ...DEFAULT_WEAK_CTA_PHRASES,
    ...(input.brandRules?.weakCtaPhrases ?? []),
  ].map(normalizeText).filter(Boolean));

  for (const field of input.fields ?? []) {
    const value = field.value ?? "";
    if (field.role === "cta" && !value.trim()) {
      // Required fields are already reported as errors.
      if (!field.required) {
        results.push(fieldFinding("cta.empty", "The CTA is empty.", field));
      }
    } else if (field.role === "cta") {
      const normalized = normalizeText(value);
      if (
        Array.from(normalized).length < minCtaCharacters ||
        weakPhrases.has(normalized)
      ) {
        results.push(
          fieldFinding("cta.weak", "The CTA is empty of actionable detail or too generic.", field),
        );
      }
    }

    const normalized = ` ${normalizeText(value)} `;
    for (const phrase of input.brandRules?.forbiddenPhrases ?? []) {
      const forbidden = normalizeText(phrase);
      if (!forbidden || !normalized.includes(` ${forbidden} `)) continue;
      results.push(
        fieldFinding(
          "brand.forbidden_phrase",
          "Content contains a phrase disallowed by the supplied brand rules.",
          field,
        ),
      );
      break;
    }
  }

  return results;
}

function checkClaimEvidence(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  const claims = input.claims ?? [];
  const missingEvidence = !input.allowedFactIds?.length;
  const results: ContentQaResult[] = [];

  if (input.requireEvidence && missingEvidence && (claims.length === 0 || input.allowedFactIds !== undefined)) {
    results.push({
      severity: "warning",
      checkId: "facts.insufficient_evidence",
      message: "This content requires verified facts, but no verified fact references were supplied.",
      origin: "deterministic",
    });
  }

  if (claims.length === 0) return results;

  if (input.allowedFactIds === undefined) {
    results.push({
      severity: "warning",
      checkId: "facts.evidence_unavailable",
      message:
        "Verified fact evidence is unavailable, so factual support could not be checked.",
      origin: "deterministic",
    });
    return results;
  }

  const allowed = new Set(input.allowedFactIds);
  const sources = input.sourceReferences
    ? new Set(input.sourceReferences.map((source) => source.id))
    : undefined;

  for (const claim of claims) {
    const sourceFactIds = uniqueNonEmpty(claim.sourceFactIds ?? []);

    if (sourceFactIds.length === 0) {
      results.push({
        severity: "warning",
        checkId: "facts.claim_without_evidence",
        message: "A factual claim has no verified fact reference.",
        ...(claim.affectedField ? { affectedField: claim.affectedField } : {}),
        evidence: [{ kind: "claim", id: claim.id }],
        origin: "deterministic",
      });
    } else {
      const unknownIds = sourceFactIds.filter((id) => !allowed.has(id));
      if (unknownIds.length > 0) {
        results.push({
          severity: "error",
          checkId: "facts.unknown_evidence_reference",
          message:
            "A factual claim references evidence outside the supplied verified fact package.",
          ...(claim.affectedField ? { affectedField: claim.affectedField } : {}),
          evidence: unknownIds.map((id) => ({ kind: "source_fact" as const, id })),
          origin: "deterministic",
        });
      }
    }

    const claimedSources = uniqueNonEmpty(claim.sourceReferenceIds ?? []);
    if (claimedSources.length === 0) continue;
    if (!sources) {
      results.push({
        severity: "warning",
        checkId: "facts.sources_unavailable",
        message: "Source references were cited but no bounded source package was supplied.",
        ...(claim.affectedField ? { affectedField: claim.affectedField } : {}),
        origin: "deterministic",
      });
      continue;
    }

    const unknownSources = claimedSources.filter((id) => !sources.has(id));
    if (unknownSources.length > 0) {
      results.push({
        severity: "error",
        checkId: "facts.unknown_source_reference",
        message: "A claim references a source outside the supplied source package.",
        ...(claim.affectedField ? { affectedField: claim.affectedField } : {}),
        evidence: unknownSources.map((id) => ({ kind: "source" as const, id })),
        origin: "deterministic",
      });
    }
  }

  return results;
}

function checkUnavailableFactClaims(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  const results: ContentQaResult[] = [];
  const taggedFields = new Set<string>();

  // Claims should be supplied by the caller, not inferred by an LLM here.
  for (const claim of input.claims ?? []) {
    if (
      (claim.kind !== "price" && claim.kind !== "opening_hours") ||
      input.factAvailability?.[claim.kind] !== "unavailable"
    ) continue;

    if (claim.affectedField) taggedFields.add(`${claim.kind}:${claim.affectedField}`);
    results.push({
      severity: "warning",
      checkId: `facts.${claim.kind}_unavailable`,
      message: `A ${claim.kind.replace("_", " ")} claim appears although bounded verified facts for it are unavailable.`,
      ...(claim.affectedField ? { affectedField: claim.affectedField } : {}),
      evidence: [{ kind: "claim", id: claim.id }],
      origin: "deterministic",
    });
  }

  // Conservative, deterministic patterns only: no claim of exhaustive NLP.
  for (const field of input.fields ?? []) {
    const value = field.value ?? "";
    for (const [kind, pattern] of [
      ["price", PRICE_PATTERN],
      ["opening_hours", OPENING_HOURS_PATTERN],
    ] as const) {
      if (
        input.factAvailability?.[kind] !== "unavailable" ||
        taggedFields.has(`${kind}:${field.key}`) ||
        !pattern.test(value)
      ) continue;

      results.push(
        fieldFinding(
          `facts.${kind}_unavailable`,
          `Potential ${kind.replace("_", " ")} copy appears although bounded verified facts for it are unavailable.`,
          field,
        ),
      );
    }
  }
  return results;
}

function fieldFinding(
  checkId: string,
  message: string,
  field: ContentQaField,
): ContentQaResult {
  return {
    severity: "warning",
    checkId,
    message,
    affectedField: field.key,
    evidence: [{ kind: "field", id: field.key, ...(field.label ? { label: field.label } : {}) }],
    origin: "deterministic",
  };
}

function checkDuplicateCopy(
  checks: readonly ContentQaDuplicateCheck[],
): ContentQaResult[] {
  const results: ContentQaResult[] = [];

  for (const check of checks) {
    const threshold = normalizeThreshold(check.threshold);
    for (const comparison of check.compareAgainst) {
      const similarity = textSimilarity(check.value, comparison.text);
      if (similarity < threshold) continue;

      results.push({
        severity: "warning",
        checkId: "copy.near_duplicate",
        message: "This copy is very similar to existing content.",
        affectedField: check.field,
        evidence: [
          {
            kind: "comparison",
            id: comparison.id,
            ...(comparison.label ? { label: comparison.label } : {}),
          },
        ],
        origin: "deterministic",
      });
      break;
    }
  }

  return results;
}

export function textSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const leftTokens = tokenize(normalizedLeft);
  const rightTokens = tokenize(normalizedRight);
  if (
    leftTokens.length < MIN_NEAR_DUPLICATE_TOKENS ||
    rightTokens.length < MIN_NEAR_DUPLICATE_TOKENS
  ) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function normalizeThreshold(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_DUPLICATE_THRESHOLD;
  }
  return Math.min(1, Math.max(0, value));
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
