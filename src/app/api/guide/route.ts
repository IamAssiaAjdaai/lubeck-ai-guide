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
import { aiGuideRateLimit } from "@/lib/rateLimit";
import { resolveTourContext } from "@/lib/tourContext.server";
import { getVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

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
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 },
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
    const rateLimit = await aiGuideRateLimit.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many AI questions. Please try again later." },
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
      "CURRENT QUESTION:",
      question,
    ].join("\n");
    const groq = new Groq({ apiKey });
    let guideAnswer: ReturnType<typeof parseGuideStructuredAnswer> | undefined;

    for (let attempt = 0; attempt < MAX_COMPLETION_ATTEMPTS; attempt += 1) {
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
    });
  } catch (error: unknown) {
    console.error("AI Guide error:", error);
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;
    const message = status < 500 && error instanceof Error
      ? error.message
      : "AI Guide is temporarily unavailable.";

    return NextResponse.json({ error: message }, { status });
  }
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
