import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { hasCityUnlock } from "./cityUnlock.server";
beforeEach(() => { vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE", "sandbox"); vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET", "s".repeat(32)); vi.stubEnv("CITYWALK_NATIVE_SANDBOX_USERS", "owner,other"); vi.stubEnv("VERCEL_ENV", "preview"); });
afterEach(() => vi.unstubAllEnvs());
describe("canonical city unlock authorization", () => {
  it("authorizes the production City Pass from canonical city scope before any sandbox fallback", async () => {
    const findActive = vi.fn(async ({ scopeType, scopeKey }: { scopeType: string; scopeKey: string }) => scopeType === "city" && scopeKey === "lubeck");
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, { findActive })).toBe(true);
    expect(findActive).toHaveBeenCalledTimes(1);
    expect(findActive).toHaveBeenCalledWith({ userId: "owner", scopeType: "city", scopeKey: "lubeck", now: expect.any(Date) });
  });
  it("keeps the legacy feature entitlement tester-only as a sandbox fallback", async () => {
    const findActive = vi.fn(async ({ scopeType, scopeKey }: { scopeType: string; scopeKey: string }) => scopeType === "feature" && scopeKey === "city:luebeck:premium");
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, { findActive })).toBe(true);
    expect(findActive).toHaveBeenNthCalledWith(1, { userId: "owner", scopeType: "city", scopeKey: "lubeck", now: expect.any(Date) });
    expect(findActive).toHaveBeenNthCalledWith(2, { userId: "owner", scopeType: "feature", scopeKey: "city:luebeck:premium", now: expect.any(Date) });
  });
  it("does not accept the legacy fallback for a non-tester", async () => {
    vi.stubEnv("CITYWALK_NATIVE_SANDBOX_USERS", "owner");
    const findActive = vi.fn(async ({ scopeType }: { scopeType: string }) => scopeType === "feature");
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "other" }, { findActive })).toBe(false);
    expect(findActive).toHaveBeenCalledTimes(1);
    expect(findActive).toHaveBeenCalledWith({ userId: "other", scopeType: "city", scopeKey: "lubeck", now: expect.any(Date) });
  });
  it("rejects guests and unknown cities", async () => {
    const findActive = vi.fn(async () => true);
    expect(await hasCityUnlock({ citySlug: "lubeck" }, { findActive })).toBe(false);
    expect(await hasCityUnlock({ citySlug: "hamburg", userId: "owner" }, { findActive })).toBe(false);
    expect(findActive).not.toHaveBeenCalled();
  });
  it("fails closed for revoked/missing grants and repository errors", async () => {
    expect(await hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, {findActive: async () => false})).toBe(false);
    await expect(hasCityUnlock({ citySlug: "lubeck", userId: "owner" }, {findActive: async () => { throw new Error("offline"); }})).rejects.toThrow();
  });
});
