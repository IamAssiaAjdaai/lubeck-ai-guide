import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readPublicPurchasePolicy } from "../lib/launchPolicy";

export function usePublicPurchases(): boolean {
  const [allowed, setAllowed] = useState(false);
  useFocusEffect(useCallback(() => {
    let current = true;
    setAllowed(false);
    void readPublicPurchasePolicy().then(value => { if (current) setAllowed(value); }).catch(() => { if (current) setAllowed(false); });
    return () => { current = false; };
  }, []));
  return allowed;
}
