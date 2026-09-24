import { describe, expect, it } from "vitest";

import { appendGuideAnswer, appendGuideError, createGuideWelcome, startGuideTurn } from "../src/lib/guideConversation";
import { createGuideConversationStore } from "../src/lib/guideConversationStorage";

function storageFixture() {
  const records = new Map<string, string>();
  return {
    records,
    storage: {
      async getItem(key: string) { return records.get(key) ?? null; },
      async setItem(key: string, value: string) { records.set(key, value); },
      async removeItem(key: string) { records.delete(key); },
    },
  };
}

const source = {
  label: "Official Holstentor source",
  url: "https://example.org/holstentor",
  verifiedAt: "2026-09-15",
  citySlug: "lubeck",
  placeSlug: "holstentor",
  chunkIds: ["holstentor-history"],
} as const;

describe("versioned native guide conversation storage", () => {
  it("restores completed turns and sources after a new store instance simulates app restart", async () => {
    const fixture = storageFixture();
    const first = createGuideConversationStore(fixture.storage);
    const turn = startGuideTurn([createGuideWelcome("Welcome")], "When was it built?", "user-1")!;
    const answered = appendGuideAnswer(turn.messages, {
      id: "assistant-1", text: "Between 1464 and 1478.", sources: [source],
    });
    await first.save("lubeck", "holstentor", answered);

    const restarted = createGuideConversationStore(fixture.storage);
    const restored = await restarted.load("lubeck", "holstentor");
    expect(restored.map(({ text }) => text)).toEqual(["When was it built?", "Between 1464 and 1478."]);
    expect(restored[1]?.sources).toEqual([source]);
    expect(fixture.records.keys().next().value).toBe("citywalk:guide:1:lubeck:holstentor");
  });

  it("keeps city and place conversations independent", async () => {
    const fixture = storageFixture();
    const store = createGuideConversationStore(fixture.storage);
    const turn = startGuideTurn([], "Question", "u")!;
    await store.save("lubeck", "holstentor", appendGuideAnswer(turn.messages, { id: "a", text: "Answer", sources: [] }));
    expect(await store.load("hamburg", "hamburg-rathaus")).toEqual([]);
    expect(await store.load("lubeck", "marienkirche")).toEqual([]);
    expect(await store.load("lubeck", "holstentor")).toHaveLength(2);
  });

  it("drops transient, failed and malformed turns without corrupting completed history", async () => {
    const fixture = storageFixture();
    const store = createGuideConversationStore(fixture.storage);
    const turn = startGuideTurn([], "Successful", "u1")!;
    const answered = appendGuideAnswer(turn.messages, { id: "a1", text: "Grounded", sources: [] });
    await store.save("lubeck", "holstentor", [...answered, {
      id: "u2", role: "user", kind: "message", text: "Failed request",
    }]);
    expect(await store.load("lubeck", "holstentor")).toHaveLength(2);

    fixture.records.set("citywalk:guide:1:hamburg:speicherstadt", "{broken");
    expect(await store.load("hamburg", "speicherstadt")).toEqual([]);
    fixture.records.set("citywalk:guide:1:hamburg:speicherstadt", JSON.stringify({
      version: 1, citySlug: "lubeck", placeSlug: "speicherstadt", messages: answered,
    }));
    expect(await store.load("hamburg", "speicherstadt")).toEqual([]);
  });

  it("bounds persisted history to twenty completed turns", async () => {
    const fixture = storageFixture();
    const store = createGuideConversationStore(fixture.storage);
    const messages = Array.from({ length: 60 }, (_, index) => ({
      id: String(index), role: index % 2 ? "assistant" as const : "user" as const,
      kind: "message" as const, text: `message-${index}`,
    }));
    await store.save("lubeck", "holstentor", messages);
    const restored = await store.load("lubeck", "holstentor");
    expect(restored).toHaveLength(40);
    expect(restored[0]?.text).toBe("message-20");
  });

  it("never saves busy/typing state or failed technical requests as completed history", async () => {
    const fixture = storageFixture();
    const store = createGuideConversationStore(fixture.storage);
    const first = startGuideTurn([createGuideWelcome("Welcome")], "First", "u1")!;
    const answered = appendGuideAnswer(first.messages, { id: "a1", text: "Verified answer", sources: [source] });
    const failed = startGuideTurn(answered, "Technical failure", "u2")!;
    await store.save("lubeck", "holstentor", [...appendGuideError(failed.messages, {
      id: "e2", text: "Retry",
    }), { id: "a3", role: "assistant", kind: "welcome", text: "typing" }]);
    const raw = fixture.records.get("citywalk:guide:1:lubeck:holstentor")!;
    expect(raw).not.toContain("Technical failure");
    expect(raw).not.toContain("typing");
    expect(raw).not.toContain("Retry");
    expect(raw).not.toContain("busy");
    expect(await createGuideConversationStore(fixture.storage).load("lubeck", "holstentor"))
      .toMatchObject([{ text: "First" }, { text: "Verified answer", sources: [source] }]);
  });

  it("sanitizes malformed message/source fields and never stores extra private properties", async () => {
    const fixture = storageFixture();
    const store = createGuideConversationStore(fixture.storage);
    const messages = [
      { id: "u", role: "user", kind: "message", text: "Question", authToken: "private" },
      { id: "a", role: "assistant", kind: "message", text: "Answer", latitude: 53.86,
        sources: [{ ...source, url: "javascript:alert(1)", storageKey: "private-object" }, source] },
    ] as unknown as Parameters<typeof store.save>[2];
    await store.save("lubeck", "holstentor", messages);
    const raw = fixture.records.get("citywalk:guide:1:lubeck:holstentor")!;
    expect(raw).not.toContain("authToken");
    expect(raw).not.toContain("latitude");
    expect(raw).not.toContain("private-object");
    expect(raw).not.toContain("javascript:");
    expect((await store.load("lubeck", "holstentor"))[1]?.sources).toEqual([source]);
  });

  it("recovers from version and role corruption without leaking another conversation", async () => {
    const fixture = storageFixture();
    const store = createGuideConversationStore(fixture.storage);
    const key = "citywalk:guide:1:hamburg:hamburg-rathaus";
    fixture.records.set(key, JSON.stringify({ version: 99, citySlug: "hamburg", placeSlug: "hamburg-rathaus", messages: [] }));
    expect(await store.load("hamburg", "hamburg-rathaus")).toEqual([]);
    fixture.records.set(key, JSON.stringify({ version: 1, citySlug: "hamburg", placeSlug: "hamburg-rathaus", messages: [
      { id: "a", role: "assistant", kind: "message", text: "Unpaired answer" },
      { id: "u", role: "user", kind: "message", text: "Unanswered question" },
    ] }));
    expect(await createGuideConversationStore(fixture.storage).load("hamburg", "hamburg-rathaus")).toEqual([]);
  });
});
