import {
  resolveWalkGuideContext,
  toWalkGuidePromptContext,
} from "@/lib/walk/guideContext";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import {
  getPublicCitySnapshot,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { getContentSource } from "@/lib/content/source";
import {
  buildGuideSourceMetadata,
  GUIDE_KNOWLEDGE_SOURCE_LOCALE,
  GUIDE_RESPONSE_FORMAT,
  parseGuideStructuredAnswer,
  retrieveGuideKnowledge,
} from "@/lib/guideKnowledge.server";
import { buildGuideSystemPrompt } from "@/lib/guidePrompt.server";
import { getTranslations, isLocale } from "@/lib/i18n";
import { aiGuideGlobalProviderBudget, aiGuideRateLimit } from "@/lib/rateLimit";
import { getTrustedGuideAbuseIdentifier } from "@/lib/guideRequestIdentity.server";
import { enforceGuideDailyAllowance } from "@/lib/guideAllowance.server";
import { resolveTourContext } from "@/lib/tourContext.server";
import { getVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";
import { emitOperationalFailure } from "@/lib/operations/operationalEvent";

type GuideMessage = Readonly<{
  role: "user" | "assistant";
  text: string;
}>;

type GuideRequest = Readonly<{
  citySlug?: unknown;
  placeSlug?: unknown;
  question?: unknown;
  locale?: unknown;
  history?: unknown;
  tourContext?: unknown;
  walkContext?: unknown;
  visitorId?: unknown;
}>;

const MAX_COMPLETION_ATTEMPTS = 2;
const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_TEXT_LENGTH = 2_000;

const ATTRIBUTION_RETRY_INSTRUCTION = `
ATTRIBUTION CORRECTION:

- The previous response could not be accepted because it did not satisfy the structured grounding contract.

- If groundingStatus is "grounded", usedChunkIds must contain at least one exact CHUNK ID from VERIFIED RETRIEVED KNOWLEDGE that supports the answer.

- If no retrieved chunk supports the answer, set groundingStatus to "insufficient_evidence", use an empty usedChunkIds array, and do not make the unsupported factual claim.
`.trim();

export async function POST(request: Request) {
  try {
    let body: GuideRequest;
    try {
      body = await request.json() as GuideRequest;
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const question = typeof body.question === "string"
      ? body.question.trim()
      : "";
    const citySlug = typeof body.citySlug === "string"
      ? body.citySlug.trim()
      : "";
    const placeSlug = typeof body.placeSlug === "string"
      ? body.placeSlug.trim()
      : "";

    if (!question || question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }
    if (!citySlug || !placeSlug) {
      return NextResponse.json({ error: "City and place are required." }, { status: 400 });
    }
    if (!isLocale(body.locale)) {
      return NextResponse.json({ error: "Invalid language." }, { status: 400 });
    }

    const locale = body.locale;
    const contentSource = getContentSource();
    let snapshot;
    try {
      snapshot = await getPublicCitySnapshot(citySlug, contentSource);
    } catch {
      return NextResponse.json({ error: "Place not found." }, { status: 404 });
    }

    if (snapshot.city.slug !== citySlug) {
      return NextResponse.json({ error: "Place not found." }, { status: 404 });
    }

    const place = snapshot.places.find((candidate) => candidate.slug === placeSlug);
    const placeContent = place
      ? resolvePublicLocalization(place.content, locale)
      : undefined;
    const cityContent = resolvePublicLocalization(snapshot.city.content, locale);
    if (!place || !placeContent || !cityContent) {
      return NextResponse.json({ error: "Place not found." }, { status: 404 });
    }

    const provider = getVerifiedKnowledgeProvider(contentSource);
    const currentTrustedChunks = await provider.listVerifiedChunks({
      citySlug,
      placeSlug,
      locale: GUIDE_KNOWLEDGE_SOURCE_LOCALE,
    });
    if (currentTrustedChunks.length === 0) {
      return NextResponse.json(
        { error: "AI Guide is unavailable for this place." },
        { status: 404 },
      );
    }

    const tourContext = resolveTourContext({
      input: body.tourContext,
      locale,
      expectedCurrentStop: placeSlug,
      snapshot,
    });
    const knowledge = await retrieveGuideKnowledge({
      citySlug,
      currentPlaceSlug: placeSlug,
      visitedPlaceSlugs:
        tourContext?.visitedStops.map((stop) => stop.slug) ?? [],
      question,
      provider,
      currentTrustedChunks,
    });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      emitOperationalFailure({
        category: "ai",
        code: "AI_PROVIDER_NOT_CONFIGURED",
        severity: "error",
        retryable: false,
        httpStatus: 500,
      });
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 },
      );
    }

    // Only Cloudflare edge metadata may identify a caller. Never trust X-Forwarded-For.
    const ip = getTrustedGuideAbuseIdentifier(request.headers);
    const rateLimit = await aiGuideRateLimit.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many AI questions. Please try again later.",
          code: "guide_abuse_rate_limited",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
          },
        },
      );
    }
    const allowance = await enforceGuideDailyAllowance({
      request,
      citySlug,
      visitorId: body.visitorId,
      fallbackIdentity: ip,
    });
    if (!allowance.success) {
      return NextResponse.json(
        {
          error: "Daily AI Guide allowance reached. Please try again later.",
          code: "guide_daily_allowance_reached",
          allowance: toPublicGuideAllowance(allowance),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": allowance.limit.toString(),
            "X-RateLimit-Remaining": allowance.remaining.toString(),
            "X-RateLimit-Reset": allowance.reset.toString(),
          },
        },
      );
    }

    const walkContext = resolveWalkGuideContext(body.walkContext, snapshot.places, placeSlug);
    // Keep one navigation source: a resolved published tour retains precedence.
    const walkPromptContext = !tourContext && walkContext
      ? toWalkGuidePromptContext(walkContext)
      : undefined;
    const history = parseGuideHistory(body.history);
    const systemPrompt = buildGuideSystemPrompt({
      citySlug,
      cityName: cityContent.content.name,
      currentPlace: {
        slug: place.slug,
        name: placeContent.content.name,
      },
      locale,
      tourContext,
      walkContext: walkPromptContext,
      knowledge,
    });
    const currentTurnQuestion = [
      "CURRENT STOP:",
      placeContent.content.name,
      "",
      "REFERENCE RULE:",
      "Unless the tourist explicitly names another place,",
      'references such as "this place", "it", "here",',
      '"this building", "this church", or "this gate"',
      "in the CURRENT QUESTION refer to CURRENT STOP.",
      "",
      ...(walkPromptContext ? [
        "TRAVELER NAVIGATION METADATA (self-reported, privacy-minimized, not verified factual evidence):",
        JSON.stringify(walkPromptContext),
        "Precise start/finish coordinates and deadline timestamps are intentionally withheld from the language model. Use only for conversational context. Never claim a route change was performed. Direct changes to the trip controls, which require confirmation. Do not invent places, coordinates, routes, or precise time savings. Verified knowledge remains the only factual evidence.",
        "",
      ] : []),
      "CURRENT QUESTION:",
      question,
    ].join("\n");
    // Global budget reserves one slot per HTTP attempt. Disable the SDK's
    // implicit transport retries so a reserved slot cannot fan out to more calls.
    const groq = new Groq({ apiKey, maxRetries: 0 });
    let guideAnswer: ReturnType<typeof parseGuideStructuredAnswer> | undefined;

    for (let attempt = 0; attempt < MAX_COMPLETION_ATTEMPTS; attempt += 1) {
      // Reserve one globally shared provider attempt per call, including retries.
      const globalBudget = await aiGuideGlobalProviderBudget.limit();
      if (!globalBudget.success) {
        return NextResponse.json(
          {
            error: "AI Guide is temporarily at capacity. Please try again later.",
            code: "guide_global_budget_exhausted",
          },
          {
            status: 503,
            headers: {
              "Cache-Control": "no-store",
              "Retry-After": String(Math.max(1, Math.ceil((globalBudget.reset - Date.now()) / 1000))),
            },
          },
        );
      }
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0.2,
        reasoning_effort: "low",
        include_reasoning: false,
        max_completion_tokens: 1024,
        response_format: GUIDE_RESPONSE_FORMAT,
        messages: [
          {
            role: "system",
            content: attempt === 0
              ? systemPrompt
              : `${systemPrompt}\n\n${ATTRIBUTION_RETRY_INSTRUCTION}`,
          },
          ...history.map((message) => ({
            role: message.role,
            content: message.text,
          })),
          { role: "user", content: currentTurnQuestion },
        ],
      });
      const rawAnswer = completion.choices[0]?.message?.content?.trim();
      const parsedAnswer = rawAnswer
        ? parseGuideStructuredAnswer(rawAnswer, knowledge)
        : null;

      if (
        parsedAnswer &&
        (
          parsedAnswer.groundingStatus === "insufficient_evidence" ||
          parsedAnswer.usedChunkIds.length > 0
        )
      ) {
        guideAnswer = parsedAnswer;
        break;
      }
    }

    const answer = guideAnswer?.answer ??
      getTranslations(locale).ai.insufficientEvidence;
    const usedChunkIds = guideAnswer?.usedChunkIds ?? [];

    return NextResponse.json({
      answer,
      sources: buildGuideSourceMetadata(knowledge, usedChunkIds),
      allowance: toPublicGuideAllowance(allowance),
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;
    if (status >= 500) {
      emitOperationalFailure({
        category: "ai",
        code: "AI_GUIDE_REQUEST_FAILED",
        severity: "error",
        retryable: true,
        httpStatus: status,
      });
    }
    const message = status < 500 && error instanceof Error
      ? error.message
      : "AI Guide is temporarily unavailable.";

    return NextResponse.json({ error: message }, { status });
  }
}

function toPublicGuideAllowance(
  allowance: Readonly<{
    tier: "free" | "premium";
    limit: number;
    remaining: number;
    reset: number;
  }>,
) {
  return {
    kind: "daily_guide" as const,
    tier: allowance.tier,
    limit: allowance.limit,
    remaining: Math.max(0, allowance.remaining),
    resetAt: allowance.reset,
  };
}

function parseGuideHistory(value: unknown): readonly GuideMessage[] {
  if (!Array.isArray(value)) return [];

  return value.slice(-6).flatMap((item): GuideMessage[] => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("role" in item) ||
      (item.role !== "user" && item.role !== "assistant") ||
      !("text" in item) ||
      typeof item.text !== "string"
    ) {
      return [];
    }

    const text = item.text.trim().slice(0, MAX_HISTORY_TEXT_LENGTH);
    return text ? [{ role: item.role, text }] : [];
  });
}
