import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rows: vi.fn(), unlock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: mocks.rows }) }) }) }) }) }));
vi.mock("./cityUnlock.server", () => ({ hasCityUnlock: mocks.unlock }));
import { canUseCityPremiumFeature } from "./cityPassAccess.server";
beforeEach(() => { vi.clearAllMocks(); mocks.rows.mockResolvedValue([]); mocks.unlock.mockResolvedValue(false); });
it("extends existing protected capabilities to the canonical server grant", async () => {
  mocks.unlock.mockResolvedValue(true);
  expect(await canUseCityPremiumFeature({ userId: "owner", citySlug: "lubeck", feature: "premium_audio" })).toBe(true);
  expect(mocks.unlock).toHaveBeenCalledWith({ userId: "owner", citySlug: "lubeck", now: expect.any(Date) });
});
it("preserves an active legacy purchaser's access without converting it to a permanent grant", async () => {
  mocks.rows.mockResolvedValue([{ status: "active", expiresAt: new Date("2099-01-01") }]);
  expect(await canUseCityPremiumFeature({ userId: "owner", citySlug: "lubeck", feature: "guide" })).toBe(true);
  expect(mocks.unlock).not.toHaveBeenCalled();
});
it("does not treat revoked legacy or canonical access as active", async () => {
  mocks.rows.mockResolvedValue([{ status: "revoked", expiresAt: null }]);
  expect(await canUseCityPremiumFeature({ userId: "owner", citySlug: "lubeck", feature: "guide" })).toBe(false);
});
