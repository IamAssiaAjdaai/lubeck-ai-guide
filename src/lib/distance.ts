export type GeographicCoordinates = Readonly<{
  lat: number;
  lng: number;
}>;

export type PlaceDistance = Readonly<{
  distanceMeters: number;
  walkingMinutes: number;
}>;

export type LocalizedPlaceDistance = PlaceDistance &
  Readonly<{
    distanceLabel: string;
    walkingTimeLabel: string;
  }>;

export type PlaceWithDistance<T> = T &
  Readonly<{
    distance?: PlaceDistance;
  }>;

export const DEFAULT_WALKING_SPEED_KMH = 4.8;

const EARTH_RADIUS_METERS = 6_371_008.8;

function isValidCoordinates(
  coordinates: GeographicCoordinates,
): boolean {
  return (
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  );
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates geographic straight-line distance over the earth's surface.
 * This is not pedestrian-route distance and must not be presented as routing.
 */
export function calculateDistanceMeters(
  origin: GeographicCoordinates,
  destination: GeographicCoordinates,
): number | undefined {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
    return undefined;
  }

  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const normalizedHaversine = Math.min(1, Math.max(0, haversine));
  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(normalizedHaversine),
      Math.sqrt(1 - normalizedHaversine),
    );

  return EARTH_RADIUS_METERS * centralAngle;
}

export function estimateWalkingMinutes(
  distanceMeters: number,
  walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH,
): number | undefined {
  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0 ||
    !Number.isFinite(walkingSpeedKmh) ||
    walkingSpeedKmh <= 0
  ) {
    return undefined;
  }

  const minutes = (distanceMeters / 1000 / walkingSpeedKmh) * 60;
  return Math.max(1, Math.round(minutes));
}

export function calculatePlaceDistance(
  place: Readonly<{ coordinates: GeographicCoordinates }>,
  origin: GeographicCoordinates,
  walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH,
): PlaceDistance | undefined {
  const distanceMeters = calculateDistanceMeters(origin, place.coordinates);
  if (distanceMeters === undefined) return undefined;

  const walkingMinutes = estimateWalkingMinutes(
    distanceMeters,
    walkingSpeedKmh,
  );
  if (walkingMinutes === undefined) return undefined;

  return { distanceMeters, walkingMinutes };
}

export function withPlaceDistance<
  T extends Readonly<{ coordinates: GeographicCoordinates }>,
>(
  place: T,
  origin?: GeographicCoordinates,
  walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH,
): PlaceWithDistance<T> {
  if (!origin) return { ...place };

  const distance = calculatePlaceDistance(place, origin, walkingSpeedKmh);
  return distance ? { ...place, distance } : { ...place };
}

export function withPlacesDistance<
  T extends Readonly<{ coordinates: GeographicCoordinates }>,
>(
  places: readonly T[],
  origin?: GeographicCoordinates,
  walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH,
): readonly PlaceWithDistance<T>[] {
  return places.map((place) =>
    withPlaceDistance(place, origin, walkingSpeedKmh),
  );
}

export function formatDistance(
  distanceMeters: number,
  locale: string,
): string | undefined {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return undefined;

  if (distanceMeters < 1000) {
    const roundedMeters =
      distanceMeters === 0
        ? 0
        : Math.max(10, Math.round(distanceMeters / 10) * 10);

    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "meter",
      unitDisplay: "short",
      maximumFractionDigits: 0,
    }).format(roundedMeters);
  }

  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "kilometer",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(distanceMeters / 1000);
}

export function formatWalkingTime(
  walkingMinutes: number,
  locale: string,
  template: string,
): string | undefined {
  if (!Number.isFinite(walkingMinutes) || walkingMinutes < 1) return undefined;

  return template.replace(
    "{minutes}",
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      Math.round(walkingMinutes),
    ),
  );
}

export function localizePlaceDistance(
  distance: PlaceDistance,
  locale: string,
  walkingTimeTemplate: string,
): LocalizedPlaceDistance | undefined {
  const distanceLabel = formatDistance(distance.distanceMeters, locale);
  const walkingTimeLabel = formatWalkingTime(
    distance.walkingMinutes,
    locale,
    walkingTimeTemplate,
  );

  if (!distanceLabel || !walkingTimeLabel) return undefined;

  return { ...distance, distanceLabel, walkingTimeLabel };
}

export function sortPlacesByDistance<
  T extends Readonly<{ distance?: PlaceDistance }>,
>(places: readonly T[]): readonly T[] {
  return [...places].sort((first, second) => {
    const firstDistance = first.distance?.distanceMeters;
    const secondDistance = second.distance?.distanceMeters;

    if (firstDistance === undefined && secondDistance === undefined) {
      return 0;
    }

    if (firstDistance === undefined) return 1;
    if (secondDistance === undefined) return -1;

    return firstDistance - secondDistance;
  });
}