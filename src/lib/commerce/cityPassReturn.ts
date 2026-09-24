import { cityPassDestination, isCitySlug } from "@/lib/commerce/cityPassConfig";
import { isLocale, type Locale } from "@/lib/i18n";

const PLACE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CITY_PASS_RETURN_STORAGE_KEY = "citywalk:city-pass:return";

export type CityPassReturnIntent = Readonly<{
  path: string;
  citySlug: string;
  placeSlug?: string;
}>;

export function createCityPassLandingPath(locale: Locale, citySlug: string): string {
  return isCitySlug(citySlug) ? `/${locale}/pass/${citySlug}` : `/${locale}`;
}

export function createCityPassReturnPath(
  locale: Locale,
  citySlug: string,
  placeSlug: string,
): string {
  if (!isCitySlug(citySlug) || !PLACE_SLUG.test(placeSlug)) {
    return cityPassDestination(locale, citySlug);
  }
  return `/${locale}/${citySlug}/${placeSlug}?premium=1#premium-audio`;
}

export function parseCityPassReturnPath(
  value: unknown,
  locale: Locale,
): CityPassReturnIntent | undefined {
  if (
    typeof value !== "string" ||
    value.includes("\\") ||
    value.startsWith("//")
  ) {
    return undefined;
  }
  const landing = /^\/([a-z]{2})\/pass\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (landing && isLocale(landing[1]) && landing[1] === locale && isCitySlug(landing[2])) {
    return { path: value, citySlug: landing[2] };
  }
  const match = /^\/([a-z]{2})\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\?premium=1#premium-audio$/.exec(
    value,
  );
  if (
    !match ||
    !isLocale(match[1]) ||
    match[1] !== locale ||
    !isCitySlug(match[2])
  ) {
    return undefined;
  }
  return { path: value, citySlug: match[2], placeSlug: match[3] };
}

export function resolveCityPassReturnPath(
  value: unknown,
  locale: Locale,
): string {
  return parseCityPassReturnPath(value, locale)?.path ?? `/${locale}`;
}
