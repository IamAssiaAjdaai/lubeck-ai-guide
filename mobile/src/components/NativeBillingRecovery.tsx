import { useEffect } from "react";
import { AppState } from "react-native";
import { cityUnlockPreviewEnabled } from "../lib/cityUnlock";
import { nativeBilling } from "../lib/nativeBillingRuntime";
import { nativeAuthClient } from "../lib/auth/client";

export function NativeBillingRecovery() {
  const { data: session } = nativeAuthClient.useSession();
  const owner = session?.user.id;
  useEffect(() => {
    if (!cityUnlockPreviewEnabled() || !owner) return;
    void nativeBilling.recover();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void nativeBilling.recover(); });
    return () => subscription.remove();
  }, [owner]);
  return null;
}
