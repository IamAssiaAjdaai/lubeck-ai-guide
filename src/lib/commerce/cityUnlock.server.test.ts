import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { hasCityUnlock } from "./cityUnlock.server";
beforeEach(() => { vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE", "sandbox"); vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET", "s".repeat(32)); vi.stubEnv("CITYWALK_NATIVE_SANDBOX_USERS", "owner,other"); vi.stubEnv("VERCEL_ENV", "preview"); });
afterEach(() => vi.unstubAllEnvs());
describe("canonical city unlock authorization", () => {
  it("checks the server account and feature scope, never legacy pass or price", async () => {
    const findActive = vi.fn(async () => true);
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, { findActive })).toBe(true);
    expect(findActive).toHaveBeenCalledWith({ userId: "owner", scopeType: "feature", scopeKey: "city:luebeck:premium", now: expect.any(Date) });
  });
  it("rejects guests, unknown cities and another user's grant", async () => {
    const findActive = vi.fn(async ({userId}: {userId: string}) => userId === "owner");
    expect(await hasCityUnlock({ citySlug: "lubeck" }, { findActive })).toBe(false);
    expect(await hasCityUnlock({ citySlug: "hamburg", userId: "owner" }, { findActive })).toBe(false);
    expect(findActive).not.toHaveBeenCalled();
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "other" }, { findActive })).toBe(false);
  });
  it("fails closed for revoked/missing grants and repository errors", async () => {
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, {findActive: async () => false})).toBe(false);
    await expect(hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, {findActive: async () => { throw new Error("offline"); }})).rejects.toThrow();
  });
});
