import { createContext, useCallback, useContext, useState, type PropsWithChildren } from "react";
import { useFocusEffect, useLocalSearchParams, usePathname } from "expo-router";

export type NativeTab = "home" | "explore" | "trips" | "saved" | "profile";
export function activeNativeTab(path: string, params: { section?: string; view?: string }): NativeTab {
  if (path === "/") return params.section === "cities" ? "explore" : "home";
  if (path === "/saved") return params.view === "trips" ? "trips" : "saved";
  if (path.startsWith("/account")) return "profile";
  return path.endsWith("/walk") || path.includes("/tour/") ? "trips" : "explore";
}
export function tabRootKey(path: string, params: { section?: string; view?: string }): string | undefined {
  if (path === "/" || path === "/saved") return `${path}:${activeNativeTab(path, params)}`;
  if (path === "/account" || /^\/city\/[^/]+$/.test(path)) return path;
  return undefined;
}

// Focus-scoped refs give the custom bar native tabPress behavior. Nested-route
// requests are consumed when Expo Router focuses the tab root, without timers.
export function createTabScrollCoordinator() {
  let focused: { key: string; scroll: () => void } | undefined;
  let pending: string | undefined;
  return {
    clear() { pending = undefined; },
    request(key: string) {
      if (focused?.key === key) { focused.scroll(); pending = undefined; }
      else pending = key;
    },
    register(key: string, scroll: () => void) {
      const entry = { key, scroll };
      focused = entry;
      if (pending === key) { pending = undefined; scroll(); }
      return () => { if (focused === entry) focused = undefined; };
    },
  };
}
const TabScrollContext = createContext<ReturnType<typeof createTabScrollCoordinator> | null>(null);
export function NativeTabScrollProvider({ children }: PropsWithChildren) {
  const [coordinator] = useState(createTabScrollCoordinator);
  return <TabScrollContext.Provider value={coordinator}>{children}</TabScrollContext.Provider>;
}
export function useTabScrollCoordinator() { return useContext(TabScrollContext); }
export function useRootTabScroll(scrollToTop: () => void) {
  const path = usePathname();
  const params = useLocalSearchParams<{ section?: string; view?: string }>();
  const coordinator = useTabScrollCoordinator();
  const key = tabRootKey(path, params);
  useFocusEffect(useCallback(() => {
    if (key) return coordinator?.register(key, scrollToTop);
  }, [coordinator, key, scrollToTop]));
}
