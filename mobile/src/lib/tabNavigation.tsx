import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { useLocalSearchParams, useNavigation, useRoute, type NativeStackNavigationProp } from "expo-router";

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

// Root taps use the visible screen's ref directly. Only a nested return needs
// a pending intent, consumed after the native stack attaches its destination.
export function createTabScrollCoordinator() {
  let pending: string | undefined;
  return {
    clear() { pending = undefined; },
    request(key: string) { pending = key; },
    completeRootReturn(key: string, scroll: () => void) {
      if (pending !== key) return;
      pending = undefined;
      scroll();
    },
  };
}
const TabScrollContext = createContext<ReturnType<typeof createTabScrollCoordinator> | null>(null);
export function NativeTabScrollProvider({ children }: PropsWithChildren) {
  const [coordinator] = useState(createTabScrollCoordinator);
  return <TabScrollContext.Provider value={coordinator}>{children}</TabScrollContext.Provider>;
}
export function useTabScrollCoordinator() { return useContext(TabScrollContext); }
export function useRootTabScroll(scrollToTop: (animated?: boolean) => void) {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const params = useLocalSearchParams<{ section?: string; view?: string; citySlug?: string }>();
  const coordinator = useTabScrollCoordinator();
  // usePathname is global: background stack screens must retain their own identity.
  const path = route.name === "index" ? "/" : route.name === "saved" ? "/saved"
    : route.name === "account/index" ? "/account"
    : route.name === "city/[citySlug]/index" && params.citySlug ? `/city/${params.citySlug}` : "";
  const key = tabRootKey(path, params);
  const finish = useCallback(() => {
    if (key && navigation.isFocused()) coordinator?.completeRootReturn(key, () => scrollToTop(false));
  }, [coordinator, key, navigation, scrollToTop]);
  useEffect(() => navigation.addListener("transitionEnd", finish), [navigation, finish]);
}

export function logTabPress(tab: NativeTab, active: boolean, action: string) {
  if (typeof __DEV__ !== "undefined" && __DEV__ && process.env.EXPO_PUBLIC_CITYWALK_QA_LOGS === "1")
    console.info(`[TAB_PRESS] ${tab} active=${active} action=${action}`);
}
