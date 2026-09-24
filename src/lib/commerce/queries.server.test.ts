import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getActiveCityPassOffer,
  type CityPassOfferDependencies,
} from "@/lib/commerce/queries.server";

describe("city-scoped pass offers", () => {
  it("looks up an active offer using the supplied city rather than Lübeck", async () => {
    const findActiveOffer = vi.fn(async (citySlug: string) =>
      citySlug === "test-city"
        ? {
            priceId: 22,
            productSlug: "test-city-pass",
            productName: "Test City Pass",
            description: null,
            currency: "eur",
            unitAmount: 500,
            durationDays: 2,
          }
        : undefined,
    );
    const dependencies: CityPassOfferDependencies = { findActiveOffer };

    await expect(
      getActiveCityPassOffer("test-city", dependencies),
    ).resolves.toMatchObject({ productSlug: "test-city-pass" });
    await expect(
      getActiveCityPassOffer("lubeck", dependencies),
    ).resolves.toBeUndefined();
    expect(findActiveOffer).toHaveBeenNthCalledWith(1, "test-city");
    expect(findActiveOffer).toHaveBeenNthCalledWith(2, "lubeck");
  });

  it("fails closed before repository access for an invalid city identity", async () => {
    const dependencies: CityPassOfferDependencies = {
      findActiveOffer: vi.fn(),
    };
    await expect(
      getActiveCityPassOffer("../admin", dependencies),
    ).resolves.toBeUndefined();
    expect(dependencies.findActiveOffer).not.toHaveBeenCalled();
  });
});
