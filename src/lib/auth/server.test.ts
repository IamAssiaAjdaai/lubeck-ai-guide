import { describe, expect, it, vi } from "vitest";

const { createCitywalkAuth, hasRequestDatabase } = vi.hoisted(() => ({
  createCitywalkAuth: vi.fn(),
  hasRequestDatabase: vi.fn(() => false),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ hasRequestDatabase }));
vi.mock("./factory.server", () => ({
  createCitywalkAuth,
  AUTH_ROUTE_PATH: "/api/auth",
  PUBLIC_EMAIL_SIGN_UP_ENABLED: true,
}));

describe("request-time auth initialization", () => {
  it("imports without configuration, caches plain Node auth, and keeps Worker auth request-scoped", async () => {
    const { getAuth } = await import("./server");
    expect(createCitywalkAuth).not.toHaveBeenCalled();

    createCitywalkAuth.mockImplementationOnce(() => {
      throw new Error("BETTER_AUTH_SECRET must be configured");
    });
    expect(() => getAuth()).toThrow(/BETTER_AUTH_SECRET/);

    const configuredAuth = { api: { getSession: vi.fn() } };
    createCitywalkAuth.mockReturnValue(configuredAuth);
    expect(getAuth()).toBe(configuredAuth);
    expect(getAuth()).toBe(configuredAuth);
    expect(createCitywalkAuth).toHaveBeenCalledTimes(2);

    hasRequestDatabase.mockReturnValue(true);
    const firstRequestAuth = { api: { getSession: vi.fn() } };
    const secondRequestAuth = { api: { getSession: vi.fn() } };
    createCitywalkAuth
      .mockReturnValueOnce(firstRequestAuth)
      .mockReturnValueOnce(secondRequestAuth);

    expect(getAuth()).toBe(firstRequestAuth);
    expect(getAuth()).toBe(secondRequestAuth);
    expect(createCitywalkAuth).toHaveBeenCalledTimes(4);
  });
});
