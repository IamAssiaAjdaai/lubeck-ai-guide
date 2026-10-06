import accountDeletionCompliance from "./account-deletion-compliance.json";
import ar from "./locales/ar.json";
import da from "./locales/da.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import nl from "./locales/nl.json";
import sv from "./locales/sv.json";
import { fallbackLocale, type SharedLocale } from "./locale-config";
import { hasOwn, isI18nDevelopment } from "./runtime";
import type { Dictionary, KeyMap, MessageTree, TranslatedMap, TranslationKey, TranslationValues } from "./types";

const baseDictionaries = { en, de, da, sv, nl, es, ar } satisfies Record<SharedLocale, Dictionary>;

function withAccountDeletionCompliance(locale: SharedLocale, dictionary: Dictionary): Dictionary {
  return {
    ...dictionary,
    lifecycle: {
      ...dictionary.lifecycle,
      ...accountDeletionCompliance[locale],
    },
  };
}

export const dictionaries = {
  en: withAccountDeletionCompliance("en", en),
  de: withAccountDeletionCompliance("de", de),
  da: withAccountDeletionCompliance("da", da),
  sv: withAccountDeletionCompliance("sv", sv),
  nl: withAccountDeletionCompliance("nl", nl),
  es: withAccountDeletionCompliance("es", es),
  ar: withAccountDeletionCompliance("ar", ar),
} satisfies Record<SharedLocale, Dictionary>;

// Compile-time guarantee that every launch dictionary still participates in the
// same typed catalog even though deletion compliance copy is maintained together.
void baseDictionaries;

export function formatMessage(message: string, values: TranslationValues): string {
  return message.replace(/\{([^{}]+)\}/g, (token, key: string) => hasOwn(values, key) ? String(values[key]) : token);
}
function lookup(tree: MessageTree | undefined, key: string): string | undefined {
  let value: string | MessageTree | undefined = tree;
  for (const part of key.split(".")) {
    if (!value || typeof value === "string" || !hasOwn(value, part)) return;
    value = value[part];
  }
  return typeof value === "string" && value.length ? value : undefined;
}
export type TranslatorOptions = {
  dictionaries?: Readonly<Record<string, MessageTree>>;
  development?: boolean;
  warn?: (message: string) => void;
};
export function createTranslator(options: TranslatorOptions = {}) {
  const catalog: Readonly<Record<string, MessageTree>> = options.dictionaries ?? dictionaries;
  const reported = new Set<string>();
  return (locale: string, key: TranslationKey, values?: TranslationValues): string => {
    let value = lookup(catalog[locale], key);
    if (value === undefined) {
      const id = `${locale}:${key}`;
      if ((options.development ?? isI18nDevelopment()) && !reported.has(id)) {
        reported.add(id);
        (options.warn ?? console.warn)(`[i18n] Missing translation: locale=${locale} key=${key}`);
      }
      value = lookup(catalog[fallbackLocale], key) ?? key;
    }
    return values ? formatMessage(value, values) : value;
  };
}
export const t = createTranslator();
// Compatibility views hold keys only. Strings live exclusively in JSON catalogs.
const viewCache = new WeakMap<KeyMap, Map<string, unknown>>();
export function translateKeys<const T extends KeyMap>(locale: string, keys: T): TranslatedMap<T> {
  let cache = viewCache.get(keys);
  if (!cache) { cache = new Map(); viewCache.set(keys, cache); }
  if (cache.has(locale)) return cache.get(locale) as TranslatedMap<T>;
  const result = Object.freeze(Object.fromEntries(Object.entries(keys).map(([name, key]) =>
    [name, typeof key === "string" ? t(locale, key) : translateKeys(locale, key)])));
  cache.set(locale, result);
  return result as TranslatedMap<T>;
}
export function categoryLabel(tag: string, locale: string): string {
  const key = `categories.${tag}`;
  return lookup(en, key) === undefined ? tag.replaceAll("-", " ") : t(locale, key as TranslationKey);
}
