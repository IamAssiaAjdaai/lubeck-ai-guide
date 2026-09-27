import officialLaunchLocales from "./launch-locales.json";
import { hasOwn } from "./runtime";
export const localeConfig = {
  en: { direction: "ltr", label: "English", shortLabel: "EN", aiLanguageName: "English" },
  de: { direction: "ltr", label: "Deutsch", shortLabel: "DE", aiLanguageName: "German" },
  da: { direction: "ltr", label: "Dansk", shortLabel: "DA", aiLanguageName: "Danish" },
  sv: { direction: "ltr", label: "Svenska", shortLabel: "SV", aiLanguageName: "Swedish" },
  nl: { direction: "ltr", label: "Nederlands", shortLabel: "NL", aiLanguageName: "Dutch" },
  es: { direction: "ltr", label: "Español", shortLabel: "ES", aiLanguageName: "Spanish" },
  ar: { direction: "rtl", label: "العربية", shortLabel: "العربية", aiLanguageName: "Arabic" },
} as const;
export type SharedLocale = keyof typeof localeConfig;
export type LocaleDirection = "ltr" | "rtl";
export const fallbackLocale: SharedLocale = "en";
export const sharedLocales = Object.freeze(Object.keys(localeConfig) as SharedLocale[]);
export function isSharedLocale(locale: unknown): locale is SharedLocale {
  return typeof locale === "string" && hasOwn(localeConfig, locale);
}
export function resolveUILocale(locale: string): SharedLocale {
  return isSharedLocale(locale) ? locale : fallbackLocale;
}
export function getLocaleDirection(locale: string): LocaleDirection {
  return localeConfig[resolveUILocale(locale)].direction;
}
export function isRTL(locale: string): boolean { return getLocaleDirection(locale) === "rtl"; }
export function getLocaleLabel(locale: string): string { return localeConfig[resolveUILocale(locale)].label; }
export function getLocaleShortLabel(locale: string): string { return localeConfig[resolveUILocale(locale)].shortLabel; }

// Official launch scope is independent of supported/experimental locales.
export const launchLocales = Object.freeze(officialLaunchLocales as SharedLocale[]);
export type LaunchLocale = (typeof launchLocales)[number];
export function getSelectableLocales(includeExperimental = false): readonly SharedLocale[] {
  return includeExperimental ? [...launchLocales, ...sharedLocales.filter(locale => !launchLocales.some(launch => launch === locale))] : launchLocales;
}

export const supportedLocales = sharedLocales;
export const launchVisibleLocales = launchLocales;
export function resolveVisibleLocale(locale: string, includeExperimental = false): SharedLocale {
  const language = locale.trim().replace(/_/g, "-").split("-")[0].toLowerCase();
  return getSelectableLocales(includeExperimental).some(candidate => candidate === language) ? language as SharedLocale : fallbackLocale;
}
