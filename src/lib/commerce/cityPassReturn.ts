import { isLocale, type Locale } from "@/lib/i18n";

const PLACE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createCityPassReturnPath(
  locale: Locale,
  placeSlug: string,
): string {
  if (!PLACE_SLUG.test(placeSlug)) return `/${locale}/lubeck`;
  return `/${locale}/lubeck/${placeSlug}?premium=1#premium-audio`;
}

export function resolveCityPassReturnPath(
  value: unknown,
  locale: Locale,
): string {
  if (typeof value !== "string" || value.includes("\\") || value.startsWith("//")) {
    return `/${locale}/lubeck`;
  }
  const match = /^\/([a-z]{2})\/lubeck\/([a-z0-9]+(?:-[a-z0-9]+)*)\?premium=1#premium-audio$/.exec(
    value,
  );
  if (!match || !isLocale(match[1]) || match[1] !== locale) {
    return `/${locale}/lubeck`;
  }
  return value;
}

