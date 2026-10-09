import "server-only";

import { consumeDatabaseRateLimit } from "@/lib/databaseRateLimit.server";

import {
  prepareAiContentQaReview,
  reviewContentWithAi,
  type AiContentQaInput,
  type AiContentQaPrompt,
  type AiContentQaReport,
} from "./aiReview";
import { runDeterministicContentQa } from "./deterministic";
import type { ContentQaResult } from "./types";

/**
 * Optional server-only integration. OFF by default:
 * CITYWALK_CONTENT_QA_AI_ENABLED=true AND GROQ_API_KEY must both be set.
 * No route or client code calls this in this PR.
 *
 * A future CMS caller MUST derive actorId from authenticated staff session,
 * enforce admin review capabilities and never use a user-supplied actor ID.
 */
const MODEL = "openai/gpt-oss-20b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MAX_OUTPUT_TOKENS = 768;
const MAX_PROVIDER_PROMPT_CHARS = 12_000;
const MAX_PROVIDER_RESPONSE_CHARS = 32_000;
const TIMEOUT_MS = 10_000;
const TEN_MINUTES = 10 * 60_000;
const ONE_DAY = 24 * 60 * 60_000;

export const CONTENT_QA_GROQ_LIMITS = Object.freeze({
  model: MODEL,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  timeoutMs: TIMEOUT_MS,
  actorRequestsPerTenMinutes: 3,
  actorRequestsPerDay: 12,
  globalRequestsPerDay: 60,
});

/** Reuses atomic PostgreSQL event limits; no new persistence or migrations. */
export type ContentQaLimitInput = Readonly<{
  scope: string;
  identifier: string;
  maxRequests: number;
  windowMs: number;
}>;

export type GroqContentQaDependencies = Readonly<{
  enabled: boolean;
  apiKey?: string;
  consumeLimit: (input: ContentQaLimitInput) => Promise<{ success: boolean }>;
  complete: (prompt: AiContentQaPrompt, apiKey: string) => Promise<unknown>;
}>;

function skipped(
  input: AiContentQaInput,
  checkId: string,
  message: string,
): AiContentQaReport {
  const finding: ContentQaResult = {
    severity: "warning",
    checkId,
    message,
    origin: "deterministic",
  };
  return {
    findings: [...runDeterministicContentQa(input), finding],
    aiStatus: "skipped",
    factualCertification: "not_certified",
  };
}

/**
 * Testable boundary: no provider call unless evidence, feature gate, principal
 * and ALL shared budget gates pass. Budget events are consumed before attempts,
 * including failed provider calls, to prevent costly retry storms.
 *
 * Request ceilings bound potential spending; they are NOT an exact currency
 * budget or cost certification. Billing remains disabled until explicitly set up.
 */
export function createBudgetedGroqContentQaReviewer(
  dependencies: GroqContentQaDependencies,
) {
  return async function review(
    input: AiContentQaInput,
    actorId: string,
  ): Promise<AiContentQaReport> {
    const prepared = prepareAiContentQaReview(input);
    if (!prepared.ready) {
      return skipped(input, prepared.finding.checkId, prepared.finding.message);
    }
    if (!dependencies.enabled) {
      return skipped(input, "ai.disabled", "AI content QA is disabled; manual review is required.");
    }
    if (!dependencies.apiKey?.trim()) {
      return skipped(input, "ai.not_configured", "AI content QA is not configured; manual review is required.");
    }
    if (
      !actorId ||
      actorId.trim() !== actorId ||
      actorId.length > 128
    ) {
      return skipped(input, "ai.invalid_actor", "An authenticated staff identity is required for AI review.");
    }

    if (
      prepared.prompt.system.length + prepared.prompt.user.length >
      MAX_PROVIDER_PROMPT_CHARS
    ) {
      return skipped(input, "ai.provider_input_too_long", "AI review input exceeds the provider budget limit.");
    }

    try {
      for (const limit of [
        {
          scope: "citywalk-content-qa-actor-10m",
          identifier: actorId,
          maxRequests: CONTENT_QA_GROQ_LIMITS.actorRequestsPerTenMinutes,
          windowMs: TEN_MINUTES,
        },
        {
          scope: "citywalk-content-qa-actor-day",
          identifier: actorId,
          maxRequests: CONTENT_QA_GROQ_LIMITS.actorRequestsPerDay,
          windowMs: ONE_DAY,
        },
        {
          scope: "citywalk-content-qa-global-day",
          identifier: "all-staff",
          maxRequests: CONTENT_QA_GROQ_LIMITS.globalRequestsPerDay,
          windowMs: ONE_DAY,
        },
      ] satisfies ContentQaLimitInput[]) {
        const outcome = await dependencies.consumeLimit(limit);
        if (!outcome.success) {
          return skipped(input, "ai.rate_limited", "AI review allowance was reached; manual review is still available.");
        }
      }
    } catch {
      // Never fail open if rate limiter's PostgreSQL or secret is unavailable.
      return skipped(input, "ai.rate_limit_unavailable", "AI review allowance could not be verified; manual review is required.");
    }

    return reviewContentWithAi(input, (prompt) =>
      dependencies.complete(prompt, dependencies.apiKey!));
  };
}

export const reviewContentWithGroq = createBudgetedGroqContentQaReviewer({
  enabled: process.env.CITYWALK_CONTENT_QA_AI_ENABLED === "true",
  apiKey: process.env.GROQ_API_KEY,
  consumeLimit: consumeDatabaseRateLimit,
  complete: sendGroqContentQaCompletion,
});

/**
 * No retries. Fixed endpoint/model, no browsing/tools, JSON mode, bounded output,
 * non-streaming and strict timeout. This function never logs request or response.
 */
export async function sendGroqContentQaCompletion(
  prompt: AiContentQaPrompt,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  if (!apiKey?.trim()) throw new Error("CONTENT_QA_PROVIDER_UNAVAILABLE");
  if (
    prompt.system.length + prompt.user.length > MAX_PROVIDER_PROMPT_CHARS
  ) throw new Error("CONTENT_QA_PROMPT_TOO_LONG");

  const response = await fetcher(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error("CONTENT_QA_PROVIDER_UNAVAILABLE");
  const length = response.headers.get("content-length");
  if (length && Number(length) > MAX_PROVIDER_RESPONSE_CHARS) {
    throw new Error("CONTENT_QA_PROVIDER_RESPONSE_TOO_LONG");
  }
  const raw = await response.text();
  if (raw.length > MAX_PROVIDER_RESPONSE_CHARS) {
    throw new Error("CONTENT_QA_PROVIDER_RESPONSE_TOO_LONG");
  }
  const json: unknown = JSON.parse(raw);
  if (typeof json !== "object" || json === null || !("choices" in json)) {
    throw new Error("CONTENT_QA_PROVIDER_INVALID");
  }
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length !== 1) {
    throw new Error("CONTENT_QA_PROVIDER_INVALID");
  }
  const choice: unknown = choices[0];
  if (
    typeof choice !== "object" ||
    choice === null ||
    !("finish_reason" in choice) ||
    choice.finish_reason !== "stop" ||
    !("message" in choice)
  ) throw new Error("CONTENT_QA_PROVIDER_INVALID");
  const message: unknown = choice.message;
  if (
    typeof message !== "object" ||
    message === null ||
    !("content" in message) ||
    typeof message.content !== "string"
  ) throw new Error("CONTENT_QA_PROVIDER_INVALID");
  return message.content;
}
