import storage from "@react-native-async-storage/async-storage";
import { isSharedLocale, type SharedLocale } from "@citywalk/i18n";

export const LOCALE_PREFERENCE_KEY = "citywalk:native:locale:v1";
export function resolveDeviceLocale(tag: string): SharedLocale {
  const language = tag.trim().replace(/_/g, "-").split("-")[0].toLowerCase();
  return isSharedLocale(language) ? language : "en";
}
export function deviceLocale(): SharedLocale {
  try { return resolveDeviceLocale(Intl.DateTimeFormat().resolvedOptions().locale); }
  catch { return "en"; }
}
// Existing AsyncStorage native dependency; no additional native module is needed.
let writes: Promise<unknown> = Promise.resolve();
export const localePreference = {
  async read(): Promise<string | null> {
    try {
      await writes;
      return await storage.getItem(LOCALE_PREFERENCE_KEY);
    } catch { return null; }
  },
  write(locale: SharedLocale): Promise<unknown> {
    writes = writes.then(async () => {
      await storage.setItem(LOCALE_PREFERENCE_KEY, locale);
    }).catch(() => undefined);
    return writes;
  },
};
