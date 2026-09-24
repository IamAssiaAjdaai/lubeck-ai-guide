import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canUseCityPremiumFeature,
  getCityPassAccessState,
  hasActiveCityPass,
  requireCityPass,
  resolveCityPassAccessState,
  type CityPassAccessDependencies,
  type CityPassAccessState,
} from "@/lib/commerce/cityPassAccess.server";

function dependencies(
  state: Awaited<ReturnType<CityPassAccessDependencies["findAccess"]>>,
): CityPassAccessDependencies {
  return { findAccess: vi.fn().mockResolvedValue(state) };
}

describe("city pass access policy", () => {
  it("allows permanent and currently unexpired server-backed access", async () => {
    await expect(
      canUseCityPremiumFeature(
        {
          userId: "user-1",
          citySlug: "lubeck",
          feature: "premium_audio",
        },
        dependencies({ status: "active", active: true }),
      ),
    ).resolves.toBe(true);
    const expiresAt = new Date("2030-01-04T12:00:00Z");
    await expect(
      getCityPassAccessState(
        { userId: "user-1", citySlug: "lubeck" },
        dependencies({ status: "active", active: true, expiresAt }),
      ),
    ).resolves.toEqual({ status: "active", active: true, expiresAt });
  });

  it.each(["expired", "revoked", "none"] as const)(
    "denies %s access returned by the trusted repository",
    async (status) => {
      await expect(
        canUseCityPremiumFeature(
          {
            userId: "user-1",
            citySlug: "lubeck",
            feature: "premium_audio",
          },
          dependencies({ status, active: false }),
        ),
      ).resolves.toBe(false);
    },
  );

  it("denies guests without querying for an entitlement", async () => {
    const deps = dependencies({ status: "active", active: true });
    await expect(
      canUseCityPremiumFeature(
        { citySlug: "lubeck", feature: "premium_audio" },
        deps,
      ),
    ).resolves.toBe(false);
    expect(deps.findAccess).not.toHaveBeenCalled();
  });

  it("fails closed from the reusable requirement helper", async () => {
    await expect(
      requireCityPass(
        { userId: "user-1", citySlug: "lubeck" },
        dependencies({ status: "none", active: false }),
      ),
    ).rejects.toMatchObject({ message: "CITY_PASS_REQUIRED" });
  });

  it("derives active, expired, revoked, and missing states without browser input", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(resolveCityPassAccessState([], now)).toEqual({
      status: "none",
      active: false,
    });
    expect(
      resolveCityPassAccessState(
        [{ status: "active", expiresAt: new Date("2029-12-31T23:59:59Z") }],
        now,
      ),
    ).toMatchObject({ status: "expired", active: false });
    expect(
      resolveCityPassAccessState(
        [{ status: "revoked", expiresAt: new Date("2030-01-03T00:00:00Z") }],
        now,
      ),
    ).toMatchObject({ status: "revoked", active: false });
    expect(
      resolveCityPassAccessState(
        [{ status: "active", expiresAt: new Date("2030-01-03T00:00:00Z") }],
        now,
      ),
    ).toMatchObject({ status: "active", active: true });
  });

  it("isolates city entitlements and authorizes either supplied city slug generically", async () => {
    const deps: CityPassAccessDependencies = {
      findAccess: vi.fn(async ({ citySlug }): Promise<CityPassAccessState> =>
        citySlug === "test-city"
          ? { status: "active", active: true }
          : { status: "none", active: false },
      ),
    };

    await expect(
      hasActiveCityPass(
        { userId: "user-1", citySlug: "test-city" },
        deps,
      ),
    ).resolves.toBe(true);
    await expect(
      hasActiveCityPass({ userId: "user-1", citySlug: "lubeck" }, deps),
    ).resolves.toBe(false);
    await expect(
      canUseCityPremiumFeature(
        {
          userId: "user-1",
          citySlug: "test-city",
          feature: "premium_audio",
        },
        deps,
      ),
    ).resolves.toBe(true);

    const inverseDeps: CityPassAccessDependencies = {
      findAccess: vi.fn(async ({ citySlug }): Promise<CityPassAccessState> =>
        citySlug === "lubeck"
          ? { status: "active", active: true }
          : { status: "none", active: false },
      ),
    };
    await expect(
      hasActiveCityPass(
        { userId: "user-1", citySlug: "test-city" },
        inverseDeps,
      ),
    ).resolves.toBe(false);
  });
});
