import Groq from "groq-sdk";

import { NextResponse } from "next/server";
import { lubeckLandmarks as landmarks } from "@/data/places";
import { isLocale } from "@/lib/i18n";

import {
  resolveTourContext,
} from "@/lib/tourContext.server";
import { aiGuideRateLimit } from "@/lib/rateLimit";
import {
  buildGuideSystemPrompt,
} from "@/lib/guidePrompt.server";

type GuideMessage = {
  role: "user" | "assistant";
  text: string;
};

type GuideRequest = {
  question: string;
  landmark: string;
  locale: string;
  history?: GuideMessage[];
  tourContext?: unknown;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

    const groq = new Groq({
      apiKey,
    });
    const forwardedFor =
      request.headers.get("x-forwarded-for");

    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      "unknown";

    const result =
      await aiGuideRateLimit.limit(ip);
    
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
      }
    );
    }
    const body =
      (await request.json()) as GuideRequest;

    const question = body.question?.trim();
    const slug = body.landmark;
    const locale = body.locale;

    /*
     * Keep only a small conversation history.
     */
    const history =
      Array.isArray(body.history)
        ? body.history.slice(-6)
        : [];

    /*
     * Validation
     */
    if (!question) {
      return NextResponse.json(
        {
          error: "Question is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isLocale(locale)) {
      return NextResponse.json(
        {
          error: "Invalid language.",
        },
        {
          status: 400,
        }
      );
    }

    const landmark = landmarks.find(
      (item) => item.slug === slug
    );

    if (!landmark) {
      return NextResponse.json(
        {
          error: "Landmark not found.",
        },
        {
          status: 404,
        }
      );
    }

    const currentLocale = locale;

    const tourContext =
      resolveTourContext({
        input: body.tourContext,
        locale: currentLocale,
        expectedCurrentStop:
          landmark.slug,
      });
    const systemPrompt =
    buildGuideSystemPrompt({
      currentLandmark: landmark,
      locale: currentLocale,
      tourContext,
    });

    /*
     * Convert previous messages into
     * Groq-compatible conversation messages.
     */
    const conversationMessages = history.map(
      (message) => ({
        role: message.role,
        content: message.text,
      })
    );

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        /*
         * Lower temperature helps make
         * factual answers more predictable.
         */
        temperature: 0.2,

        max_tokens: 300,

       messages: [
          {
            role: "system",
            content: systemPrompt,
          },

          ...conversationMessages,

          {
            role: "user",
            content: question,
          },
        ],
      });

    const answer =
      completion.choices[0]?.message?.content;

    if (!answer) {
      throw new Error(
        "No AI response was returned."
      );
    }

    return NextResponse.json({
      answer,
    });
  } catch (error: unknown) {
    console.error(
      "AI Guide error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (
        error as {
          status?: unknown;
        }
      ).status === "number"
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
      }
    );
  }
}
