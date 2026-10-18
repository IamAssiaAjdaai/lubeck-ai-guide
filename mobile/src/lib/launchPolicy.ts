import { citywalkApi } from "./api/instance";

export async function readPublicPurchasePolicy(): Promise<boolean> {
  const response = await citywalkApi.fetchAuthenticated("/api/commerce/launch-policy");
  if (!response.ok) return false;
  const value = await response.json();
  return value.purchasesAllowed === true && value.active === false;
}

export async function requirePublicPurchases(): Promise<void> {
  if (!await readPublicPurchasePolicy()) throw new Error("PURCHASES_DISABLED");
}
