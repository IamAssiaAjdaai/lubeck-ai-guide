"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import posthog from "posthog-js";

import type {
  Locale,
  TextDirection,
  Translations,
} from "@/lib/i18n";

import {
  createTourContextInput,
  type SupportedTourId,
} from "@/lib/tourContext";

import {
  getVisitedTourStops,
} from "@/lib/tourSession";

import {
  getTourConversation,
  saveTourConversation,
} from "@/lib/tourConversation";

const MAX_QUESTIONS = 5;

type AskGuideProps = {
  landmark: string;
  landmarkName: string;
  locale: Locale;
  direction: TextDirection;
  buttonLabel: string;
  closeLabel: string;
  labels: Translations["ai"];
  suggestions: readonly string[];
  tourId: SupportedTourId;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

function captureGuideEvent(
  eventName: string,
  properties:
    Record<
      string,
      string | number
    >,
) {
  try {
    posthog.capture(
      eventName,
      properties,
    );
  } catch (error) {
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      console.warn(
        "AI Guide analytics could not be captured:",
        error,
      );
    }
  }
}

export default function AskGuide({
  landmark,
  landmarkName,
  locale,
  direction,
  buttonLabel,
  closeLabel,
  labels,
  suggestions,
  tourId,
}: AskGuideProps) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState<Message[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    questionCount,
    setQuestionCount,
  ] = useState(0);

  const isRtl =
    direction === "rtl";

  const GuideChevron =
    isRtl
      ? ChevronLeft
      : ChevronRight;

  const limitReached =
    questionCount >=
    MAX_QUESTIONS;

  const handleOpen = () => {
    /*
     * Restore the successful conversation
     * for this tour session.
     */
    const savedConversation =
      getTourConversation(
        tourId,
      );

    setMessages(
      [
        ...savedConversation.messages,
      ],
    );

    setQuestionCount(
      savedConversation
        .questionCount,
    );

    setIsOpen(true);

    captureGuideEvent(
      "ai_guide_opened",
      {
        city: "lubeck",
        landmark,
        locale,
      },
    );
  };

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanQuestion =
      question.trim();

    if (
      !cleanQuestion ||
      isLoading
    ) {
      return;
    }

    if (limitReached) {
      captureGuideEvent(
        "ai_limit_reached",
        {
          city: "lubeck",
          landmark,
          locale,
          limit:
            MAX_QUESTIONS,
        },
      );

      return;
    }

    /*
     * Do not persist temporary
     * error messages as AI history.
     */
    const persistedMessages =
      messages.filter(
        (message) =>
          message.text !==
            labels.unavailable &&
          message.text !==
            labels.rateLimited,
      );

    /*
     * Keep only recent history
     * when sending context to the LLM.
     */
    const conversationHistory =
      persistedMessages.slice(-6);

    /*
     * Show the user's new question
     * immediately in the UI.
     */
    setMessages([
      ...persistedMessages,
      {
        role: "user",
        text: cleanQuestion,
      },
    ]);

    setQuestion("");
    setIsLoading(true);

    captureGuideEvent(
      "ai_question_asked",
      {
        city: "lubeck",
        landmark,
        locale,
        question_number:
          questionCount + 1,
      },
    );

    try {
      const tourContext =
        createTourContextInput({
          tourId,
          currentStop:
            landmark,
          visitedStops:
            getVisitedTourStops(
              tourId,
            ),
        });

      const response =
        await fetch(
          "/api/guide",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                question:
                  cleanQuestion,

                landmark,

                locale,

                tourContext,

                /*
                 * Recent successful
                 * conversation only.
                 */
                history:
                  conversationHistory,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status ===
          429
        ) {
          setMessages([
            ...persistedMessages,
            {
              role: "user",
              text:
                cleanQuestion,
            },
            {
              role: "assistant",
              text:
                labels.rateLimited,
            },
          ]);

          captureGuideEvent(
            "ai_rate_limit_reached",
            {
              city:
                "lubeck",
              landmark,
              locale,
            },
          );

          return;
        }

        throw new Error(
          data.error ??
            `Request failed with status ${response.status}`,
        );
      }

      /*
       * Only successful Q/A pairs
       * become persistent tour history.
       */
      const successfulMessages:
        Message[] = [
          ...persistedMessages,
          {
            role: "user",
            text:
              cleanQuestion,
          },
          {
            role:
              "assistant",
            text:
              data.answer,
          },
        ];

      const nextQuestionCount =
        questionCount + 1;

      setMessages(
        successfulMessages,
      );

      setQuestionCount(
        nextQuestionCount,
      );

      /*
       * Persist across landmark
       * navigation in the same tab.
       */
      saveTourConversation(
        tourId,
        {
          messages:
            successfulMessages,

          questionCount:
            nextQuestionCount,
        },
      );
    } catch (error) {
      console.error(
        "AI Guide request failed:",
        error,
      );

      /*
       * Show error in the current UI,
       * but do NOT persist it.
       */
      setMessages([
        ...persistedMessages,
        {
          role: "user",
          text:
            cleanQuestion,
        },
        {
          role:
            "assistant",
          text:
            labels.unavailable,
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
        aria-label={
          buttonLabel
        }
        className="mt-9 flex min-h-24 w-full items-center gap-4 rounded-[var(--radius-md)] border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-4 text-start transition hover:border-violet-300"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ai shadow-sm">
          <Sparkles
            aria-hidden="true"
            size={21}
            strokeWidth={1.8}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-text-primary">
            {buttonLabel}
          </span>

          <span className="mt-1 block text-sm leading-5 text-text-secondary">
            {labels.empty}
          </span>
        </span>

        <GuideChevron
          aria-hidden="true"
          size={19}
          strokeWidth={1.8}
          className="shrink-0 text-ai"
        />
      </button>

      {/* Bottom Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-guide-title"
          onClick={() =>
            setIsOpen(false)
          }
        >
          <div
            dir={direction}
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
            className="mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-t-[24px] bg-surface-elevated px-5 pb-5 pt-3 shadow-xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ai-soft text-ai">
                  <Sparkles
                    aria-hidden="true"
                    size={20}
                    strokeWidth={
                      1.8
                    }
                  />
                </span>

                <div>
                  <p className="eyebrow">
                    {
                      labels.title
                    }
                  </p>

                  <h2
                    id="ai-guide-title"
                    className="mt-1 text-xl font-semibold tracking-[-0.02em]"
                  >
                    {
                      landmarkName
                    }
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-text-secondary">
                    {
                      labels.empty
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(
                    false,
                  )
                }
                aria-label={
                  closeLabel
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text-secondary transition hover:text-text-primary"
              >
                <X
                  aria-hidden="true"
                  size={20}
                  strokeWidth={
                    1.8
                  }
                />
              </button>
            </div>

            {/* Suggestions */}
            {messages.length ===
              0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {suggestions.map(
                  (
                    suggestion,
                  ) => (
                    <button
                      key={
                        suggestion
                      }
                      type="button"
                      onClick={() =>
                        setQuestion(
                          suggestion,
                        )
                      }
                      className="min-h-10 rounded-full border border-violet-200 bg-ai-soft px-3 text-sm text-ai transition hover:border-ai"
                    >
                      {
                        suggestion
                      }
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Messages */}
            <div className="mt-5 flex-1 space-y-3 overflow-y-auto pe-1">
              {messages.length ===
                0 && (
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-sm leading-6 text-text-secondary">
                    {
                      labels.empty
                    }
                  </p>
                </div>
              )}

              {messages.map(
                (
                  message,
                  index,
                ) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role ===
                      "user"
                        ? `${
                            isRtl
                              ? "mr-auto"
                              : "ml-auto"
                          } max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground`
                        : `${
                            isRtl
                              ? "ml-auto"
                              : "mr-auto"
                          } max-w-[85%] rounded-2xl bg-surface px-4 py-3 text-sm leading-6 text-text-primary`
                    }
                  >
                    {
                      message.text
                    }
                  </div>
                ),
              )}

              {/* Loading */}
              {isLoading && (
                <div
                  className={`${
                    isRtl
                      ? "ml-auto"
                      : "mr-auto"
                  } max-w-[85%] rounded-2xl bg-surface px-4 py-3 text-sm text-text-secondary`}
                >
                  {
                    labels.loading
                  }
                </div>
              )}
            </div>

            {/* Counter */}
            <p className="mt-4 text-center text-xs tabular-nums text-text-secondary">
              {
                questionCount
              }
              /
              {
                MAX_QUESTIONS
              }{" "}
              {
                labels.questionsUsed
              }
            </p>

            {/* Limit */}
            {limitReached && (
              <div className="mt-3 rounded-xl bg-surface p-3 text-center text-sm leading-6 text-text-secondary">
                {
                  labels.limit
                }
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={
                handleSubmit
              }
              className="mt-4 flex items-center gap-2"
            >
              <input
                value={
                  question
                }
                onChange={(
                  event,
                ) =>
                  setQuestion(
                    event.target
                      .value,
                  )
                }
                disabled={
                  limitReached
                }
                placeholder={
                  limitReached
                    ? labels.limit
                    : labels.placeholder
                }
                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-elevated px-4 text-sm outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:bg-surface"
              />

              <button
                type="submit"
                disabled={
                  isLoading ||
                  limitReached ||
                  !question.trim()
                }
                aria-label={
                  labels.send
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send
                  aria-hidden="true"
                  size={19}
                  strokeWidth={
                    1.8
                  }
                  className={
                    isRtl
                      ? "rotate-180"
                      : ""
                  }
                />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}