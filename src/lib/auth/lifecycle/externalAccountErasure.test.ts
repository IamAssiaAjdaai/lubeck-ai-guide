import { describe, expect, it, vi } from "vitest";

import { eraseExternalAccountData } from "./externalAccountErasure";

describe("external account erasure", () => {
  it("passes the immutable CITYWALK user id to each provider eraser", async () => {
    const revenueCat = vi.fn().mockResolvedValue("erased" as const);
    const other = vi.fn().mockResolvedValue("not_found" as const);

    await expect(eraseExternalAccountData({
      userId: "user-123",
      erasers: [
        { provider: "revenuecat", erase: revenueCat },
        { provider: "other", erase: other },
      ],
    })).resolves.toEqual([
      { provider: "revenuecat", outcome: "erased" },
      { provider: "other", outcome: "not_found" },
    ]);

    expect(revenueCat).toHaveBeenCalledWith({ userId: "user-123" });
    expect(other).toHaveBeenCalledWith({ userId: "user-123" });
  });

  it("fails fast so a provider error cannot be reported as successful erasure", async () => {
    const first = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const second = vi.fn().mockResolvedValue("erased" as const);

    await expect(eraseExternalAccountData({
      userId: "user-123",
      erasers: [
        { provider: "revenuecat", erase: first },
        { provider: "other", erase: second },
      ],
    })).rejects.toThrow("provider unavailable");

    expect(second).not.toHaveBeenCalled();
  });
});
