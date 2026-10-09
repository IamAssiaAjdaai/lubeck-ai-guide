import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/databaseRateLimit.server", () => ({
  consumeDatabaseRateLimit: vi.fn(),
}));

import type { AiContentQaInput } from "./aiReview";
import {
  CONTENT_QA_GROQ_LIMITS,
  createBudgetedGroqContentQaReviewer,
  sendGroqContentQaCompletion,
  type GroqContentQaDependencies,
} from "./groqReview.server";

const contentInput: AiContentQaInput = {
  contentType: "generic_newsletter",
  fields: [{ key: "description", value: "Museum closes at 17:00." }],
  claims: [{
    id: "claim-1",
    text: "Museum closes at 17:00",
    affectedField: "description",
    sourceFactIds: ["fact-1"],
  }],
  allowedFactIds: ["fact-1"],
  verifiedFacts: [{
    id: "fact-1",
    statement: "Museum closes at 16:00.",
    sourceReferenceIds: ["source-1"],
  }],
  sourceReferences: [{ id: "source-1", label: "Verified hours" }],
};

function deps(overrides: Partial<GroqContentQaDependencies> = {}): GroqContentQaDependencies {
  return {
    enabled: true,
    apiKey: "fake-for-tests",
    consumeLimit: vi.fn(async () => ({ success: true })),
    complete: vi.fn(async () => JSON.stringify({ findings: [] })),
    ...overrides,
  };
}

describe("budgeted server-only Groq QA adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not call provider or DB when the feature flag is disabled", async () => {
    const dep = deps({ enabled: false });
    const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, "staff-1");
    expect(report.aiStatus).toBe("skipped");
    expect(report.factualCertification).toBe("not_certified");
    expect(report.findings.map((x) => x.checkId)).toContain("ai.disabled");
    expect(dep.consumeLimit).not.toHaveBeenCalled();
    expect(dep.complete).not.toHaveBeenCalled();
  });

  it("skips safely when the key is missing", async () => {
    const dep = deps({ apiKey: "" });
    const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, "staff-1");
    expect(report.findings.map((x) => x.checkId)).toContain("ai.not_configured");
    expect(dep.consumeLimit).not.toHaveBeenCalled();
  });

  it("rejects a missing or invalid server-derived staff identity", async () => {
    const dep = deps();
    for (const actor of ["", "   ", "x".repeat(129)]) {
      const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, actor);
      expect(report.findings.map((x) => x.checkId)).toContain("ai.invalid_actor");
    }
    expect(dep.consumeLimit).not.toHaveBeenCalled();
  });

  it("does not charge quota or call provider for missing or invalid evidence", async () => {
    const dep = deps();
    const report = await createBudgetedGroqContentQaReviewer(dep)(
      { fields: [{ key: "title", value: "Hello" }] },
      "staff-1",
    );
    expect(report.aiStatus).toBe("skipped");
    expect(report.findings.map((x) => x.checkId)).toContain("ai.evidence_unavailable");
    expect(dep.consumeLimit).not.toHaveBeenCalled();
    expect(dep.complete).not.toHaveBeenCalled();
  });

  it("does not charge quota if the provider prompt exceeds the smaller budget", async () => {
    const dep = deps();
    const report = await createBudgetedGroqContentQaReviewer(dep)(
      { ...contentInput, fields: [{ key: "description", value: "x".repeat(15_000) }], claims: [] },
      "staff-1",
    );
    expect(report.findings.map((x) => x.checkId)).toContain("ai.provider_input_too_long");
    expect(dep.consumeLimit).not.toHaveBeenCalled();
  });

  it("enforces burst, per-staff daily and global daily limits before one completion", async () => {
    const dep = deps();
    const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, "staff-1");
    expect(report).toMatchObject({
      aiStatus: "reviewed",
      factualCertification: "not_certified",
      findings: [],
    });
    expect(dep.consumeLimit).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(dep.consumeLimit).mock.calls.map(([input]) => input);
    expect(calls).toEqual([
      expect.objectContaining({ scope: "citywalk-content-qa-actor-10m", identifier: "staff-1", maxRequests: 3 }),
      expect.objectContaining({ scope: "citywalk-content-qa-actor-day", identifier: "staff-1", maxRequests: 12 }),
      expect.objectContaining({ scope: "citywalk-content-qa-global-day", identifier: "all-staff", maxRequests: 60 }),
    ]);
    expect(dep.complete).toHaveBeenCalledOnce();
  });

  it.each([1, 2, 3])("stops before provider when budget gate %s is exhausted", async (gate) => {
    let count = 0;
    const dep = deps({
      consumeLimit: vi.fn(async () => ({ success: ++count !== gate })),
    });
    const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, "staff-1");
    expect(report.aiStatus).toBe("skipped");
    expect(report.findings.map((x) => x.checkId)).toContain("ai.rate_limited");
    expect(dep.consumeLimit).toHaveBeenCalledTimes(gate);
    expect(dep.complete).not.toHaveBeenCalled();
  });

  it("fails closed on a broken shared PostgreSQL limiter", async () => {
    const dep = deps({
      consumeLimit: vi.fn(async () => { throw new Error("DATABASE_URL=private"); }),
    });
    const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, "staff-1");
    expect(report).toMatchObject({ aiStatus: "skipped", factualCertification: "not_certified" });
    expect(report.findings.map((x) => x.checkId)).toContain("ai.rate_limit_unavailable");
    expect(JSON.stringify(report)).not.toContain("DATABASE_URL");
    expect(dep.complete).not.toHaveBeenCalled();
  });

  it("does not expose provider exceptions or retry when a call fails", async () => {
    const dep = deps({
      complete: vi.fn(async () => { throw new Error("secret provider credentials"); }),
    });
    const report = await createBudgetedGroqContentQaReviewer(dep)(contentInput, "staff-1");
    expect(report.aiStatus).toBe("failed");
    expect(report.findings.map((x) => x.checkId)).toContain("ai.review_unavailable");
    expect(JSON.stringify(report)).not.toContain("secret provider credentials");
    expect(dep.complete).toHaveBeenCalledOnce();
  });

  it("runs deterministic QA even on a rate limit rejection", async () => {
    const dep = deps({ consumeLimit: vi.fn(async () => ({ success: false })) });
    const report = await createBudgetedGroqContentQaReviewer(dep)(
      { ...contentInput, fields: [{ key: "description", value: "", required: true }] },
      "staff-1",
    );
    expect(report.findings.map((x) => x.checkId)).toEqual(["field.required", "ai.rate_limited"]);
    expect(report.factualCertification).toBe("not_certified");
  });
});

describe("fixed Groq provider transport", () => {
  it("sends a single non-streaming fixed-model JSON-mode request with bounded output", async () => {
    const mockFetch = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ finish_reason: "stop", message: { content: "{\"findings\":[]}" } }],
    }), { status: 200 }));
    const result = await sendGroqContentQaCompletion(
      { system: "Policy", user: "{\"contentType\":\"generic\"}" },
      "fake-for-tests",
      mockFetch as unknown as typeof fetch,
    );
    expect(result).toBe("{\"findings\":[]}");
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer fake-for-tests");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: CONTENT_QA_GROQ_LIMITS.model,
      stream: false,
      max_completion_tokens: CONTENT_QA_GROQ_LIMITS.maxOutputTokens,
      response_format: { type: "json_object" },
    });
    expect(body.tools).toBeUndefined();
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
  });

  it("refuses non-2xx, truncated, oversized and invalid provider output", async () => {
    const prompt = { system: "Policy", user: "Payload" };
    const fail = async (response: Response) =>
      sendGroqContentQaCompletion(
        prompt,
        "test-key",
        vi.fn(async () => response) as unknown as typeof fetch,
      );
    await expect(fail(new Response("rate limit", { status: 429 }))).rejects.toThrow();
    await expect(fail(new Response(JSON.stringify({
      choices: [{ finish_reason: "length", message: { content: "{\"findings\":[]}" } }],
    })))).rejects.toThrow();
    await expect(fail(new Response("{}", { headers: { "content-length": "40000" } }))).rejects.toThrow();
    await expect(fail(new Response("{}"))).rejects.toThrow();
  });

  it("refuses empty credentials and input beyond the provider budget", async () => {
    const request = vi.fn();
    await expect(sendGroqContentQaCompletion({ system: "x", user: "y" }, "", request)).rejects.toThrow();
    await expect(sendGroqContentQaCompletion({ system: "x", user: "z".repeat(13_000) }, "abc", request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
