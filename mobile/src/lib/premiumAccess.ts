import { CITYWALK_PREMIUM_ENTITLEMENT } from "@citywalk/traveler-core";

import { citywalkApi } from "./api/instance";
import { nativeAuthClient } from "./auth/client";

export async function readPremiumAccess(expectedAccount?: string): Promise<boolean> {
  const before = await nativeAuthClient.getSession();
  if (before.error || before.data?.user.id !== expectedAccount) throw new Error("account-changed");
  if (!expectedAccount) return false;

  const response = await citywalkApi.fetchAuthenticated("/api/commerce/premium", {
    headers: { "X-Citywalk-Account": expectedAccount },
  });
  if (!response.ok) throw new Error("access-unavailable");
  const value = await response.json();

  const after = await nativeAuthClient.getSession();
  if (after.error || after.data?.user.id !== expectedAccount) throw new Error("account-changed");
  if (
    value.scopeType !== CITYWALK_PREMIUM_ENTITLEMENT.scopeType ||
    value.scopeKey !== CITYWALK_PREMIUM_ENTITLEMENT.scopeKey ||
    typeof value.active !== "boolean"
  ) throw new Error("access-unavailable");

  return value.active;
}
