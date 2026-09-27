import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { nativeAuthClient } from "../lib/auth/client";
import { listAccountWalks, subscribeAccountWalks } from "../lib/accountWalks";
import type { SavedWalk } from "../lib/walkStorage";

export function useAccountWalks() {
  const { data: session, isPending } = nativeAuthClient.useSession();
  const userId = session?.user.id;
  const [state, setState] = useState<{ userId: string; walks: SavedWalk[]; error: boolean }>();
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const token = ++sequence.current;
    if (!userId) return;
    try {
      const walks = await listAccountWalks(userId);
      if (sequence.current === token) setState({ userId, walks, error: false });
    } catch {
      if (sequence.current === token) setState({ userId, walks: [], error: true });
    }
  }, [userId]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const stop = subscribeAccountWalks(owner => { if (owner === userId) void refresh(); });
    return () => { sequence.current++; stop(); };
  }, [refresh, userId]));
  return { userId, walks: userId && state?.userId === userId ? state.walks : [],
    loading: isPending || Boolean(userId && state?.userId !== userId),
    error: Boolean(userId && state?.userId === userId && state.error), refresh };
}
