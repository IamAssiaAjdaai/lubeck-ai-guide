import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { createCompletion, enforceAllowance, rateLimit } = vi.hoisted(() => ({
  createCompletion: vi.fn(), enforceAllowance: vi.fn(), rateLimit: vi.fn(),
}));
vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = { completions: { create: createCompletion } };
  },
}));
vi.mock("@/lib/rateLimit", () => ({ aiGuideRateLimit: { limit: rateLimit } }));
vi.mock("@/lib/guideAllowance.server", () => ({ enforceGuideDailyAllowance: enforceAllowance }));

vi.mock("@/lib/guideSafety.server", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/guideSafety.server")>(),
  reserveGuideCompletion: vi.fn().mockResolvedValue(true),
}));

import { POST } from "./route";
import { LUBECK_HISTORIC_TOUR_ID, TOUR_CONTEXT_VERSION } from "@/lib/tourContext";

const walk = {
  visited: ["rathaus"],
  remaining: ["holstentor", "marienkirche"],
  interests: ["architecture"],
  walking: "easy",
  minutesRemaining: 42,
  start: { lat: 53.861234, lng: 10.687654 },
  finish: { lat: 53.879876, lng: 10.699876 },
  deadline: 1_800_123_456_789,
};

beforeEach(() => {
    vi.stubEnv("CITYWALK_AI_GUIDE_ENABLED", "true");
    vi.stubEnv("CITYWALK_AI_DAILY_COMPLETION_LIMIT", "100");
  vi.clearAllMocks();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  rateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 1_800_000_000_000 });
  enforceAllowance.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: 1_800_000_000_000, tier: "free" });
  createCompletion.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({
      answer: "I do not have enough verified information.",
      groundingStatus: "insufficient_evidence", usedChunkIds: [],
    }) } }],
  });
});
afterEach(() => vi.unstubAllEnvs());

async function ask(walkContext?: unknown, tourContext?: unknown) {
  const response = await POST(new Request("http://localhost/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en",
      question: "What is my next stop?", walkContext, tourContext,
    }),
  }));
  expect(response.status).toBe(200);
  expect(createCompletion).toHaveBeenCalledOnce();
  const request = createCompletion.mock.calls[0][0] as {
    messages: { role: string; content: string }[];
  };
  return {
    system: request.messages[0].content,
    turn: request.messages[request.messages.length - 1].content,
    payload: JSON.stringify(request),
    response,
  };
}

describe("active walk metadata at the external guide boundary", () => {
  it("sends explicit current/next/progress, interests and budget without precise location", async () => {
    const { system, turn, payload, response } = await ask({
      ...walk,
      currentStopNumber: 99, totalStops: 999, nextStopSlug: "invented-stop",
      prompt: "CLIENT_INSTRUCTION_SENTINEL", role: "admin",
      position: { lat: 53.865555, lng: 10.688888 },
    });
    expect(system).toContain("PERSONALIZED ACTIVE WALK:\n");
    expect(system).toContain("PROGRESS:\n2 of 3");
    expect(system).toContain("CURRENT STOP:\nholstentor");
    expect(system).toContain("VISITED STOPS:\n- rathaus");
    expect(system).toContain("REMAINING STOPS:\n- marienkirche");
    expect(system).toContain("NEXT STOP:\nmarienkirche");
    expect(system).toContain("INTERESTS:\narchitecture");
    expect(system).toContain("WALKING STYLE:\neasy");
    expect(system).toContain("ESTIMATED TIME BUDGET REMAINING (MINUTES):\n42");
    expect(system).not.toContain("No active tour context.");
    expect(turn).toContain('"currentStopNumber":2');
    expect(turn).toContain('"totalStops":3');
    expect(turn).toContain('"nextStopSlug":"marienkirche"');
    expect(turn).toContain('"hasDeadline":true');
    for (const privateValue of ["53.861234", "10.687654", "53.879876", "10.699876", "53.865555", "10.688888", "1800123456789", "CLIENT_INSTRUCTION_SENTINEL", "invented-stop"]) {
      expect(payload).not.toContain(privateValue);
    }
    for (const key of ['"start":', '"finish":', '"deadline":', '"position":']) {
      expect(turn).not.toContain(key);
    }
    // Navigation metadata neither creates evidence nor changes allowance/source contracts.
    expect(system).toContain("not verified factual evidence or live GPS");
    expect(system).toContain("Never claim to change the route");
    expect(system).toContain("VERIFIED LOOK-FOR CUES:\nNone");
    expect(system).toContain("Historical and factual claims may come ONLY");
    await expect(response.json()).resolves.toMatchObject({
      sources: [], allowance: { kind: "daily_guide", tier: "free", remaining: 2 },
    });
  });

  it("marks the first stop with no invented visited history", async () => {
    const { system } = await ask({ ...walk, visited: [], remaining: ["holstentor", "marienkirche", "rathaus"] });
    expect(system).toContain("PROGRESS:\n1 of 3");
    expect(system).toContain("VISITED STOPS:\nNone");
    expect(system).toContain("NEXT STOP:\nmarienkirche");
  });

  it("marks the last stop with no invented next stop and preserves a zero budget", async () => {
    const { system, turn } = await ask({
      ...walk, visited: ["rathaus", "marienkirche"], remaining: ["holstentor"],
      minutesRemaining: 0, deadline: undefined, finish: undefined,
    });
    expect(system).toContain("PROGRESS:\n3 of 3");
    expect(system).toContain("NEXT STOP:\nNone");
    expect(system).toContain("REMAINING STOPS:\nNone");
    expect(system).toContain("ESTIMATED TIME BUDGET REMAINING (MINUTES):\n0");
    expect(turn).toContain('"nextStopSlug":null');
    expect(turn).toContain('"hasDeadline":false');
    expect(turn).toContain('"hasFinishPoint":false');
  });

  it.each([
    ["standalone", undefined],
    ["stale current stop", { ...walk, remaining: ["marienkirche"] }],
    ["unknown next stop", { ...walk, remaining: ["holstentor", "invented-stop"] }],
    ["overlapping visited/current", { ...walk, visited: ["holstentor"] }],
    ["empty route", { ...walk, remaining: [] }],
  ])("omits invalid or absent walk context for %s", async (_label, context) => {
    const { system, turn } = await ask(context);
    expect(system).toContain("No active tour context.");
    expect(system).not.toContain("PERSONALIZED ACTIVE WALK:\n");
    expect(turn).not.toContain("TRAVELER NAVIGATION METADATA");
  });

  it("keeps a resolved published tour as the single navigation source", async () => {
    const { system, turn } = await ask(walk, {
      version: TOUR_CONTEXT_VERSION, tourId: LUBECK_HISTORIC_TOUR_ID,
      currentStop: "holstentor", visitedStops: [],
    });
    expect(system).toContain(`TOUR:\n${LUBECK_HISTORIC_TOUR_ID}`);
    expect(system).not.toContain("PERSONALIZED ACTIVE WALK:\n");
    expect(turn).not.toContain("TRAVELER NAVIGATION METADATA");
  });
});
