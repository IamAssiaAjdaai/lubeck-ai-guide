// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls = vi.hoisted(() => ({
  consume: vi.fn(),
}));

vi.mock("@/lib/databaseRateLimit.server", () => ({
  consumeDatabaseRateLimit: calls.consume,
}));

import { limitLifecycle } from "./rateLimit.server";

beforeEach(() => {
  vi.clearAllMocks();
  calls.consume.mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60_000,
  });
  vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-auth-secret");
});

afterEach(() => vi.unstubAllEnvs());

it("uses shared database windows for global and personal limits", async () => {
  await limitLifecycle("request", "private@example.test");

  expect(calls.consume).toHaveBeenNthCalledWith(1, {
    scope: "citywalk-account-request-global",
    identifier: "all",
    maxRequests: 60,
    windowMs: 15 * 60 * 1_000,
  });
  expect(calls.consume).toHaveBeenNthCalledWith(2, {
    scope: "citywalk-account-request",
    identifier: "private@example.test",
    maxRequests: 3,
    windowMs: 15 * 60 * 1_000,
  });
});

it("rejects a limited target without continuing", async () => {
  calls.consume
    .mockResolvedValueOnce({
      success: true,
      limit: 60,
      remaining: 59,
      reset: 123,
    })
    .mockResolvedValueOnce({
      success: false,
      limit: 3,
      remaining: 0,
      reset: 123,
    });

  await expect(limitLifecycle("request", "a@example.test")).rejects.toMatchObject({
    code: "RATE_LIMITED",
    status: 429,
  });
});

it("fails closed on missing auth-secret configuration", async () => {
  vi.stubEnv("BETTER_AUTH_SECRET", "");

  await expect(limitLifecycle("request", "x")).rejects.toMatchObject({
    code: "UNAVAILABLE",
  });
  expect(calls.consume).not.toHaveBeenCalled();
});

it("sanitizes database failures", async () => {
  calls.consume.mockRejectedValue(new Error("private database detail"));

  await expect(limitLifecycle("delete", "x")).rejects.toThrow(/^UNAVAILABLE$/);
});
