import type { NativeLocale } from "./api/contracts";

// Production City Pass availability is product configuration, not a shared
// authorization rule. Future cities can add a configured landing destination.
const CITY_PASS_CITIES = new Set(["lubeck"]);
const CITY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function guideUpgradePath(citySlug: string, locale: NativeLocale): string | undefined {
  if (!CITY_SLUG.test(citySlug) || !CITY_PASS_CITIES.has(citySlug)) return undefined;
  return `/${locale}/pass/${citySlug}`;
}
