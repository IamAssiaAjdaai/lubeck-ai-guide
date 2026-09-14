import type {
  PublicCityResponse,
  PublicCitySummaryResponse,
  PublicPlace,
  PublicTour,
} from "./api/contracts";

export type CityRouteIdentity = Readonly<{ citySlug: string }>;
export type PlaceRouteIdentity = Readonly<{ citySlug: string; placeSlug: string }>;
export type TourRouteIdentity = Readonly<{ citySlug: string; tourSlug: string }>;

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

export function parseTourRouteIdentity(
  cityValue: unknown,
  tourValue: unknown,
): TourRouteIdentity | undefined {
  const city = parseCityRouteIdentity(cityValue);
  const tourSlug = singleRouteValue(tourValue);
  return city && tourSlug && SLUG_PATTERN.test(tourSlug)
    ? { ...city, tourSlug }
    : undefined;
}

export function cityRoute(citySlug: string) {
  return `/city/${citySlug}` as const;
}

export function placeRoute(citySlug: string, placeSlug: string) {
  return `/city/${citySlug}/place/${placeSlug}` as const;
}

export function tourRoute(citySlug: string, tourSlug: string) {
  return `/city/${citySlug}/tour/${tourSlug}` as const;
}

export function guideRoute(citySlug: string, placeSlug: string) {
  return `/city/${citySlug}/guide/${placeSlug}` as const;
}

export function resolvePlaceForRoute(
  response: PublicCityResponse,
  identity: PlaceRouteIdentity,
): PublicPlace | undefined {
  if (response.city.slug !== identity.citySlug) return undefined;
  return response.places.find(({ slug }) => slug === identity.placeSlug);
}

export function resolveTourForRoute(
  response: PublicCityResponse | PublicCitySummaryResponse,
  identity: TourRouteIdentity,
): PublicTour | undefined {
  if (response.city.slug !== identity.citySlug) return undefined;
  return response.tours.find(({ slug }) => slug === identity.tourSlug);
}

function singleRouteValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
