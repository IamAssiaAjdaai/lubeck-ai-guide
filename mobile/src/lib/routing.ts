import type { PublicCityResponse, PublicPlace } from "./api/contracts";

export type CityRouteIdentity = Readonly<{ citySlug: string }>;
export type PlaceRouteIdentity = Readonly<{ citySlug: string; placeSlug: string }>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseCityRouteIdentity(value: unknown): CityRouteIdentity | undefined {
  const citySlug = singleRouteValue(value);
  return citySlug && SLUG_PATTERN.test(citySlug) ? { citySlug } : undefined;
}

export function parsePlaceRouteIdentity(
  cityValue: unknown,
  placeValue: unknown,
): PlaceRouteIdentity | undefined {
  const city = parseCityRouteIdentity(cityValue);
  const placeSlug = singleRouteValue(placeValue);
  return city && placeSlug && SLUG_PATTERN.test(placeSlug)
    ? { ...city, placeSlug }
    : undefined;
}

export function cityRoute(citySlug: string) {
  return `/city/${citySlug}` as const;
}

export function placeRoute(citySlug: string, placeSlug: string) {
  return `/city/${citySlug}/place/${placeSlug}` as const;
}

export function resolvePlaceForRoute(
  response: PublicCityResponse,
  identity: PlaceRouteIdentity,
): PublicPlace | undefined {
  if (response.city.slug !== identity.citySlug) return undefined;
  return response.places.find(({ slug }) => slug === identity.placeSlug);
}

function singleRouteValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
