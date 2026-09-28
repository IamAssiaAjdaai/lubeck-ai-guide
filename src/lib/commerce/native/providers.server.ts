import "server-only";
import { createHash } from "node:crypto";
import { AppStoreServerAPIClient, SignedDataVerifier, Environment, Type, InAppOwnershipType, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { NativeBillingError, nativeBundle, nativeProduct, requireSandbox, requireGoogleBilling, type VerifiedNativePurchase } from "./config.server";

export function transactionKey(identity: string) { return createHash("sha256").update(identity).digest("hex"); }
export function appleClients() {
  requireSandbox();
  try {
    const roots = JSON.parse(process.env.CITYWALK_APPLE_ROOT_CERTIFICATES ?? "[]") as string[];
    if (!roots.length || !roots.every(v => typeof v === "string")) throw new Error();
    const verifier = new SignedDataVerifier(roots.map(v => Buffer.from(v, "base64")), true, Environment.SANDBOX, nativeBundle);
    const api = new AppStoreServerAPIClient(process.env.CITYWALK_APPLE_PRIVATE_KEY!, process.env.CITYWALK_APPLE_KEY_ID!, process.env.CITYWALK_APPLE_ISSUER_ID!, nativeBundle, Environment.SANDBOX);
    return { verifier, api };
  } catch { throw new NativeBillingError("UNAVAILABLE"); }
}
/** Only call with Apple-library verified data, never unverified JWT decoding. */
export function normalizeApple(data: JWSTransactionDecodedPayload): VerifiedNativePurchase {
  if (data.environment !== Environment.SANDBOX || data.bundleId !== nativeBundle || data.productId !== nativeProduct.productId || data.type !== Type.NON_CONSUMABLE || data.inAppOwnershipType !== InAppOwnershipType.PURCHASED || data.quantity !== 1 || !data.originalTransactionId || !data.transactionId || !data.appAccountToken) throw new NativeBillingError("INVALID_PURCHASE", 400);
  return { provider: "apple_sandbox", transactionKey: transactionKey(data.originalTransactionId), binding: data.appAccountToken.toLowerCase(), state: data.revocationDate != null ? "revoked" : "purchased" };
}
export async function verifyApple(signedTransaction: string): Promise<VerifiedNativePurchase> {
  const { verifier, api } = appleClients();
  const submitted = await verifier.verifyAndDecodeTransaction(signedTransaction);
  const original = normalizeApple(submitted);
  // A previously valid JWS is not current ownership. Query Apple again.
  const current = await api.getTransactionInfo(submitted.transactionId!);
  if (!current.signedTransactionInfo) throw new NativeBillingError("INVALID_PURCHASE", 400);
  const verified = normalizeApple(await verifier.verifyAndDecodeTransaction(current.signedTransactionInfo));
  if (original.transactionKey !== verified.transactionKey || original.binding !== verified.binding) throw new NativeBillingError("INVALID_PURCHASE", 400);
  return verified;
}
type GooglePurchase = {
  testPurchaseContext?: { fopType?: string };
  purchaseStateContext?: { purchaseState?: string };
  productLineItem?: { productId?: string; productOfferDetails?: { quantity?: number; refundableQuantity?: number; consumptionState?: string; rentOfferDetails?: unknown } }[];
  obfuscatedExternalAccountId?: string;
  acknowledgementState?: string;
};
export function normalizeGoogle(value: GooglePurchase, token: string): VerifiedNativePurchase {
  requireGoogleBilling();
  const line = value.productLineItem?.[0], offer = line?.productOfferDetails;
  if (value.testPurchaseContext?.fopType !== "TEST" || value.productLineItem?.length !== 1 || line?.productId !== nativeProduct.productId || offer?.quantity !== 1 || offer.rentOfferDetails || !value.obfuscatedExternalAccountId) throw new NativeBillingError("INVALID_PURCHASE", 400);
  if (value.purchaseStateContext?.purchaseState === "PENDING") throw new NativeBillingError("PURCHASE_PENDING", 409);
  const state = value.purchaseStateContext?.purchaseState;
  if (state !== "PURCHASED" && state !== "CANCELLED") throw new NativeBillingError("INVALID_PURCHASE", 400);
  if (state === "PURCHASED" && offer.refundableQuantity !== 0 && offer.refundableQuantity !== 1) throw new NativeBillingError("INVALID_PURCHASE", 400);
  return { provider: "google_test", transactionKey: transactionKey(token), binding: value.obfuscatedExternalAccountId, state: state === "CANCELLED" || offer.refundableQuantity === 0 ? "revoked" : "purchased" };
}
async function googleClient() {
  requireGoogleBilling();
  try { return await new GoogleAuth({ credentials: JSON.parse(process.env.CITYWALK_GOOGLE_SERVICE_ACCOUNT ?? ""), scopes: ["https://www.googleapis.com/auth/androidpublisher"] }).getClient(); }
  catch { throw new NativeBillingError("UNAVAILABLE"); }
}
export async function verifyGoogle(token: string) {
  const client = await googleClient();
  const { data } = await client.request<GooglePurchase>({ url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${nativeBundle}/purchases/productsv2/tokens/${encodeURIComponent(token)}`, timeout: 15000 });
  return normalizeGoogle(data, token);
}
export async function acknowledgeGoogle(token: string) {
  const client = await googleClient();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${nativeBundle}/purchases/productsv2/tokens/${encodeURIComponent(token)}`;
  const acknowledged = async () => {
    const { data } = await client.request<GooglePurchase>({ url, timeout: 15000 });
    if (normalizeGoogle(data, token).state !== "purchased") throw new NativeBillingError("PURCHASE_REVOKED", 409);
    return data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
  };
  if (await acknowledged()) return;
  requireGoogleBilling();
  try { await client.request({ url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${nativeBundle}/purchases/products/${nativeProduct.productId}/tokens/${encodeURIComponent(token)}:acknowledge`, method: "POST", data: {}, timeout: 15000 }); }
  catch (error) { if (!await acknowledged()) throw error; }
}
export async function verifyGooglePushAuthorization(header: string | null) {
  requireGoogleBilling();
  if (!header?.startsWith("Bearer ") || !process.env.CITYWALK_GOOGLE_PUSH_AUDIENCE || !process.env.CITYWALK_GOOGLE_PUSH_EMAIL) throw new NativeBillingError("INVALID_PURCHASE", 401);
  const ticket = await new OAuth2Client().verifyIdToken({ idToken: header.slice(7), audience: process.env.CITYWALK_GOOGLE_PUSH_AUDIENCE });
  const payload = ticket.getPayload();
  if (payload?.email !== process.env.CITYWALK_GOOGLE_PUSH_EMAIL || !payload.email_verified) throw new NativeBillingError("INVALID_PURCHASE", 401);
}
