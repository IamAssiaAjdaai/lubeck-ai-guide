import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef, type PropsWithChildren } from "react";

import { isSharedLocale } from "@citywalk/i18n";
import { deviceLocale, localePreference, resolveDeviceLocale } from "./localePreference";

import type { NativeLocale } from "../lib/api/contracts";
import {
  getNativeDirection,
  getNativeMessages,
  type NativeDirection,
  type NativeMessages,
} from "../lib/localization";

type NativeLocaleContextValue = Readonly<{
  locale: NativeLocale;
  setLocale(locale: NativeLocale): void;
  direction: NativeDirection;
  messages: NativeMessages;
}>;

const NativeLocaleContext = createContext<NativeLocaleContextValue | undefined>(undefined);

export function NativeLocaleProvider({ children }: PropsWithChildren) {
  const [locale, updateLocale] = useState<NativeLocale>(deviceLocale);
  const selected = useRef(false);
  useEffect(() => {
    let active = true;
    void localePreference.read().then(saved => {
      if (active && !selected.current && isSharedLocale(saved)) updateLocale(resolveDeviceLocale(saved));
    });
    return () => { active = false; };
  }, []);
  const setLocale = useCallback((next: NativeLocale) => {
    selected.current = true;
    const visible = resolveDeviceLocale(next);
    updateLocale(visible);
    void localePreference.write(visible);
  }, []);
  const value = useMemo(() => ({
    locale,
    setLocale,
    direction: getNativeDirection(locale),
    messages: getNativeMessages(locale),
  }), [locale, setLocale]);

  return <NativeLocaleContext.Provider value={value}>{children}</NativeLocaleContext.Provider>;
}

export function useNativeLocale() {
  const value = useContext(NativeLocaleContext);
  if (!value) throw new Error("useNativeLocale must be used within NativeLocaleProvider.");
  return value;
}
