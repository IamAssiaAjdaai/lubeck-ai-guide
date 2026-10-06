import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { nativeAuthClient } from "../lib/auth/client";
import { readPremiumAccess } from "../lib/premiumAccess";

export type PremiumAccessState =
  | Readonly<{ status: "loading"; active: false }>
  | Readonly<{ status: "guest"; active: false }>
  | Readonly<{ status: "free"; active: false }>
  | Readonly<{ status: "premium"; active: true }>
  | Readonly<{ status: "unavailable"; active: false }>;

export function usePremiumAccess(): PremiumAccessState {
  const [state, setState] = useState<PremiumAccessState>({
    status: "loading",
    active: false,
  });

  const refresh = useCallback(async () => {
    setState({ status: "loading", active: false });
    try {
      const auth = await nativeAuthClient.getSession();
      const account = auth.data?.user.id;
      if (!account) {
        setState({ status: "guest", active: false });
        return;
      }

      const active = await readPremiumAccess(account);
      setState(
        active
          ? { status: "premium", active: true }
          : { status: "free", active: false },
      );
    } catch {
      setState({ status: "unavailable", active: false });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return state;
}
