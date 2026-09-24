import { describe, expect, it, vi } from "vitest";

const { createCitywalkAuth } = vi.hoisted(() => ({ createCitywalkAuth: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./factory.server", () => ({
  createCitywalkAuth,
  AUTH_ROUTE_PATH: "/api/auth",
  PUBLIC_EMAIL_SIGN_UP_ENABLED: true,
}));

describe("request-time auth initialization", () => {
  it("imports without configuration but validates at first use and retries after failure", async () => {
    const { getAuth } = await import("./server");
    expect(createCitywalkAuth).not.toHaveBeenCalled();
    createCitywalkAuth.mockImplementationOnce(() => { throw new Error("BETTER_AUTH_SECRET must be configured"); });
    expect(() => getAuth()).toThrow(/BETTER_AUTH_SECRET/);
    const configuredAuth = { api: { getSession: vi.fn() } };
    createCitywalkAuth.mockReturnValue(configuredAuth);
    expect(getAuth()).toBe(configuredAuth);
    expect(getAuth()).toBe(configuredAuth);
    expect(createCitywalkAuth).toHaveBeenCalledTimes(2);
  });
});
