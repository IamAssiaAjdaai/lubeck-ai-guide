import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

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
  const [locale, setLocale] = useState<NativeLocale>("en");
  const value = useMemo(() => ({
    locale,
    setLocale,
    direction: getNativeDirection(locale),
    messages: getNativeMessages(locale),
  }), [locale]);

  return <NativeLocaleContext.Provider value={value}>{children}</NativeLocaleContext.Provider>;
}

export function useNativeLocale() {
  const value = useContext(NativeLocaleContext);
  if (!value) throw new Error("useNativeLocale must be used within NativeLocaleProvider.");
  return value;
}
