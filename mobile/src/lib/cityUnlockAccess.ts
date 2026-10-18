import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";
import { citywalkApi } from "./api/instance";
import { nativeAuthClient } from "./auth/client";

export type CityUnlockTier = "free" | "city_pass" | "premium" | "launch_free";

export type CityUnlockAccess = Readonly<{
  active: boolean;
  tier: CityUnlockTier;
}>;

export async function readCityUnlockAccess(
  citySlug: string,
  expectedAccount?: string,
): Promise<CityUnlockAccess> {
  const cityPass = citySlug === "lubeck" ? CITYWALK_CITY_PASS_72H.lubeck : undefined;
  if (!cityPass) return { active: false, tier: "free" };
  const before = await nativeAuthClient.getSession();
  if (before.error || before.data?.user.id !== expectedAccount) throw new Error("account-changed");
  const response = await citywalkApi.fetchAuthenticated(`/api/commerce/city-unlock/${encodeURIComponent(citySlug)}`, {
    headers: expectedAccount ? { "X-Citywalk-Account": expectedAccount } : {},
  });
  if (!response.ok) throw new Error("access-unavailable");
  const value = await response.json();
  const after = await nativeAuthClient.getSession();
  if (after.error || after.data?.user.id !== expectedAccount) throw new Error("account-changed");
  if (
    value.citySlug !== citySlug ||
    value.scopeType !== cityPass.scopeType ||
    value.scopeKey !== cityPass.scopeKey ||
    !["free", "city_pass", "premium", "launch_free"].includes(value.tier) ||
    typeof value.active !== "boolean"
  ) throw new Error("access-unavailable");
  return { active: value.active, tier: value.tier as CityUnlockTier };
}

export async function readCityUnlock(citySlug: string, expectedAccount?: string): Promise<boolean> {
  return (await readCityUnlockAccess(citySlug, expectedAccount)).active;
}
