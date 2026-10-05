import { useEffect } from "react";

import { nativeAuthClient } from "../lib/auth/client";
import { syncRevenueCatIdentity } from "../lib/revenueCat";

export function RevenueCatIdentitySync() {
  const { data: session, isPending } = nativeAuthClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (isPending) return;
    let active = true;
    void syncRevenueCatIdentity(userId).catch(() => {
      // RevenueCat is not an auth or access authority. A transient SDK/network
      // failure must never break CITYWALK startup or the Better Auth session.
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [isPending, userId]);

  return null;
}
