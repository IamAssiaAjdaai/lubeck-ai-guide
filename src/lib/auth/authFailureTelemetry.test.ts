import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emitOperationalFailure: vi.fn(),
}));

vi.mock("@/lib/operations/operationalEvent", () => ({
  emitOperationalFailure: mocks.emitOperationalFailure,
}));

import {
  classifyAuthFailure,
  reportAuthFailure,
} from "./authFailureTelemetry";

describe("auth failure telemetry", () => {
  it.each([
    ["/api/auth/sign-in/email", 401, "AUTH_SIGN_IN_FAILED"],
    ["/api/auth/sign-in/email", 429, "AUTH_RATE_LIMITED"],
    ["/api/auth/callback/google", 400, "AUTH_PROVIDER_CALLBACK_FAILED"],
    ["/api/auth/request-password-reset", 400, "AUTH_RECOVERY_FAILED"],
    ["/api/auth/reset-password", 400, "AUTH_RECOVERY_FAILED"],
    ["/api/auth/sign-up/email", 400, "AUTH_REQUEST_REJECTED"],
    ["/api/auth/sign-in/email", 503, "AUTH_SERVER_FAILED"],
  ])("classifies %s / %s without reading payloads", (path, status, code) => {
    const request = new Request(
      `https://getcitywalk.com${path}?email=private@example.com&token=secret-token`,
      {
        method: "POST",
        body: JSON.stringify({
          email: "private@example.com",
          password: "super-secret-password",
        }),
        headers: { "content-type": "application/json" },
      },
    );

    expect(classifyAuthFailure(request, status)).toMatchObject({ code });
  });

  it("does not emit telemetry for successful responses", () => {
    const request = new Request(
      "https://getcitywalk.com/api/auth/sign-in/email",
      { method: "POST" },
    );

    reportAuthFailure(request, 200);

    expect(mocks.emitOperationalFailure).not.toHaveBeenCalled();
  });

  it("emits only fixed code/status metadata for a failed sign-in", () => {
    const request = new Request(
      "https://getcitywalk.com/api/auth/sign-in/email?email=private@example.com",
      {
        method: "POST",
        body: JSON.stringify({
          email: "private@example.com",
          password: "super-secret-password",
        }),
        headers: { "content-type": "application/json" },
      },
    );

    reportAuthFailure(request, 401);

    expect(mocks.emitOperationalFailure).toHaveBeenCalledWith({
      category: "auth",
      code: "AUTH_SIGN_IN_FAILED",
      severity: "warning",
      retryable: false,
      httpStatus: 401,
    });

    const serialized = JSON.stringify(mocks.emitOperationalFailure.mock.calls);
    expect(serialized).not.toMatch(
      /private@example\.com|super-secret-password|secret-token/,
    );
  });
});
