import { webCopy } from "@citywalk/i18n/adapters";
import { localeConfig, getLocaleDirection, isSharedLocale, sharedLocales, type SharedLocale } from "@citywalk/i18n";
import bg from "@/translations/bg.json";
import cs from "@/translations/cs.json";
import el from "@/translations/el.json";
import et from "@/translations/et.json";
import fi from "@/translations/fi.json";
import fr from "@/translations/fr.json";
import ga from "@/translations/ga.json";
import hr from "@/translations/hr.json";
import hu from "@/translations/hu.json";
import it from "@/translations/it.json";
import lt from "@/translations/lt.json";
import lv from "@/translations/lv.json";
import mt from "@/translations/mt.json";
import no from "@/translations/no.json";
import pl from "@/translations/pl.json";
import pt from "@/translations/pt.json";
import ro from "@/translations/ro.json";
import sk from "@/translations/sk.json";
import sl from "@/translations/sl.json";
import tr from "@/translations/tr.json";

const legacyLocales = [
  "de", "da", "nl", "sv", "en", "fr", "fi", "no", "pl", "it", "es",
  "pt", "cs", "el", "hu", "ro", "sk", "sl", "hr", "bg", "et", "lv",
  "lt", "ga", "mt", "tr", "ar",
] as const;

type LegacyLocale = (typeof legacyLocales)[number];
export type Locale = LegacyLocale | SharedLocale;
export const locales: readonly Locale[] = [...new Set<Locale>([...legacyLocales, ...sharedLocales])];
export type TextDirection = "ltr" | "rtl";
export type Translations = ReturnType<typeof webCopy>;
const en = webCopy("en"), de = webCopy("de"), ar = webCopy("ar");
const da = webCopy("da"), sv = webCopy("sv"), nl = webCopy("nl"), es = webCopy("es");

const translations = {
  de, da, nl, sv, en, fr, fi, no, pl, it, es, pt, cs, el, hu, ro, sk, sl,
  hr, bg, et, lv, lt, ga, mt, tr, ar,
} satisfies { [Key in LegacyLocale]: Translations };

type LanguageMetadata = { locale: Locale; nativeName: string; direction: TextDirection; aiLanguageName: string };

const legacyLanguages = {
  de: { locale: "de", nativeName: localeConfig.de.label, direction: localeConfig.de.direction, aiLanguageName: localeConfig.de.aiLanguageName },
  da: { locale: "da", nativeName: "Dansk", direction: "ltr", aiLanguageName: "Danish" },
  nl: { locale: "nl", nativeName: "Nederlands", direction: "ltr", aiLanguageName: "Dutch" },
  sv: { locale: "sv", nativeName: "Svenska", direction: "ltr", aiLanguageName: "Swedish" },
  en: { locale: "en", nativeName: localeConfig.en.label, direction: localeConfig.en.direction, aiLanguageName: localeConfig.en.aiLanguageName },
  fr: { locale: "fr", nativeName: "Français", direction: "ltr", aiLanguageName: "French" },
  fi: { locale: "fi", nativeName: "Suomi", direction: "ltr", aiLanguageName: "Finnish" },
  no: { locale: "no", nativeName: "Norsk", direction: "ltr", aiLanguageName: "Norwegian" },
  pl: { locale: "pl", nativeName: "Polski", direction: "ltr", aiLanguageName: "Polish" },
  it: { locale: "it", nativeName: "Italiano", direction: "ltr", aiLanguageName: "Italian" },
  es: { locale: "es", nativeName: "Español", direction: "ltr", aiLanguageName: "Spanish" },
  pt: { locale: "pt", nativeName: "Português", direction: "ltr", aiLanguageName: "Portuguese" },
  cs: { locale: "cs", nativeName: "Čeština", direction: "ltr", aiLanguageName: "Czech" },
  el: { locale: "el", nativeName: "Ελληνικά", direction: "ltr", aiLanguageName: "Greek" },
  hu: { locale: "hu", nativeName: "Magyar", direction: "ltr", aiLanguageName: "Hungarian" },
  ro: { locale: "ro", nativeName: "Română", direction: "ltr", aiLanguageName: "Romanian" },
  sk: { locale: "sk", nativeName: "Slovenčina", direction: "ltr", aiLanguageName: "Slovak" },
  sl: { locale: "sl", nativeName: "Slovenščina", direction: "ltr", aiLanguageName: "Slovenian" },
  hr: { locale: "hr", nativeName: "Hrvatski", direction: "ltr", aiLanguageName: "Croatian" },
  bg: { locale: "bg", nativeName: "Български", direction: "ltr", aiLanguageName: "Bulgarian" },
  et: { locale: "et", nativeName: "Eesti", direction: "ltr", aiLanguageName: "Estonian" },
  lv: { locale: "lv", nativeName: "Latviešu", direction: "ltr", aiLanguageName: "Latvian" },
  lt: { locale: "lt", nativeName: "Lietuvių", direction: "ltr", aiLanguageName: "Lithuanian" },
  ga: { locale: "ga", nativeName: "Gaeilge", direction: "ltr", aiLanguageName: "Irish" },
  mt: { locale: "mt", nativeName: "Malti", direction: "ltr", aiLanguageName: "Maltese" },
  tr: { locale: "tr", nativeName: "Türkçe", direction: "ltr", aiLanguageName: "Turkish" },
  ar: { locale: "ar", nativeName: localeConfig.ar.label, direction: localeConfig.ar.direction, aiLanguageName: localeConfig.ar.aiLanguageName },
} satisfies { [Key in LegacyLocale]: LanguageMetadata };

export const languages = {
  ...legacyLanguages,
  ...Object.fromEntries(sharedLocales.map(locale => [locale, {
    locale, nativeName: localeConfig[locale].label,
    direction: localeConfig[locale].direction,
    aiLanguageName: localeConfig[locale].aiLanguageName,
  }])),
} as Record<Locale, LanguageMetadata>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some((locale) => locale === value);
}
export function getTranslations(locale: Locale): Translations { return isSharedLocale(locale) ? webCopy(locale) : translations[locale] }
export function getDirection(locale: Locale): TextDirection { return isSharedLocale(locale) ? getLocaleDirection(locale) : languages[locale].direction }
export { formatMessage } from "@citywalk/i18n";
