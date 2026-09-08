import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import {
  enforceGuideDailyAllowance,
  type GuideAllowanceDependencies,
} from "@/lib/guideAllowance.server";

const allowed = (limit: number) => ({
  success: true,
  limit,
  remaining: limit - 1,
  reset: 1234,
});

function dependencies(
  overrides: Partial<GuideAllowanceDependencies> = {},
): GuideAllowanceDependencies {
  return {
    getAuthenticatedUserId: vi.fn().mockResolvedValue(undefined),
    hasPremiumAccess: vi.fn().mockResolvedValue(false),
    limitDaily: vi.fn(async ({ maxRequests }) => allowed(maxRequests)),
    ...overrides,
  };
}

describe("verified AI daily allowance", () => {
  it("uses the 3-answer free visitor allowance", async () => {
    const deps = dependencies();
    const result = await enforceGuideDailyAllowance(
      {
        request: new Request("https://citywalk.example/api/guide"),
        citySlug: "lubeck",
        visitorId: "123e4567-e89b-42d3-a456-426614174000",
        fallbackIdentity: "127.0.0.1",
      },
      deps,
    );
    expect(result).toMatchObject({ tier: "free", limit: 3 });
    expect(deps.limitDaily).toHaveBeenCalledWith({
      citySlug: "lubeck",
      tier: "free",
      key: expect.stringMatching(/^visitor:[a-f0-9]{64}$/),
      maxRequests: 3,
    });
  });

  it("uses the 20-answer allowance only for an authenticated active pass", async () => {
    const deps = dependencies({
      getAuthenticatedUserId: vi.fn().mockResolvedValue("user-secret-id"),
      hasPremiumAccess: vi.fn().mockResolvedValue(true),
    });
    const result = await enforceGuideDailyAllowance(
      {
        request: new Request("https://citywalk.example/api/guide"),
        citySlug: "lubeck",
        fallbackIdentity: "127.0.0.1",
      },
      deps,
    );
    expect(result).toMatchObject({ tier: "premium", limit: 20 });
    expect(deps.limitDaily).toHaveBeenCalledWith({
      citySlug: "lubeck",
      tier: "premium",
      key: expect.stringMatching(/^user:[a-f0-9]{64}$/),
      maxRequests: 20,
    });
    expect(JSON.stringify(vi.mocked(deps.limitDaily).mock.calls)).not.toContain(
      "user-secret-id",
    );
  });

  it.each(["expired", "revoked", "missing"])(
    "keeps a %s entitlement on the free allowance",
    async () => {
      const deps = dependencies({
        getAuthenticatedUserId: vi.fn().mockResolvedValue("user-1"),
        hasPremiumAccess: vi.fn().mockResolvedValue(false),
      });
      const result = await enforceGuideDailyAllowance(
        {
          request: new Request("https://citywalk.example/api/guide"),
          citySlug: "lubeck",
          fallbackIdentity: "127.0.0.1",
        },
        deps,
      );
      expect(result.tier).toBe("free");
      expect(deps.limitDaily).toHaveBeenCalledWith(
        expect.objectContaining({ citySlug: "lubeck", tier: "free" }),
      );
    },
  );

  it("keeps identifiers and quotas scoped to the requested city", async () => {
    const deps = dependencies();
    await enforceGuideDailyAllowance(
      {
        request: new Request("https://citywalk.example/api/guide"),
        citySlug: "test-city",
        visitorId: "123e4567-e89b-42d3-a456-426614174000",
        fallbackIdentity: "127.0.0.1",
      },
      deps,
    );
    expect(deps.hasPremiumAccess).not.toHaveBeenCalled();
    expect(deps.limitDaily).toHaveBeenCalledWith(
      expect.objectContaining({
        citySlug: "test-city",
        tier: "free",
        maxRequests: 3,
      }),
    );
  });

  it("uses premium AI allowance only for the requested entitled city", async () => {
    const deps = dependencies({
      getAuthenticatedUserId: vi.fn().mockResolvedValue("user-1"),
      hasPremiumAccess: vi.fn(async ({ citySlug }) => citySlug === "test-city"),
    });
    const request = new Request("https://citywalk.example/api/guide");

    await expect(
      enforceGuideDailyAllowance(
        {
          request,
          citySlug: "test-city",
          fallbackIdentity: "127.0.0.1",
        },
        deps,
      ),
    ).resolves.toMatchObject({ tier: "premium", limit: 20 });
    await expect(
      enforceGuideDailyAllowance(
        {
          request,
          citySlug: "lubeck",
          fallbackIdentity: "127.0.0.1",
        },
        deps,
      ),
    ).resolves.toMatchObject({ tier: "free", limit: 3 });
    expect(deps.hasPremiumAccess).toHaveBeenCalledWith({
      userId: "user-1",
      citySlug: "test-city",
      feature: "verified_ai_guide",
    });
  });
});
