import ar from "@/translations/ar.json";
import bg from "@/translations/bg.json";
import cs from "@/translations/cs.json";
import da from "@/translations/da.json";
import de from "@/translations/de.json";
import el from "@/translations/el.json";
import en from "@/translations/en.json";
import es from "@/translations/es.json";
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
import nl from "@/translations/nl.json";
import no from "@/translations/no.json";
import pl from "@/translations/pl.json";
import pt from "@/translations/pt.json";
import ro from "@/translations/ro.json";
import sk from "@/translations/sk.json";
import sl from "@/translations/sl.json";
import sv from "@/translations/sv.json";
import tr from "@/translations/tr.json";

export const locales = [
  "de", "da", "nl", "sv", "en", "fr", "fi", "no", "pl", "it", "es",
  "pt", "cs", "el", "hu", "ro", "sk", "sl", "hr", "bg", "et", "lv",
  "lt", "ga", "mt", "tr", "ar",
] as const;

export type Locale = (typeof locales)[number];
export type TextDirection = "ltr" | "rtl";
type StringSchema<T> = { [Key in keyof T]: T[Key] extends string ? string : StringSchema<T[Key]> };
export type Translations = StringSchema<typeof en>;

const translations = {
  de, da, nl, sv, en, fr, fi, no, pl, it, es, pt, cs, el, hu, ro, sk, sl,
  hr, bg, et, lv, lt, ga, mt, tr, ar,
} satisfies { [Key in Locale]: Translations };

type LanguageMetadata = { locale: Locale; nativeName: string; direction: TextDirection; aiLanguageName: string };

export const languages = {
  de: { locale: "de", nativeName: "Deutsch", direction: "ltr", aiLanguageName: "German" },
  da: { locale: "da", nativeName: "Dansk", direction: "ltr", aiLanguageName: "Danish" },
  nl: { locale: "nl", nativeName: "Nederlands", direction: "ltr", aiLanguageName: "Dutch" },
  sv: { locale: "sv", nativeName: "Svenska", direction: "ltr", aiLanguageName: "Swedish" },
  en: { locale: "en", nativeName: "English", direction: "ltr", aiLanguageName: "English" },
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
  ar: { locale: "ar", nativeName: "العربية", direction: "rtl", aiLanguageName: "Arabic" },
} satisfies { [Key in Locale]: LanguageMetadata };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some((locale) => locale === value);
}
export function getTranslations(locale: Locale): Translations { return translations[locale] }
export function getDirection(locale: Locale): TextDirection { return languages[locale].direction }
export function formatMessage(message: string, values: Readonly<Record<string, string | number>>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), message);
}
