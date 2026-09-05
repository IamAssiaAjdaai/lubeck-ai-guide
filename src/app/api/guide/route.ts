import Groq from "groq-sdk";

import {
  NextResponse,
} from "next/server";

import {
  lubeckLandmarks as landmarks,
  type LubeckPlaceSlug,
} from "@/data/places";

import {
  getTranslations,
  isLocale,
} from "@/lib/i18n";

import {
  resolveTourContext,
} from "@/lib/tourContext.server";

import {
  aiGuideRateLimit,
} from "@/lib/rateLimit";

import {
  buildGuideSystemPrompt,
} from "@/lib/guidePrompt.server";

import {
  buildGuideSourceMetadata,
  GUIDE_RESPONSE_FORMAT,
  parseGuideStructuredAnswer,
  retrieveGuideKnowledge,
} from "@/lib/guideKnowledge.server";


type GuideMessage = {
  role:
    | "user"
    | "assistant";

  text: string;
};

type GuideRequest = {
  question: string;

  landmark: string;

  locale: string;

  history?: GuideMessage[];

  tourContext?: unknown;
};

const MAX_COMPLETION_ATTEMPTS = 2;

const ATTRIBUTION_RETRY_INSTRUCTION = `
ATTRIBUTION CORRECTION:

- The previous response could not be accepted because it did not satisfy the structured grounding contract.

- If groundingStatus is "grounded", usedChunkIds must contain at least one exact CHUNK ID from VERIFIED RETRIEVED KNOWLEDGE that supports the answer.

- If no retrieved chunk supports the answer, set groundingStatus to "insufficient_evidence", use an empty usedChunkIds array, and do not make the unsupported factual claim.
`.trim();

export async function POST(
  request: Request,
) {
  try {
    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI service is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    const groq =
      new Groq({
        apiKey,
      });

    const forwardedFor =
      request.headers.get(
        "x-forwarded-for",
      );

    const ip =
      forwardedFor
        ?.split(",")[0]
        ?.trim() ??
      "unknown";

    const result =
      await aiGuideRateLimit.limit(
        ip,
      );

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "Too many AI questions. Please try again later.",
        },
        {
          status: 429,

          headers: {
            "X-RateLimit-Limit":
              result.limit.toString(),

            "X-RateLimit-Remaining":
              result.remaining.toString(),

            "X-RateLimit-Reset":
              result.reset.toString(),
          },
        },
      );
    }

    const body =
      (await request.json()) as GuideRequest;

    const question =
      body.question?.trim();

    const slug =
      body.landmark;

    const locale =
      body.locale;

    /*
     * Keep only a bounded amount
     * of conversation context.
     */
    const history =
      Array.isArray(
        body.history,
      )
        ? body.history.slice(
            -6,
          )
        : [];

    /*
     * Validation
     */
    if (!question) {
      return NextResponse.json(
        {
          error:
            "Question is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isLocale(locale)) {
      return NextResponse.json(
        {
          error:
            "Invalid language.",
        },
        {
          status: 400,
        },
      );
    }

    const landmark =
      landmarks.find(
        (item) =>
          item.slug === slug,
      );

    if (!landmark) {
      return NextResponse.json(
        {
          error:
            "Landmark not found.",
        },
        {
          status: 404,
        },
      );
    }

    const currentLocale =
      locale;

    /*
     * Browser tour context is not
     * authoritative.
     *
     * Validate it against the
     * canonical server dataset first.
     */
    const tourContext =
      resolveTourContext({
        input:
          body.tourContext,

        locale:
          currentLocale,

        expectedCurrentStop:
          landmark.slug,
      });

    /*
     * RAG retrieval happens only
     * after landmark and tour state
     * have been validated server-side.
     */
    const knowledge =
      retrieveGuideKnowledge({
        currentPlaceSlug:
          landmark.slug as
            LubeckPlaceSlug,

        visitedPlaceSlugs:
          tourContext
            ?.visitedStops
            .map(
              (stop) =>
                stop.slug as
                  LubeckPlaceSlug,
            ) ?? [],

        question,
      });

    const systemPrompt =
      buildGuideSystemPrompt({
        currentLandmark:
          landmark,

        locale:
          currentLocale,

        tourContext,

        knowledge,
      });

    const conversationMessages =
      history.map(
        (message) => ({
          role:
            message.role,

          content:
            message.text,
        }),
      );

    /*
     * Current-stop anchoring prevents
     * an ambiguous follow-up such as
     * "Why is it famous?" from being
     * resolved to an older stop in
     * conversation history.
     */
    const currentTurnQuestion = [
      "CURRENT STOP:",
      landmark.content[
        currentLocale
      ].name,
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

    let guideAnswer:
      | ReturnType<
          typeof parseGuideStructuredAnswer
        >
      | undefined;

    for (
      let attempt = 0;
      attempt < MAX_COMPLETION_ATTEMPTS;
      attempt += 1
    ) {
      const completion =
        await groq.chat.completions.create(
          {
          model:
            "openai/gpt-oss-20b",

          temperature:
            0.2,

          /*
           * Keep reasoning light:
           * CITYWALK needs short,
           * grounded answers.
           */
          reasoning_effort:
            "low",

          /*
           * Do not expose model
           * reasoning.
           */
          include_reasoning:
            false,

          /*
           * Leave enough budget
           * for reasoning + final answer.
           */
          max_completion_tokens:
            1024,

          response_format:
            GUIDE_RESPONSE_FORMAT,

          messages: [
            {
              role:
                "system",

              content:
                attempt === 0
                  ? systemPrompt
                  : `${systemPrompt}\n\n${ATTRIBUTION_RETRY_INSTRUCTION}`,
            },

            ...conversationMessages,

            {
              role:
                "user",

              content:
                currentTurnQuestion,
            },
          ],
          },
        );

      const rawAnswer =
        completion
          .choices[0]
          ?.message
          ?.content
          ?.trim();

      const parsedAnswer =
        rawAnswer
          ? parseGuideStructuredAnswer(
              rawAnswer,
              knowledge,
            )
          : null;

      if (
        parsedAnswer &&
        (parsedAnswer.groundingStatus ===
          "insufficient_evidence" ||
          parsedAnswer.usedChunkIds.length > 0)
      ) {
        guideAnswer = parsedAnswer;

        break;
      }
    }

    const answer =
      guideAnswer?.answer ??
      getTranslations(currentLocale).ai
        .insufficientEvidence;

    const usedChunkIds =
      guideAnswer?.usedChunkIds ?? [];

    const sources =
      buildGuideSourceMetadata(
        knowledge,
        usedChunkIds,
      );
    return NextResponse.json({
      answer,
      sources,
    });
  } catch
    (error: unknown)
  {
    console.error(
      "AI Guide error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    const status =
      typeof error ===
        "object" &&
      error !== null &&
      "status" in error &&
      typeof (
        error as {
          status?: unknown;
        }
      ).status ===
        "number"
        ? (
            error as {
              status: number;
            }
          ).status
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}
