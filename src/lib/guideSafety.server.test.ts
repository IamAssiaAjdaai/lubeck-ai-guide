import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const consume = vi.hoisted(() => vi.fn());
vi.mock("./databaseRateLimit.server", () => ({ consumeDatabaseRateLimit: consume }));
import { guideCompletionBudget, readGuideBody, reserveGuideCompletion } from "./guideSafety.server";

describe("public AI safety", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("requires explicit approval and bounded completion capacity", () => {
    expect(guideCompletionBudget({})).toBeUndefined();
    expect(guideCompletionBudget({ CITYWALK_AI_DAILY_COMPLETION_LIMIT: "10" })).toBeUndefined();
    for (const limit of ["", "0", "-1", "1.5", "Infinity", "10001", "1e3"]) {
      expect(guideCompletionBudget({ CITYWALK_AI_GUIDE_ENABLED: "true", CITYWALK_AI_DAILY_COMPLETION_LIMIT: limit })).toBeUndefined();
    }
    expect(guideCompletionBudget({ CITYWALK_AI_GUIDE_ENABLED: "true", CITYWALK_AI_DAILY_COMPLETION_LIMIT: "10" })).toBe(10);
  });
  it("shares one database allowance across visitors and stops on exhaustion or database failure", async () => {
    consume.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false }).mockRejectedValueOnce(new Error("unavailable"));
    expect(await reserveGuideCompletion(10)).toBe(true);
    expect(await reserveGuideCompletion(10)).toBe(false);
    await expect(reserveGuideCompletion(10)).rejects.toThrow("unavailable");
    expect(consume).toHaveBeenCalledWith(expect.objectContaining({ scope: "citywalk-ai-global-completions", identifier: "all-public-guide-requests", maxRequests: 10 }));
  });
  it("bounds streamed bytes, rejects non-object JSON and accepts valid JSON", async () => {
    const request = (body: string) => new Request("https://example.test/api/guide", { method: "POST", body });
    await expect(readGuideBody(request("x".repeat(16385)))).rejects.toMatchObject({ status: 413 });
    for (const value of ["null", "[]", "invalid"]) await expect(readGuideBody(request(value))).rejects.toMatchObject({ status: 400 });
    await expect(readGuideBody(request('{"question":"Hello"}'))).resolves.toEqual({ question: "Hello" });
  });
});
