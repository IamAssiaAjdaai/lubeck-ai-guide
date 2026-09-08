import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canUseCityPremiumFeature,
  getCityPassAccessState,
  requireCityPass,
  type CityPassAccessDependencies,
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
        { userId: "user-1", citySlug: "lubeck" },
        dependencies({ active: true }),
      ),
    ).resolves.toBe(true);
    const expiresAt = new Date("2030-01-04T12:00:00Z");
    await expect(
      getCityPassAccessState(
        { userId: "user-1", citySlug: "lubeck" },
        dependencies({ active: true, expiresAt }),
      ),
    ).resolves.toEqual({ active: true, expiresAt });
  });

  it.each(["expired", "revoked", "none"])(
    "denies %s access returned by the trusted repository",
    async () => {
      await expect(
        canUseCityPremiumFeature(
          { userId: "user-1", citySlug: "lubeck" },
          dependencies({ active: false }),
        ),
      ).resolves.toBe(false);
    },
  );

  it("denies guests without querying for an entitlement", async () => {
    const deps = dependencies({ active: true });
    await expect(
      canUseCityPremiumFeature({ citySlug: "lubeck" }, deps),
    ).resolves.toBe(false);
    expect(deps.findAccess).not.toHaveBeenCalled();
  });

  it("fails closed from the reusable requirement helper", async () => {
    await expect(
      requireCityPass(
        { userId: "user-1", citySlug: "lubeck" },
        dependencies({ active: false }),
      ),
    ).rejects.toMatchObject({ message: "CITY_PASS_REQUIRED" });
  });
});
