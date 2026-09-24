import { describe, expect, it, vi } from "vitest";

import guideScreenSource from "../src/app/city/[citySlug]/guide/[placeSlug].tsx?raw";
import { createCitywalkApiClient, CitywalkApiError } from "../src/lib/api/client";
import { appendGuideAnswer, createGuideWelcome, startGuideTurn } from "../src/lib/guideConversation";
import { createGuideConversationStore } from "../src/lib/guideConversationStorage";
import { canSubmitGuideQuestion, classifyGuideFailure } from "../src/lib/guideFailure";
import { getNativeDirection, getNativeMessages } from "../src/lib/localization";

function storageFixture() {
  const records = new Map<string, string>();
  return {
    async getItem(key: string) { return records.get(key) ?? null; },
    async setItem(key: string, value: string) { records.set(key, value); },
    async removeItem(key: string) { records.delete(key); },
  };
}

const source = {
  label: "Official source", url: "https://example.org/guide", verifiedAt: "2026-09-15",
  citySlug: "lubeck", placeSlug: "holstentor", chunkIds: ["holstentor-history"],
} as const;

describe("automated guide acceptance contract", () => {
  it.each(["en", "de", "ar"] as const)(
    "reuses restored %s conversation as bounded, ordered API history without duplicating the current question",
    async (locale) => {
      const storage = storageFixture();
      const store = createGuideConversationStore(storage);
      let messages = [createGuideWelcome(getNativeMessages(locale).guideWelcome)];
      for (let index = 0; index < 8; index += 1) {
        const turn = startGuideTurn(messages, `Earlier question ${index}`, `u${index}`)!;
        messages = [...appendGuideAnswer(turn.messages, {
          id: `a${index}`, text: `Verified answer ${index}`, sources: [source],
        })];
      }
      await store.save("lubeck", "holstentor", messages);

      // A new store instance represents leaving/reopening or normal app restart.
      const restored = await createGuideConversationStore(storage).load("lubeck", "holstentor");
      const turn = startGuideTurn([createGuideWelcome("Restored welcome"), ...restored], "Unique current question", "current")!;
      expect(turn.history).toHaveLength(6);
      expect(turn.history.map(({ role }) => role)).toEqual([
        "user", "assistant", "user", "assistant", "user", "assistant",
      ]);
      expect(turn.history.map(({ text }) => text)).not.toContain(turn.question);
      expect(turn.messages.filter(({ text }) => text === turn.question)).toHaveLength(1);
      expect(restored[1]?.sources).toEqual([source]);

      const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ answer: "Next verified answer", sources: [source] })));
      const client = createCitywalkApiClient({
        origin: "https://citywalk.example", fetchImpl,
        getAuthCookie: async () => "",
        getVisitorId: async () => "123e4567-e89b-42d3-a456-426614174000",
      });
      await client.askGuide({ citySlug: "lubeck", placeSlug: "holstentor", locale,
        question: turn.question, history: turn.history });
      const sent = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
      expect(sent.question).toBe("Unique current question");
      expect(sent.history).toEqual(turn.history);
      expect(JSON.stringify(sent).match(/Unique current question/g)).toHaveLength(1);
      expect(getNativeDirection(locale)).toBe(locale === "ar" ? "rtl" : "ltr");
    },
  );

  it("keeps a successful sourced conversation intact through a daily limit and repeated submit attempts", async () => {
    const storage = storageFixture();
    const store = createGuideConversationStore(storage);
    const answered = appendGuideAnswer(startGuideTurn([], "Earlier question", "u1")!.messages, {
      id: "a1", text: "Verified answer", sources: [source],
    });
    await store.save("lubeck", "holstentor", answered);
    const daily = { kind: "daily_guide", tier: "free", limit: 3, remaining: 0, resetAt: 1_800_000_000_000 } as const;
    const failure = classifyGuideFailure(new CitywalkApiError(429, "limit", "guide_daily_allowance_reached", daily));
    expect(failure).toBe("daily_allowance");
    let visible = [...answered];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (canSubmitGuideQuestion({ busy: false, hydrated: true, allowance: daily, failure, question: "Again" })) {
        visible = [...startGuideTurn(visible, "Again", `repeat-${attempt}`)!.messages];
      }
    }
    expect(visible).toEqual(answered);
    expect(await createGuideConversationStore(storage).load("lubeck", "holstentor")).toEqual(answered);
    expect(guideScreenSource).toContain("conversation.map");
    expect(guideScreenSource).toContain("styles.limitCard");
    expect(guideScreenSource).toContain("const sendDisabled = !canSend;");
    expect(guideScreenSource).not.toContain("appendGuideError(turn.messages");
  });

  it("routes abuse and gateway failures to retry states, never to a false paywall", () => {
    expect(classifyGuideFailure(new CitywalkApiError(429, "busy", "guide_abuse_rate_limited")))
      .toBe("abuse_limit");
    expect(classifyGuideFailure(new CitywalkApiError(502, "gateway"))).toBe("technical");
    expect(guideScreenSource).toContain('failure === "abuse_limit" ? messages.guideAbuseLimited : messages.guideError');
    expect(guideScreenSource).toContain("{limitReached ? (");
    expect(guideScreenSource).toContain(") : failure ? (");
  });
});
