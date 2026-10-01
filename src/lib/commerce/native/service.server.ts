import "server-only";
import { NativeBillingError, requireTester, requireGoogleBilling, type NativeStore } from "./config.server";
import { acknowledgeGoogle, verifyApple, verifyGoogle } from "./providers.server";
import { assertAccountBinding, deliverNativePurchase } from "./ledger.server";
import { hasCityUnlock } from "../cityUnlock.server";

const dependencies = { verifyApple, verifyGoogle, deliverNativePurchase, acknowledgeGoogle, hasCityUnlock };
export async function verifyAndDeliver(userId: string, store: NativeStore, proof: string, ports = dependencies) {
  if (store === "google") requireGoogleBilling();
  requireTester(userId);
  const verified = await (store === "apple" ? ports.verifyApple(proof) : ports.verifyGoogle(proof));
  assertAccountBinding(verified.binding, userId);
  if (store === "google") requireGoogleBilling();
  const state = await ports.deliverNativePurchase(verified, userId);
  if (state !== "active") throw new NativeBillingError("PURCHASE_REVOKED", 409);
  // A retry always re-verifies current ownership; acknowledgement never precedes
  // the durable transaction. Failed acknowledgement is retried on restore/resume.
  if (store === "google") {
    requireGoogleBilling();
    try { await ports.acknowledgeGoogle(proof); }
    catch (error) {
      if (error instanceof NativeBillingError && error.code === "PURCHASE_REVOKED") {
        await ports.deliverNativePurchase({ ...verified, state: "revoked" });
      }
      throw error;
    }
  }
  if (!await ports.hasCityUnlock({ userId, citySlug: "lubeck" })) throw new NativeBillingError("UNAVAILABLE");
  return { delivered: true, active: true };
}
