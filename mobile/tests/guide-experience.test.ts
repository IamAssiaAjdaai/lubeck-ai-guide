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

  it("keeps prior answers and sources visible while rendering errors outside saved turns", () => {
    expect(guideSource).toContain("conversation.map");
    expect(guideSource).toContain("appendGuideAnswer(turn.messages");
    expect(guideSource).toContain("setConversation(conversation)");
    expect(guideSource).toContain("setFailure(classifyGuideFailure(requestError))");
    expect(guideSource).not.toContain("appendGuideError(turn.messages");
    expect(guideSource).toContain("message.sources.map");
    expect(guideSource).toContain("styles.thinkingBubble");
  });

  it("uses a keyboard-aware accessible composer and RTL-aware message alignment", () => {
    expect(guideSource).toContain("<KeyboardAvoidingView");
    expect(guideSource).toContain('accessibilityRole="button"');
    expect(guideSource).toContain('direction === "rtl"');
    expect(guideSource).toContain("scrollToEnd");
    expect(guideSource).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
    expect(guideSource).toContain('submitBehavior="submit"');
    expect(guideSource).toContain('keyboardShouldPersistTaps="handled"');
  });

  it("restores and persists only completed place-scoped answers", () => {
    expect(guideSource).toContain("guideConversationStore.load(identityCitySlug, identityPlaceSlug)");
    expect(guideSource).toContain("guideConversationStore.save(citySlug, placeSlug, completed)");
    expect(guideSource).toContain("!hydrated");
  });

  it("uses a single dedicated daily limit state without repeating generic error bubbles", () => {
    expect(guideSource).toContain('failure === "daily_allowance"');
    expect(guideSource).toContain("styles.limitCard");
    expect(guideSource).toContain("messages.guideUnlockPass");
    expect(guideSource).toContain("guideUpgradePath(citySlug, locale)");
    expect(guideSource).toContain("messages.guideAbuseLimited");
    expect(guideSource).toContain("messages.guideError");
    expect(guideSource).toContain("if (!canSend) return;");
    expect(guideSource).toContain("const sendDisabled = !canSend;");
    expect(guideSource).toContain("editable={!busy && hydrated && !limitReached}");
  });
});
