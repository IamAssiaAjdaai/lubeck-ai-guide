import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";
import { citywalkApi } from "./api/instance";
import { nativeAuthClient } from "./auth/client";

export async function readCityUnlock(citySlug: string, expectedAccount?: string): Promise<boolean> {
  const cityPass = citySlug === "lubeck" ? CITYWALK_CITY_PASS_72H.lubeck : undefined;
  if (!cityPass) return false;
  const before = await nativeAuthClient.getSession();
  if (before.error || before.data?.user.id !== expectedAccount) throw new Error("account-changed");
  if (!expectedAccount) return false;
  const response = await citywalkApi.fetchAuthenticated(`/api/commerce/city-unlock/${encodeURIComponent(citySlug)}`, {
    headers: { "X-Citywalk-Account": expectedAccount },
  });
  if (!response.ok) throw new Error("access-unavailable");
  const value = await response.json();
  const after = await nativeAuthClient.getSession();
  if (after.error || after.data?.user.id !== expectedAccount) throw new Error("account-changed");
  if (
    value.citySlug !== citySlug ||
    value.scopeType !== cityPass.scopeType ||
    value.scopeKey !== cityPass.scopeKey ||
    !["free", "city_pass", "premium"].includes(value.tier) ||
    typeof value.active !== "boolean"
  ) throw new Error("access-unavailable");
  return value.active;
}
