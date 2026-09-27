import { hasOwn, isI18nDevelopment } from "./runtime";
export type LocalizedContent<T, L extends string = string> = Readonly<{
  requestedLocale: L; resolvedLocale: L; didFallback: boolean; content: T;
}>;
export type ContentRecord<T, L extends string = string> = {
  translations: Readonly<Partial<Record<L, T>>>;
  canonical?: { locale: L; content: T };
  identity?: string;
};
export type ContentResolverOptions = { development?: boolean; warn?: (message: string) => void };
// Resolve a whole authored record: never label an English field or audio as Arabic.
export function resolveLocalizedContent<T, L extends string>(
  record: ContentRecord<T, L>, locale: L, options: ContentResolverOptions = {},
): LocalizedContent<T, L> | undefined {
  const exact = hasOwn(record.translations, locale) ? record.translations[locale] : undefined;
  if (exact != null) return { requestedLocale: locale, resolvedLocale: locale, didFallback: false, content: exact };
  if (options.development ?? isI18nDevelopment()) {
    (options.warn ?? console.warn)(`[i18n-content] Missing translation: record=${record.identity ?? "unknown"} locale=${locale}`);
  }
  const english = hasOwn(record.translations, "en") ? record.translations["en" as L] : undefined;
  const fallback = english != null ? { locale: "en" as L, content: english } : record.canonical;
  return fallback && { requestedLocale: locale, resolvedLocale: fallback.locale, didFallback: fallback.locale !== locale, content: fallback.content };
}

// Clients receive resolved public DTOs, not CMS translation maps. Report their
// fallback metadata without changing content or trying to translate it locally.
export function reportContentFallback(
  content: { requestedLocale: string; resolvedLocale: string; didFallback: boolean },
  identity: string,
  options: ContentResolverOptions = {},
) {
  if (content.didFallback && (options.development ?? isI18nDevelopment())) {
    (options.warn ?? console.warn)(`[i18n-content] Missing translation: record=${identity} locale=${content.requestedLocale} resolved=${content.resolvedLocale}`);
  }
}
