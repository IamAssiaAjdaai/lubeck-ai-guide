import Groq from "groq-sdk";

import {
  NextResponse,
} from "next/server";

import {
  lubeckLandmarks as landmarks,
  type LubeckPlaceSlug,
} from "@/data/places";

import {
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

          messages: [
            {
              role:
                "system",

              content:
                systemPrompt,
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

    const answer =
      completion
        .choices[0]
        ?.message
        ?.content
        ?.trim();

    if (!answer) {
      /*
       * Privacy-safe diagnostics.
       *
       * Never log:
       * - user question
       * - prompt
       * - conversation history
       * - coordinates
       */
      console.error(
        "AI Guide returned no final content.",
        {
          finishReason:
            completion
              .choices[0]
              ?.finish_reason,

          usage:
            completion
              .usage,
        },
      );

      throw new Error(
        "No AI response was returned.",
      );
    }

    /*
     * Phase 2A keeps the old API
     * response shape.
     *
     * Safe source metadata will be
     * added separately in Phase 2B.
     */
    return NextResponse.json({
      answer,
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