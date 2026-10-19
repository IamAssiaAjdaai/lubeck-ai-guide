// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ process: vi.fn(), apple: vi.fn(), revenuecat: vi.fn(), social: vi.fn() }));
vi.mock("@/lib/auth/lifecycle/externalAccountErasureWorker.server", () => ({ processExternalAccountErasureJobs: mocks.process }));
vi.mock("@/lib/commerce/revenueCatCustomerErasure.server", () => ({ createRevenueCatCustomerEraser: mocks.revenuecat }));
vi.mock("@/lib/auth/lifecycle/appleTokenRevocation.server", async original => ({
  ...await original<typeof import("@/lib/auth/lifecycle/appleTokenRevocation.server")>(), createAppleTokenRevocationEraser: mocks.apple,
}));
vi.mock("@/lib/auth/socialProviders.server", () => ({ getCitywalkSocialAuthConfiguration: mocks.social }));
import { runScheduledAccountErasures } from "./accountErasureSchedule";

const appleEnv = {
  BETTER_AUTH_SECRET: "synthetic-auth-secret", CITYWALK_APPLE_OAUTH_CLIENT_ID: "synthetic.service",
  CITYWALK_APPLE_TEAM_ID: "synthetic-team", CITYWALK_APPLE_KEY_ID: "synthetic-key",
  CITYWALK_APPLE_PRIVATE_KEY: "synthetic-private-key", CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: "synthetic.app",
};
const rcEnv = { COMMERCE_REVENUECAT_SECRET_API_KEY: "synthetic-rc-secret" };
const counts = { claimed: 1, completed: 1, failed: 0, lostLeases: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.apple.mockReturnValue({ provider: "apple", erase: vi.fn() });
  mocks.revenuecat.mockReturnValue({ provider: "revenuecat", erase: vi.fn() });
  mocks.process.mockResolvedValue(counts);
});
describe("scheduled account erasure orchestration (mocked only)", () => {
  it("skips missing/partial configuration without creating workers or providers", async () => {
    for (const env of [{}, { BETTER_AUTH_SECRET: "synthetic" }, { CITYWALK_APPLE_TEAM_ID: "synthetic" }]) {
      await expect(runScheduledAccountErasures(env)).resolves.toEqual({ status: "skipped_not_configured" });
    }
    expect(mocks.process).not.toHaveBeenCalled();
    expect(mocks.apple).not.toHaveBeenCalled();
    expect(mocks.revenuecat).not.toHaveBeenCalled();
    expect(mocks.social).not.toHaveBeenCalled();
  });
  it("processes RevenueCat despite absent or partial Apple configuration", async () => {
    const result = await runScheduledAccountErasures({ ...rcEnv, CITYWALK_APPLE_KEY_ID: "partial-apple" });
    expect(result).toEqual({ status: "processed", ...counts, providers: { revenuecat: counts } });
    expect(mocks.process).toHaveBeenCalledWith({ erasers: [mocks.revenuecat.mock.results[0].value], batchSize: 10 });
    expect(mocks.revenuecat).toHaveBeenCalledWith({ apiKey: rcEnv.COMMERCE_REVENUECAT_SECRET_API_KEY });
    expect(mocks.apple).not.toHaveBeenCalled();
    expect(mocks.social).not.toHaveBeenCalled();
  });
  it("processes Apple without RevenueCat and defers signing into the per-job boundary", async () => {
    const env = { ...appleEnv, CITYWALK_GOOGLE_OAUTH_CLIENT_ID: "unrelated-partial-google" };
    await expect(runScheduledAccountErasures(env)).resolves.toEqual({ status: "processed", ...counts, providers: { apple: counts } });
    expect(mocks.revenuecat).not.toHaveBeenCalled();
    expect(mocks.social).not.toHaveBeenCalled();
    const factory = vi.fn().mockResolvedValue({ clientId: "synthetic-client", clientSecret: "synthetic-jwt", appBundleIdentifier: "synthetic.app" });
    mocks.social.mockReturnValue({ socialProviders: { apple: factory } });
    const options = mocks.apple.mock.calls[0][0];
    expect(options.secret).toBe(appleEnv.BETTER_AUTH_SECRET);
    await expect(options.getProvider()).resolves.toEqual({ clientId: "synthetic-client", clientSecret: "synthetic-jwt" });
    expect(mocks.social.mock.calls[0][0]).not.toHaveProperty("CITYWALK_GOOGLE_OAUTH_CLIENT_ID");
    expect(mocks.social.mock.calls[0][0]).not.toHaveProperty("BETTER_AUTH_SECRET");
  });
  it("does not silently accept a missing Apple factory", async () => {
    await runScheduledAccountErasures(appleEnv);
    mocks.social.mockReturnValue({ socialProviders: {} });
    await expect(mocks.apple.mock.calls[0][0].getProvider()).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });
  it.each(["apple", "revenuecat"])("continues the other provider when %s jobs fail", async provider => {
    const failed = { claimed: 2, completed: 0, failed: 2, lostLeases: 0 };
    mocks.process.mockImplementation(async ({ erasers }) => erasers[0].provider === provider ? failed : counts);
    const result = await runScheduledAccountErasures({ ...appleEnv, ...rcEnv });
    expect(result).toEqual({ status: "processed", claimed: 3, completed: 1, failed: 2, lostLeases: 0,
      providers: { apple: provider === "apple" ? failed : counts, revenuecat: provider === "revenuecat" ? failed : counts } });
    expect(mocks.process).toHaveBeenCalledTimes(2);
    expect(mocks.process.mock.calls.map(([input]) => input.erasers.map((eraser: { provider: string }) => eraser.provider))).toEqual([["apple"], ["revenuecat"]]);
  });
  it("retains lost-lease counts and empty queue results", async () => {
    const lost = { claimed: 1, completed: 0, failed: 0, lostLeases: 1 };
    mocks.process.mockResolvedValueOnce(lost).mockResolvedValueOnce({ claimed: 0, completed: 0, failed: 0, lostLeases: 0 });
    expect(await runScheduledAccountErasures({ ...appleEnv, ...rcEnv })).toMatchObject({ claimed: 1, completed: 0, failed: 0, lostLeases: 1 });
  });
  it("sanitizes unexpected worker/database failures", async () => {
    mocks.process.mockRejectedValue(new Error("postgres://private:secret@host/db account-id"));
    await expect(runScheduledAccountErasures(rcEnv)).rejects.toThrow(/^ACCOUNT_ERASURE_SCHEDULE_FAILED$/);
  });
  it("contains Apple signing failure in the worker while RevenueCat proceeds", async () => {
    mocks.social.mockReturnValue({ socialProviders: { apple: async () => { throw new Error("synthetic-secret-in-signing-error"); } } });
    mocks.process.mockImplementation(async ({ erasers }) => {
      if (erasers[0].provider === "revenuecat") return counts;
      await expect(mocks.apple.mock.calls[0][0].getProvider()).rejects.toThrow("synthetic-secret-in-signing-error");
      return { claimed: 1, completed: 0, failed: 1, lostLeases: 0 };
    });
    await expect(runScheduledAccountErasures({ ...appleEnv, ...rcEnv })).resolves.toMatchObject({ claimed: 2, completed: 1, failed: 1 });
  });
});
