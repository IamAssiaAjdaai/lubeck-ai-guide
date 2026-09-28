import { Platform } from "react-native";
import { nativeAuthClient } from "./auth/client";
import { citywalkApi } from "./api/instance";
import { BillingFailure, NativeBilling, type BillingContext } from "./nativeBilling";

async function account() { const session = await nativeAuthClient.getSession(); return session.error ? undefined : session.data?.user.id; }
async function request(path: string, owner: string, body?: unknown) {
  if (await account() !== owner) throw new BillingFailure("ACCOUNT_CONFLICT");
  const response = await citywalkApi.fetchAuthenticated(path, {
    method: body ? "POST" : "GET", headers: { "X-Citywalk-Account": owner, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  if (await account() !== owner) throw new BillingFailure("ACCOUNT_CONFLICT");
  if (!response.ok) throw new BillingFailure(value.code === "ACCOUNT_CONFLICT" ? "ACCOUNT_CONFLICT" : value.code === "PURCHASE_REVOKED" ? "PURCHASE_REVOKED" : "UNAVAILABLE");
  return value;
}
export const nativeBilling = new NativeBilling({
  platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unsupported",
  account,
  sdk: async () => {
    // Dynamic loading keeps previously installed clients without expo-iap usable.
    const sdk = await import("expo-iap");
    // SDK warning payloads can contain Store evidence. Keep them out of app logs.
    for (const method of ["log", "debug", "info", "warn", "error"] as const) sdk.ExpoIapConsole[method] = () => {};
    return sdk;
  },
  context: async owner => await request("/api/commerce/native/context", owner) as BillingContext,
  deliver: async (proof, owner, store) => {
    const result = await request("/api/commerce/city-unlock/lubeck", owner, { proof, store });
    if (result.delivered !== true || result.active !== true) throw new BillingFailure();
  },
});
