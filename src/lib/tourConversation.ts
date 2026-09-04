import type {
  SupportedTourId,
} from "@/lib/tourContext";

const CONVERSATION_PREFIX =
  "citywalk:tour:conversation";

const MAX_STORED_MESSAGES = 10;
const MAX_QUESTIONS = 5;

export type StoredGuideMessage =
  Readonly<{
    role: "user" | "assistant";
    text: string;
  }>;

export type TourConversation =
  Readonly<{
    messages:
      readonly StoredGuideMessage[];
    questionCount: number;
  }>;

const EMPTY_CONVERSATION:
  TourConversation = {
    messages: [],
    questionCount: 0,
  };

function getStorageKey(
  tourId: SupportedTourId,
): string {
  return `${CONVERSATION_PREFIX}:${tourId}`;
}

export function getTourConversation(
  tourId: SupportedTourId,
): TourConversation {
  if (
    typeof window === "undefined"
  ) {
    return EMPTY_CONVERSATION;
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        getStorageKey(tourId),
      );

    if (!raw) {
      return EMPTY_CONVERSATION;
    }

    const parsed =
      JSON.parse(raw) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return EMPTY_CONVERSATION;
    }

    const value = parsed as {
      messages?: unknown;
      questionCount?: unknown;
    };

    const messages =
      Array.isArray(value.messages)
        ? value.messages.filter(
            (
              item,
            ): item is StoredGuideMessage =>
              typeof item === "object" &&
              item !== null &&
              "role" in item &&
              (
                item.role === "user" ||
                item.role === "assistant"
              ) &&
              "text" in item &&
              typeof item.text ===
                "string",
          )
        : [];

    const questionCount =
      typeof value.questionCount ===
        "number"
        ? Math.min(
            MAX_QUESTIONS,
            Math.max(
              0,
              Math.floor(
                value.questionCount,
              ),
            ),
          )
        : 0;

    return {
      messages:
        messages.slice(
          -MAX_STORED_MESSAGES,
        ),
      questionCount,
    };
  } catch {
    return EMPTY_CONVERSATION;
  }
}

export function saveTourConversation(
  tourId: SupportedTourId,
  conversation: TourConversation,
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getStorageKey(tourId),
      JSON.stringify({
        messages:
          conversation.messages.slice(
            -MAX_STORED_MESSAGES,
          ),

        questionCount:
          Math.min(
            MAX_QUESTIONS,
            Math.max(
              0,
              conversation.questionCount,
            ),
          ),
      }),
    );
  } catch {
    /*
     * AI Guide still works when
     * sessionStorage is unavailable.
     */
  }
}