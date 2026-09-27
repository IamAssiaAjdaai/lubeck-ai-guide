import { useCallback, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { loadCurrentWalk, subscribeCurrentWalk, type CurrentWalk } from "../lib/walkStorage";

type Snapshot = { status: "loading" | "available" | "error"; current?: CurrentWalk };
const initial: Snapshot = { status: "loading" };
const entries = new Map<string, { snapshot: Snapshot; listeners: Set<() => void>; revision: number; pending?: Promise<void>; again?: boolean; unsubscribe?: () => void }>();
function entry(city: string) {
  let value = entries.get(city);
  if (!value) { value = { snapshot: initial, listeners: new Set(), revision: 0 }; entries.set(city, value); }
  return value;
}
export async function refreshCurrentWalk(city: string): Promise<void> {
  const value = entry(city);
  if (value.pending) { value.again = true; return value.pending; }
  value.pending = (async () => {
    do {
      value.again = false;
      const revision = value.revision;
      try {
        const current = await loadCurrentWalk(city);
        if (revision === value.revision && value.listeners.size) value.snapshot = { status: "available", current };
      } catch { if (revision === value.revision && value.listeners.size) value.snapshot = { status: "error" }; }
      value.listeners.forEach(listener => listener());
    } while (value.again);
  })().finally(() => { value.pending = undefined; });
  return value.pending;
}
export function useCurrentWalk(city: string) {
  const subscribe = useCallback((listener: () => void) => {
    const value = entry(city);
    value.listeners.add(listener);
    value.unsubscribe ??= subscribeCurrentWalk(city, current => { value.revision++; value.snapshot = { status: "available", current }; value.listeners.forEach(notify => notify()); });
    return () => {
      value.listeners.delete(listener);
      if (!value.listeners.size) { value.revision++; value.unsubscribe?.(); value.unsubscribe = undefined; value.snapshot = initial; }
    };
  }, [city]);
  const snapshot = useSyncExternalStore(subscribe, useCallback(() => entry(city).snapshot, [city]));
  useFocusEffect(useCallback(() => { void refreshCurrentWalk(city); }, [city]));
  return { ...snapshot, retry: () => refreshCurrentWalk(city) };
}
