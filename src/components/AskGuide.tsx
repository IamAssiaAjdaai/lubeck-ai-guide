"use client";

import { FormEvent, useState } from "react";
import posthog from "posthog-js";

const MAX_QUESTIONS = 5;

type AskGuideProps = {
  landmark: string;
  landmarkName: string;
  locale: string;
  buttonLabel: string;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function AskGuide({
  landmark,
  landmarkName,
  locale,
  buttonLabel,
}: AskGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  const isArabic = locale === "ar";
  const limitReached = questionCount >= MAX_QUESTIONS;

  const placeholders: Record<string, string> = {
    en: "Ask something about this place...",
    de: "Stelle eine Frage zu diesem Ort...",
    fr: "Posez une question sur ce lieu...",
    ar: "اسأل عن هذا المكان...",
  };

  const sendLabels: Record<string, string> = {
    en: "Send",
    de: "Senden",
    fr: "Envoyer",
    ar: "إرسال",
  };

  const emptyMessages: Record<string, string> = {
    en: "Ask me anything about this place.",
    de: "Frag mich etwas über diesen Ort.",
    fr: "Posez-moi une question sur ce lieu.",
    ar: "اسألني أي سؤال عن هذا المكان.",
  };

  const loadingMessages: Record<string, string> = {
    en: "Thinking...",
    de: "Einen Moment...",
    fr: "Un instant...",
    ar: "لحظة من فضلك...",
  };

  const limitMessages: Record<string, string> = {
    en: "You have reached the 5-question limit for this tour.",
    de: "Du hast das Limit von 5 Fragen für diese Tour erreicht.",
    fr: "Vous avez atteint la limite de 5 questions pour cette visite.",
    ar: "لقد وصلت إلى الحد الأقصى وهو 5 أسئلة لهذه الجولة.",
  };

  const questionCounterLabels: Record<string, string> = {
    en: "questions used",
    de: "Fragen verwendet",
    fr: "questions utilisées",
    ar: "أسئلة مستخدمة",
  };

  const unavailableMessages: Record<string, string> = {
    en: "The guide is temporarily unavailable.",
    de: "Der Guide ist gerade nicht verfügbar.",
    fr: "Le guide est momentanément indisponible.",
    ar: "الدليل غير متاح حالياً.",
  };

  const handleOpen = () => {
    setIsOpen(true);

    posthog.capture("ai_guide_opened", {
      city: "lubeck",
      landmark,
      locale,
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const cleanQuestion = question.trim();

    if (!cleanQuestion || isLoading) {
      return;
    }

    if (limitReached) {
      posthog.capture("ai_limit_reached", {
        city: "lubeck",
        landmark,
        locale,
        limit: MAX_QUESTIONS,
      });

      return;
    }

    /*
     * Keep a copy of the current conversation
     * before adding the new question.
     */
    const conversationHistory = messages.slice(-6);

    /*
     * Show the user message immediately.
     */
    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: cleanQuestion,
      },
    ]);

    setQuestion("");
    setIsLoading(true);

    posthog.capture("ai_question_asked", {
      city: "lubeck",
      landmark,
      locale,
      question_number: questionCount + 1,
    });

    try {
      const response = await fetch("/api/guide", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: cleanQuestion,
          landmark,
          locale,

          /*
           * Send recent conversation context
           * so follow-up questions work.
           */
          history: conversationHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Guide API error:", data);

        throw new Error(
          data.error ??
            `Request failed with status ${response.status}`
        );
      }

      /*
       * Only count successful AI questions.
       */
      setQuestionCount((count) => count + 1);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer,
        },
      ]);
    } catch (error) {
      console.error("AI Guide request failed:", error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            unavailableMessages[locale] ??
            unavailableMessages.en,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Open AI Guide */}
      <button
        type="button"
        onClick={handleOpen}
        className="mt-10 flex h-14 w-full items-center justify-center rounded-xl border border-black px-4 font-semibold transition hover:bg-zinc-50"
      >
        {buttonLabel}
      </button>

      {/* Bottom Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setIsOpen(false)}
        >
          <div
            dir={isArabic ? "rtl" : "ltr"}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-6 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  AI Guide
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {landmarkName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Guide"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xl transition hover:bg-zinc-200"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="mt-6 flex-1 space-y-3 overflow-y-auto">
              {messages.length === 0 && (
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-sm leading-6 text-zinc-600">
                    {emptyMessages[locale] ??
                      emptyMessages.en}
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? `${
                          isArabic
                            ? "mr-auto"
                            : "ml-auto"
                        } max-w-[85%] rounded-2xl bg-black px-4 py-3 text-sm leading-6 text-white`
                      : `${
                          isArabic
                            ? "ml-auto"
                            : "mr-auto"
                        } max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm leading-6 text-zinc-800`
                  }
                >
                  {message.text}
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div
                  className={`${
                    isArabic
                      ? "ml-auto"
                      : "mr-auto"
                  } max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500`}
                >
                  {loadingMessages[locale] ??
                    loadingMessages.en}
                </div>
              )}
            </div>

            {/* Question counter */}
            <p className="mt-4 text-center text-xs text-zinc-500">
              {questionCount}/{MAX_QUESTIONS}{" "}
              {questionCounterLabels[locale] ??
                questionCounterLabels.en}
            </p>

            {/* Limit message */}
            {limitReached && (
              <div className="mt-3 rounded-xl bg-zinc-100 p-3 text-center text-sm leading-6 text-zinc-600">
                {limitMessages[locale] ??
                  limitMessages.en}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="mt-4 flex gap-2"
            >
              <input
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                disabled={limitReached}
                placeholder={
                  limitReached
                    ? limitMessages[locale] ??
                      limitMessages.en
                    : placeholders[locale] ??
                      placeholders.en
                }
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-zinc-100"
              />

              <button
                type="submit"
                disabled={
                  isLoading ||
                  limitReached ||
                  !question.trim()
                }
                className="rounded-xl bg-black px-5 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendLabels[locale] ??
                  sendLabels.en}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}