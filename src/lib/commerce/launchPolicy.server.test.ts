import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getLaunchPolicy, hasLaunchCityAccess, LAUNCH_DURATION_MS } from "./launchPolicy.server";
import { canUsePaidCityFeature, requirePaidCityAccess, resolveCitywalkPaidAccess } from "./premiumAccess.server";
const start = "2030-01-01T00:00:00.000Z";
const env = {
  CITYWALK_LAUNCH_FREE_ENABLED: "1", CITYWALK_LAUNCH_START_UTC: start,
  CITYWALK_LAUNCH_APPROVED_AT_UTC: start, CITYWALK_LAUNCH_VERIFIED_PUBLIC_AT_UTC: start,
  CITYWALK_LAUNCH_APPROVAL_REFERENCE: "synthetic-review", CITYWALK_LAUNCH_AI_CALLS_PER_24H: "10",
};
const begin = Date.parse(start);
function configure() { for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value); }
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("launch policy", () => {
  it.each([[-1,false],[0,true],[LAUNCH_DURATION_MS-1,true],[LAUNCH_DURATION_MS,false],[LAUNCH_DURATION_MS+1,false]])("server time offset %s", (offset, active) => {
    expect(getLaunchPolicy(env, new Date(begin+offset)).active).toBe(active);
    expect(getLaunchPolicy(env, new Date(begin+offset)).purchasesAllowed).toBe(false);
  });
  it.each(Object.keys(env))("fails closed with missing %s", key => {
    expect(getLaunchPolicy({ ...env, [key]: undefined }, new Date(start)).active).toBe(false);
  });
  it.each(["2030-02-31T00:00:00.000Z", "2030-01-01", "2030-01-01T00:00:00+01:00"])("rejects invalid UTC %s", value => {
    expect(getLaunchPolicy({ ...env, CITYWALK_LAUNCH_START_UTC: value }, new Date(start)).active).toBe(false);
  });
  it("rejects approval before availability and invalid server clock", () => {
    expect(getLaunchPolicy({ ...env, CITYWALK_LAUNCH_VERIFIED_PUBLIC_AT_UTC: "2030-01-02T00:00:00.000Z" }, new Date(start)).active).toBe(false);
    expect(getLaunchPolicy(env, new Date(NaN)).active).toBe(false);
  });
  it("switches off immediately, never switches on purchases incidentally", () => {
    expect(getLaunchPolicy({}, new Date(start))).toEqual({ active:false, purchasesAllowed:false });
    expect(getLaunchPolicy({ ...env, CITYWALK_PUBLIC_PURCHASES_APPROVED:"1" }, new Date(start)).purchasesAllowed).toBe(false);
  });
  it.each([undefined,"registered"])("authorizes selected city features for %s without paid sources", async userId => {
    configure(); vi.useFakeTimers(); vi.setSystemTime(begin);
    const deps = { hasPremiumEntitlement: vi.fn().mockResolvedValue(false), hasCityPass: vi.fn().mockResolvedValue(false) };
    await expect(requirePaidCityAccess({ userId, citySlug:"lubeck" },deps)).resolves.toBeUndefined();
    expect(hasLaunchCityAccess("other-city")).toBe(false);
    expect(await canUsePaidCityFeature({userId, citySlug:"lubeck",feature:"premium_audio"},deps)).toBe(true);
    expect(await canUsePaidCityFeature({userId, citySlug:"lubeck",feature:"future_feature"},deps)).toBe(false);
    expect(deps.hasPremiumEntitlement).toHaveBeenCalledTimes(userId ? 1 : 0);
  });
  it("preserves purchased Premium after expiry and never returns a fake paid grant", async () => {
    configure(); const deps = {hasPremiumEntitlement:vi.fn().mockResolvedValue(true),hasCityPass:vi.fn()};
    expect(await resolveCitywalkPaidAccess({ userId:"paid", citySlug:"lubeck",now:new Date(begin+LAUNCH_DURATION_MS)},deps)).toEqual({tier:"premium",premium:true,cityPass:false});
    expect(await resolveCitywalkPaidAccess({citySlug:"lubeck",now:new Date(begin)},deps)).toEqual({tier:"free",premium:false,cityPass:false});
  });
  it("denies forged flags and propagates paid-source failures outside the window", async () => {
    vi.stubEnv("CITYWALK_LAUNCH_FREE_ENABLED", "0");
    const deps = {hasPremiumEntitlement:vi.fn().mockRejectedValue(new Error("database unavailable")),hasCityPass:vi.fn()};
    await expect(requirePaidCityAccess({citySlug:"lubeck", ...{ launchFree:true,premium:true }},deps)).rejects.toThrow("PAID_CITY_ACCESS_REQUIRED");
    await expect(requirePaidCityAccess({userId:"registered",citySlug:"lubeck"},deps)).rejects.toThrow("database unavailable");
  });
});
