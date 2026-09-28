import "server-only";
import { createHmac } from "node:crypto";
import { getCityUnlockProduct } from "@citywalk/traveler-core";

export const nativeProduct = getCityUnlockProduct("lubeck")!;
export const nativeBundle = "com.citywalk.app";
export type NativeStore = "apple" | "google";
export class NativeBillingError extends Error {
  constructor(readonly code: "UNAVAILABLE" | "GOOGLE_BILLING_DISABLED" | "INVALID_PURCHASE" | "ACCOUNT_CONFLICT" | "PURCHASE_PENDING" | "PURCHASE_REVOKED" | "RATE_LIMITED", readonly status = 503) { super(code); }
}
export function requireSandbox() {
  if (process.env.CITYWALK_NATIVE_BILLING_MODE !== "sandbox" || process.env.VERCEL_ENV === "production") throw new NativeBillingError("UNAVAILABLE");
  if (!process.env.CITYWALK_NATIVE_ACCOUNT_SECRET || process.env.CITYWALK_NATIVE_ACCOUNT_SECRET.length < 32) throw new NativeBillingError("UNAVAILABLE");
}
export function accountBinding(userId: string): string {
  requireSandbox();
  const b = createHmac("sha256", process.env.CITYWALK_NATIVE_ACCOUNT_SECRET!).update(`citywalk-native-sandbox:${userId}`).digest().subarray(0, 16);
  b[6] = (b[6] & 15) | 0x40; b[8] = (b[8] & 63) | 0x80;
  const h = b.toString("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function requireTester(userId: string) {
  requireSandbox();
  const testers = (process.env.CITYWALK_NATIVE_SANDBOX_USERS ?? "").split(",").map(v => v.trim());
  if (!testers.includes(userId)) throw new NativeBillingError("UNAVAILABLE");
}
export function configuredStore(store: NativeStore): boolean {
  const keys = store === "apple"
    ? ["CITYWALK_APPLE_PRIVATE_KEY", "CITYWALK_APPLE_KEY_ID", "CITYWALK_APPLE_ISSUER_ID", "CITYWALK_APPLE_ROOT_CERTIFICATES"]
    : ["CITYWALK_GOOGLE_SERVICE_ACCOUNT"];
  return keys.every(key => Boolean(process.env[key]));
}
/** Google test billing is fail-closed, including notifications/revocations.
 * Vercel Preview runs NODE_ENV=production: deployment identity takes precedence.
 * Without VERCEL_ENV, only explicit local development/test is approved.
 */
export function googleBillingEnabled(): boolean {
  const deployment = process.env.VERCEL_ENV;
  const allowedEnvironment = deployment === "preview" || deployment === "development" ||
    (deployment === undefined && (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"));
  if (!allowedEnvironment || process.env.CITYWALK_GOOGLE_TEST_PURCHASES !== "1") return false;
  try {
    requireSandbox();
    const credentials = JSON.parse(process.env.CITYWALK_GOOGLE_SERVICE_ACCOUNT ?? "");
    return credentials?.type === "service_account" &&
      typeof credentials.client_email === "string" && credentials.client_email.trim().length > 0 &&
      typeof credentials.private_key === "string" && credentials.private_key.trim().length > 0;
  } catch { return false; }
}
export function requireGoogleBilling() {
  if (!googleBillingEnabled()) throw new NativeBillingError("GOOGLE_BILLING_DISABLED");
}
export function sandboxContext(userId: string) {
  requireTester(userId);
  return { mode: "sandbox", bundleId: nativeBundle, productId: nativeProduct.productId, accountToken: accountBinding(userId),
    stores: { apple: configuredStore("apple"), google: googleBillingEnabled() } };
}
export type VerifiedNativePurchase = Readonly<{
  provider: "apple_sandbox" | "google_test";
  transactionKey: string;
  binding: string;
  state: "purchased" | "revoked";
}>;
