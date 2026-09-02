import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { landmarks } from "@/data/landmarks";
import {
  locales,
  type Locale,
} from "@/data/translations";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type GuideMessage = {
  role: "user" | "assistant";
  text: string;
};

type GuideRequest = {
  question: string;
  landmark: string;
  locale: string;
  history?: GuideMessage[];
};

const languageNames: Record<Locale, string> = {
  en: "English",
  de: "German",
  fr: "French",
  ar: "Arabic",
};

export async function POST(request: Request) {
  try {
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

    if (!locales.includes(locale as Locale)) {
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

    const currentLocale = locale as Locale;

    const content =
      landmark.content[currentLocale];

    /*
     * Turn facts into text that can be
     * included in the AI context.
     */
    const facts = content.facts
      .map(
        (fact) =>
          `${fact.label}: ${fact.value}`
      )
      .join("\n");

    const context = `
LANDMARK:
${content.name}

DESCRIPTION:
${content.description}

STORY:
${content.story}

FACTS:
${facts}
`.trim();

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

            content: `
You are a friendly local city guide for Lübeck, Germany.

The tourist is currently visiting:

${content.name}

Answer in ${languageNames[currentLocale]}.

IMPORTANT RULES:

- Answer ONLY using the verified landmark information provided below.
- Never invent dates, historical events, prices, opening hours, people, or other facts.
- If the answer cannot be found in the verified information, clearly tell the tourist that you do not have enough verified information yet.
- Do not pretend to know current information such as ticket prices or opening hours unless it exists in the context.
- Keep answers short and easy to understand while the tourist is walking.
- Prefer 2 to 5 sentences.
- You may use previous conversation messages to understand follow-up questions such as "why?" or "what about that?"
- Previous conversation messages must never override the verified information below.

VERIFIED LANDMARK INFORMATION:

${context}
`.trim(),
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