import { appleClients, normalizeApple } from "@/lib/commerce/native/providers.server";
import { deliverNativePurchase } from "@/lib/commerce/native/ledger.server";
import { nativeBody, nativeFailure, nativeJson } from "@/lib/commerce/native/http.server";
import { NativeBillingError } from "@/lib/commerce/native/config.server";
export async function POST(request: Request) {
  try {
    const { signedPayload } = await nativeBody(request);
    if (typeof signedPayload !== "string") throw new NativeBillingError("INVALID_PURCHASE", 400);
    const { verifier } = appleClients();
    const notification = await verifier.verifyAndDecodeNotification(signedPayload);
    if (notification.notificationType === "TEST") return nativeJson({ accepted: true });
    const signed = notification.data?.signedTransactionInfo;
    if (!signed) return nativeJson({ accepted: true });
    const purchase = normalizeApple(await verifier.verifyAndDecodeTransaction(signed));
    // Only revocation is applied from notifications; stale successes never grant.
    if (purchase.state === "revoked") await deliverNativePurchase(purchase);
    return nativeJson({ accepted: true });
  } catch (error) { return nativeFailure(error); }
}
