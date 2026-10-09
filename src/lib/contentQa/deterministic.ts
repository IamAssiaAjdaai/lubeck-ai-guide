import type {
  ContentQaDuplicateCheck,
  ContentQaResult,
  DeterministicContentQaInput,
} from "@/lib/contentQa/types";

const DEFAULT_DUPLICATE_THRESHOLD = 0.86;
const MIN_NEAR_DUPLICATE_TOKENS = 5;

export function runDeterministicContentQa(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  return [
    ...checkRequiredAndLength(input),
    ...checkClaimEvidence(input),
    ...checkDuplicateCopy(input.duplicateChecks ?? []),
  ];
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

    if (
      field.maxLength !== undefined &&
      field.maxLength >= 0 &&
      Array.from(value).length > field.maxLength
    ) {
      results.push({
        severity: "warning",
        checkId: "field.too_long",
        message: `${label} is longer than the configured ${field.maxLength}-character limit.`,
        affectedField: field.key,
        evidence: [{ kind: "field", id: field.key, label }],
        origin: "deterministic",
      });
    }
  }

  return results;
}

function checkClaimEvidence(
  input: DeterministicContentQaInput,
): ContentQaResult[] {
  const claims = input.claims ?? [];
  if (claims.length === 0) return [];

  if (input.allowedFactIds === undefined) {
    return [
      {
        severity: "warning",
        checkId: "facts.evidence_unavailable",
        message:
          "Verified fact evidence is unavailable, so factual support could not be checked.",
        origin: "deterministic",
      },
    ];
  }

  const allowed = new Set(input.allowedFactIds);
  const results: ContentQaResult[] = [];

  for (const claim of claims) {
    const sourceFactIds = uniqueNonEmpty(claim.sourceFactIds ?? []);

    if (sourceFactIds.length === 0) {
      results.push({
        severity: "warning",
        checkId: "facts.claim_without_evidence",
        message: "A factual claim has no verified fact reference.",
        ...(claim.affectedField ? { affectedField: claim.affectedField } : {}),
        origin: "deterministic",
      });
      continue;
    }

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

  return results;
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
