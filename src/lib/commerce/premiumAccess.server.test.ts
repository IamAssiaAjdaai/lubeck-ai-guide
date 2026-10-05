import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canUsePaidCityFeature,
  hasPremiumAccess,
  requirePaidCityAccess,
  resolveCitywalkPaidAccess,
  type CitywalkPaidAccessDependencies,
} from "@/lib/commerce/premiumAccess.server";

function dependencies({
  premium = false,
  cityPass = false,
}: {
  premium?: boolean;
  cityPass?: boolean;
} = {}): CitywalkPaidAccessDependencies {
  return {
    hasPremiumEntitlement: vi.fn().mockResolvedValue(premium),
    hasCityPass: vi.fn().mockResolvedValue(cityPass),
  };
}

describe("CITYWALK paid access resolver", () => {
  it("keeps guests free without consulting paid sources", async () => {
    const deps = dependencies({ premium: true, cityPass: true });
    await expect(
      resolveCitywalkPaidAccess({ citySlug: "lubeck" }, deps),
    ).resolves.toEqual({
      tier: "free",
      premium: false,
      cityPass: false,
    });
    expect(deps.hasPremiumEntitlement).not.toHaveBeenCalled();
    expect(deps.hasCityPass).not.toHaveBeenCalled();
  });

  it("gives global Premium precedence over a city pass", async () => {
    const deps = dependencies({ premium: true, cityPass: true });
    await expect(
      resolveCitywalkPaidAccess(
        { userId: "user-1", citySlug: "lubeck" },
        deps,
      ),
    ).resolves.toEqual({
      tier: "premium",
      premium: true,
      cityPass: false,
    });
    expect(deps.hasCityPass).not.toHaveBeenCalled();
  });

  it("falls back to city-scoped pass access when Premium is absent", async () => {
    await expect(
      resolveCitywalkPaidAccess(
        { userId: "user-1", citySlug: "lubeck" },
        dependencies({ cityPass: true }),
      ),
    ).resolves.toEqual({
      tier: "city_pass",
      premium: false,
      cityPass: true,
    });
  });

  it("fails closed when neither paid source is active", async () => {
    const deps = dependencies();
    await expect(
      canUsePaidCityFeature(
        {
          userId: "user-1",
          citySlug: "lubeck",
          feature: "premium_audio",
        },
        deps,
      ),
    ).resolves.toBe(false);
    await expect(
      requirePaidCityAccess(
        { userId: "user-1", citySlug: "lubeck" },
        deps,
      ),
    ).rejects.toMatchObject({ message: "PAID_CITY_ACCESS_REQUIRED" });
  });

  it("recognizes global Premium independently of a city", async () => {
    await expect(
      hasPremiumAccess(
        { userId: "user-1" },
        dependencies({ premium: true }),
      ),
    ).resolves.toBe(true);
  });
});
