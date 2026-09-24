import en from "@/translations/walk/en.json";
import ar from "@/translations/walk/ar.json";
import de from "@/translations/walk/de.json";
import type { Locale } from "@/lib/i18n";
export type WalkCopy = typeof en;
export function walkCopy(locale: Locale): WalkCopy {
  return locale === "ar" ? ar : locale === "de" ? de : en;
}
export function walkCopyLocale(locale: Locale) {
  return locale === "ar" ? "ar" : locale === "de" ? "de" : "en";
}
