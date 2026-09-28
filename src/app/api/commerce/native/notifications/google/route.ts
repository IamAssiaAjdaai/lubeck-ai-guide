import { verifyGoogle, verifyGooglePushAuthorization } from "@/lib/commerce/native/providers.server";
import { deliverNativePurchase } from "@/lib/commerce/native/ledger.server";
import { nativeBody, nativeFailure, nativeJson } from "@/lib/commerce/native/http.server";
import { NativeBillingError, nativeBundle, requireGoogleBilling } from "@/lib/commerce/native/config.server";
export async function POST(request: Request) {
  try {
    // Disabled notifications remain retryable; never acknowledge unprocessed revocations.
    requireGoogleBilling();
    await verifyGooglePushAuthorization(request.headers.get("authorization"));
    const body = await nativeBody(request);
    const message = body.message as { data?: unknown } | undefined;
    if (typeof message?.data !== "string") throw new NativeBillingError("INVALID_PURCHASE", 400);
    const payload = JSON.parse(Buffer.from(message.data, "base64").toString("utf8"));
    if (payload.packageName !== nativeBundle) throw new NativeBillingError("INVALID_PURCHASE", 400);
    if (payload.testNotification) return nativeJson({ accepted: true });
    const token = payload.oneTimeProductNotification?.purchaseToken ?? payload.voidedPurchaseNotification?.purchaseToken;
    if (typeof token !== "string" || !token.length || token.length > 24000) throw new NativeBillingError("INVALID_PURCHASE", 400);
    const purchase = await verifyGoogle(token);
    if (purchase.state === "revoked") await deliverNativePurchase(purchase);
    return nativeJson({ accepted: true });
  } catch (error) { return nativeFailure(error); }
}
