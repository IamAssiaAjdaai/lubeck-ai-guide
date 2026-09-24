import type { SupportedTourId } from "@/lib/tourContext";

const LEGACY_TOUR_CONVERSATION_PREFIX = "citywalk:tour:conversation";
const GUIDE_CONVERSATION_PREFIX = "citywalk:guide:conversation";
const MAX_STORED_MESSAGES = 10;
const MAX_QUESTIONS = 5;

export type GuideConversationScope =
  | Readonly<{ kind: "tour"; citySlug: string; tourId: SupportedTourId }>
  | Readonly<{ kind: "place"; citySlug: string; placeSlug: string }>;

export type StoredGuideSource = Readonly<{
  label: string;
  url: string;
  verifiedAt: string;
  citySlug?: string;
  placeSlug: string;
  chunkIds: readonly string[];
}>;

export type StoredGuideMessage = Readonly<{
  role: "user" | "assistant";
  text: string;
  sources?: readonly StoredGuideSource[];
}>;

export type TourConversation = Readonly<{
  messages: readonly StoredGuideMessage[];
  questionCount: number;
}>;

const EMPTY_CONVERSATION: TourConversation = { messages: [], questionCount: 0 };

export function isStoredGuideSource(value: unknown): value is StoredGuideSource {
  if (typeof value !== "object" || value === null) return false;

  const source = value as Record<string, unknown>;
  return (
    typeof source.label === "string" &&
    typeof source.url === "string" &&
    source.url.startsWith("https://") &&
    typeof source.verifiedAt === "string" &&
    (source.citySlug === undefined || typeof source.citySlug === "string") &&
    typeof source.placeSlug === "string" &&
    Array.isArray(source.chunkIds) &&
    source.chunkIds.every((chunkId) => typeof chunkId === "string")
  );
}

export function getGuideConversationStorageKey(
  scope: GuideConversationScope,
): string {
  if (
    scope.kind === "tour" &&
    scope.citySlug === "lubeck" &&
    scope.tourId === "lubeck_historic_center"
  ) {
    return `${LEGACY_TOUR_CONVERSATION_PREFIX}:${scope.tourId}`;
  }

  return scope.kind === "tour"
    ? `${GUIDE_CONVERSATION_PREFIX}:tour:${encodeURIComponent(scope.citySlug)}:${encodeURIComponent(scope.tourId)}`
    : `${GUIDE_CONVERSATION_PREFIX}:place:${encodeURIComponent(scope.citySlug)}:${encodeURIComponent(scope.placeSlug)}`;
}

export function getGuideConversation(
  scope: GuideConversationScope,
): TourConversation {
  if (typeof window === "undefined") return EMPTY_CONVERSATION;

  try {
    const raw = window.sessionStorage.getItem(getGuideConversationStorageKey(scope));
    if (!raw) return EMPTY_CONVERSATION;

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return EMPTY_CONVERSATION;

    const value = parsed as { messages?: unknown; questionCount?: unknown };
    const messages = Array.isArray(value.messages)
      ? value.messages.flatMap((item): StoredGuideMessage[] => {
          if (typeof item !== "object" || item === null) return [];
          const candidate = item as {
            role?: unknown;
            text?: unknown;
            sources?: unknown;
          };
          if (
            (candidate.role !== "user" && candidate.role !== "assistant") ||
            typeof candidate.text !== "string"
          ) {
            return [];
          }
          const sources = Array.isArray(candidate.sources)
            ? candidate.sources.filter(isStoredGuideSource)
            : [];
          return [{
            role: candidate.role,
            text: candidate.text,
            ...(sources.length > 0 ? { sources } : {}),
          }];
        })
      : [];
    const questionCount = typeof value.questionCount === "number"
      ? Math.min(MAX_QUESTIONS, Math.max(0, Math.floor(value.questionCount)))
      : 0;

    return {
      messages: messages.slice(-MAX_STORED_MESSAGES),
      questionCount,
    };
  } catch {
    return EMPTY_CONVERSATION;
  }
}

export function saveGuideConversation(
  scope: GuideConversationScope,
  conversation: TourConversation,
): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getGuideConversationStorageKey(scope),
      JSON.stringify({
        messages: conversation.messages.slice(-MAX_STORED_MESSAGES),
        questionCount: Math.min(
          MAX_QUESTIONS,
          Math.max(0, conversation.questionCount),
        ),
      }),
    );
  } catch {
    // The guide remains usable when sessionStorage is unavailable.
  }
}

export function getTourConversation(tourId: SupportedTourId): TourConversation {
  return getGuideConversation({ kind: "tour", citySlug: "lubeck", tourId });
}

export function saveTourConversation(
  tourId: SupportedTourId,
  conversation: TourConversation,
): void {
  saveGuideConversation({ kind: "tour", citySlug: "lubeck", tourId }, conversation);
}
