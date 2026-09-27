// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const calls = vi.hoisted(() => ({ limit: vi.fn(), redis: vi.fn(), config: vi.fn() }));
vi.mock("@upstash/redis", () => ({ Redis: class { constructor(config: unknown) { calls.redis(config); } } }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class {
  static slidingWindow = (count: number, window: string) => ({ count, window });
  constructor(config: unknown) { calls.config(config); }
  limit = calls.limit;
} }));
import { limitLifecycle } from "./rateLimit.server";
beforeEach(() => {
  vi.clearAllMocks(); calls.limit.mockResolvedValue({ success: true });
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://synthetic.example.test"); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "synthetic"); vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-auth-secret");
});
afterEach(() => vi.unstubAllEnvs());
it("uses shared atomic windows and keyed digests without personal data or analytics", async () => {
  await limitLifecycle("request", "private@example.test");
  expect(calls.limit.mock.calls).toEqual([["all"], [expect.stringMatching(/^[a-f0-9]{64}$/)]]);
  expect(calls.config).toHaveBeenLastCalledWith(expect.objectContaining({ analytics: false, limiter: { count: 3, window: "15 m" } }));
});
it("rejects a limited target without sending mail", async () => {
  calls.limit.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
  await expect(limitLifecycle("request", "a@example.test")).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
});
it("fails closed on missing configuration", async () => {
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", ""); await expect(limitLifecycle("request", "x")).rejects.toMatchObject({ code: "UNAVAILABLE" }); expect(calls.redis).not.toHaveBeenCalled();
});
it("sanitizes service failures without logging secret response details", async () => {
  calls.limit.mockRejectedValue(new Error("private endpoint/token")); await expect(limitLifecycle("delete", "x")).rejects.toThrow(/^UNAVAILABLE$/);
});

it("rejects Upstash's success:true timeout response instead of allowing a request", async () => {
  calls.limit.mockResolvedValue({ success: true, reason: "timeout" });
  await expect(limitLifecycle("request", "x")).rejects.toMatchObject({ code: "UNAVAILABLE", status: 503 });
  expect(calls.limit).toHaveBeenCalledOnce();
});
