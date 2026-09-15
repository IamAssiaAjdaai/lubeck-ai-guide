import type { GuideSource } from "./api/contracts";

export type GuideHistoryMessage = Readonly<{
  role: "user" | "assistant";
  text: string;
}>;

export type GuideConversationMessage = GuideHistoryMessage & Readonly<{
  id: string;
  kind: "message" | "welcome" | "error";
  sources?: readonly GuideSource[];
}>;

export type GuideTurn = Readonly<{
  question: string;
  history: readonly GuideHistoryMessage[];
  messages: readonly GuideConversationMessage[];
}>;

const MAX_CLIENT_HISTORY_MESSAGES = 6;

export function createGuideWelcome(text: string, id = "assistant-welcome"): GuideConversationMessage {
  return { id, role: "assistant", kind: "welcome", text };
}

export function startGuideTurn(
  messages: readonly GuideConversationMessage[],
  question: string,
  id: string,
): GuideTurn | undefined {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return undefined;
  return {
    question: cleanQuestion,
    history: buildGuideHistory(messages),
    messages: [...messages, { id, role: "user", kind: "message", text: cleanQuestion }],
  };
}

export function appendGuideAnswer(
  messages: readonly GuideConversationMessage[],
  input: Readonly<{ id: string; text: string; sources: readonly GuideSource[] }>,
): readonly GuideConversationMessage[] {
  return [...messages, {
    id: input.id,
    role: "assistant",
    kind: "message",
    text: input.text,
    sources: input.sources,
  }];
}

export function appendGuideError(
  messages: readonly GuideConversationMessage[],
  input: Readonly<{ id: string; text: string }>,
): readonly GuideConversationMessage[] {
  return [...messages, { id: input.id, role: "assistant", kind: "error", text: input.text }];
}

export function buildGuideHistory(
  messages: readonly GuideConversationMessage[],
): readonly GuideHistoryMessage[] {
  return messages
    .filter(({ kind }) => kind === "message")
    .slice(-MAX_CLIENT_HISTORY_MESSAGES)
    .map(({ role, text }) => ({ role, text }));
}
