import { describe, expect, it } from "vitest";

import {
  appendGuideAnswer,
  appendGuideError,
  createGuideWelcome,
  startGuideTurn,
} from "../src/lib/guideConversation";

const source = {
  label: "Official source",
  url: "https://example.com/source",
  verifiedAt: "2026-09-15",
  citySlug: "lubeck",
  placeSlug: "holstentor",
  chunkIds: ["holstentor-history"],
} as const;

describe("native guide conversation", () => {
  it("appends ordered user and assistant messages without replacing earlier content", () => {
    const welcome = createGuideWelcome("Ask me about this place.");
    const first = startGuideTurn([welcome], "Why is it famous?", "user-1")!;
    const answered = appendGuideAnswer(first.messages, {
      id: "assistant-1",
      text: "It is a landmark.",
      sources: [source],
    });
    const second = startGuideTurn(answered, "When was it built?", "user-2")!;

    expect(second.messages.map(({ id }) => id)).toEqual([
      "assistant-welcome", "user-1", "assistant-1", "user-2",
    ]);
    expect(second.history).toEqual([
      { role: "user", text: "Why is it famous?" },
      { role: "assistant", text: "It is a landmark." },
    ]);
    expect(second.history).not.toContainEqual({ role: "user", text: "When was it built?" });
    expect(answered[2]?.sources).toEqual([source]);
  });

  it("preserves the conversation when a request fails", () => {
    const turn = startGuideTurn(
      [createGuideWelcome("Welcome")],
      "Question",
      "user-1",
    )!;
    const failed = appendGuideError(turn.messages, { id: "error-1", text: "Try later." });

    expect(failed.map(({ text }) => text)).toEqual(["Welcome", "Question", "Try later."]);
    expect(failed[2]).toMatchObject({ role: "assistant", kind: "error" });
    expect(startGuideTurn(failed, "Retry", "user-2")?.history).toEqual([
      { role: "user", text: "Question" },
    ]);
  });

  it("bounds client history to the same six-message server window", () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      kind: "message" as const,
      text: `message-${index}`,
    }));
    const turn = startGuideTurn(messages, "current", "current");
    expect(turn?.history).toHaveLength(6);
    expect(turn?.history[0]?.text).toBe("message-2");
  });
});
