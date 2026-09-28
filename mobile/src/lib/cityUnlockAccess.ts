import { getCityUnlockProduct } from "@citywalk/traveler-core";
import { citywalkApi } from "./api/instance";
import { nativeAuthClient } from "./auth/client";

export async function readCityUnlock(citySlug: string, expectedAccount?: string): Promise<boolean> {
  const product = getCityUnlockProduct(citySlug);
  if (!product) return false;
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
  if (value.citySlug !== citySlug || value.entitlement !== product.entitlement || typeof value.active !== "boolean") throw new Error("access-unavailable");
  return value.active;
}
