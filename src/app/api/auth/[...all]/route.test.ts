// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  reportAuthFailure: vi.fn(),
  emitOperationalFailure: vi.fn(),
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: mocks.get,
    POST: mocks.post,
  }),
}));

vi.mock("@/lib/auth/server", () => ({
  getAuth: mocks.getAuth,
}));

vi.mock("@/lib/auth/authFailureTelemetry", () => ({
  reportAuthFailure: mocks.reportAuthFailure,
}));

vi.mock("@/lib/operations/operationalEvent", () => ({
  emitOperationalFailure: mocks.emitOperationalFailure,
}));

import { GET, POST } from "./route";

describe("public auth API telemetry wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuth.mockReturnValue({});
  });

  it("reports failed POST status without inspecting the response body", async () => {
    const response = new Response(
      JSON.stringify({
        email: "private@example.com",
        message: "invalid credentials",
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
    mocks.post.mockResolvedValue(response);
    const request = new Request(
      "https://getcitywalk.com/api/auth/sign-in/email",
      { method: "POST" },
    );

    const result = await POST(request);

    expect(result).toBe(response);
    expect(mocks.reportAuthFailure).toHaveBeenCalledWith(request, 401);
    expect(mocks.emitOperationalFailure).not.toHaveBeenCalled();
  });

  it("also observes provider callback failures on GET", async () => {
    const response = new Response(null, { status: 400 });
    mocks.get.mockResolvedValue(response);
    const request = new Request(
      "https://getcitywalk.com/api/auth/callback/google?code=secret",
    );

    const result = await GET(request);

    expect(result).toBe(response);
    expect(mocks.reportAuthFailure).toHaveBeenCalledWith(request, 400);
  });

  it("emits a fixed server failure event when Better Auth throws", async () => {
    mocks.post.mockRejectedValue(
      new Error("private@example.com secret-provider-detail"),
    );
    const request = new Request(
      "https://getcitywalk.com/api/auth/sign-in/email",
      { method: "POST" },
    );

    await expect(POST(request)).rejects.toThrow();

    expect(mocks.emitOperationalFailure).toHaveBeenCalledWith({
      category: "auth",
      code: "AUTH_SERVER_FAILED",
      severity: "error",
      retryable: true,
      httpStatus: 500,
    });
    expect(JSON.stringify(mocks.emitOperationalFailure.mock.calls)).not.toMatch(
      /private@example\.com|secret-provider-detail/,
    );
  });
});
