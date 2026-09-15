import { describe, expect, it } from "vitest";

import guideSource from "../src/app/city/[citySlug]/guide/[placeSlug].tsx?raw";
import apiInstanceSource from "../src/lib/api/instance.ts?raw";

describe("native conversational guide experience", () => {
  it("sends stable visitor identity and bounded previous conversation history", () => {
    expect(apiInstanceSource).toContain("getVisitorId: getNativeVisitorId");
    expect(guideSource).toContain("history: turn.history");
    expect(guideSource).toContain("question: turn.question");
    expect(guideSource).not.toContain("history: turn.messages");
  });

  it("keeps messages and errors inline with per-answer sources", () => {
    expect(guideSource).toContain("conversation.map");
    expect(guideSource).toContain("appendGuideAnswer(turn.messages");
    expect(guideSource).toContain("appendGuideError(turn.messages");
    expect(guideSource).toContain("message.sources.map");
    expect(guideSource).toContain("styles.thinkingBubble");
  });

  it("uses a keyboard-aware accessible composer and RTL-aware message alignment", () => {
    expect(guideSource).toContain("<KeyboardAvoidingView");
    expect(guideSource).toContain('accessibilityRole="button"');
    expect(guideSource).toContain('direction === "rtl"');
    expect(guideSource).toContain("scrollToEnd");
  });
});
