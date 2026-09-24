import {
  calculateDistanceMeters,
  type GeographicCoordinates,
} from "@/lib/distance";

export const DEFAULT_ARRIVAL_RADIUS_METERS = 50;

export type ArrivalCandidate = Readonly<{
  slug: string;
  coordinates: GeographicCoordinates;
  detailHref?: string;
}>;

export type ArrivalMatch<T extends ArrivalCandidate> = Readonly<{
  place: T;
  detailHref: string;
  distanceMeters: number;
}>;

function isValidArrivalRadius(radiusMeters: number): boolean {
  return Number.isFinite(radiusMeters) && radiusMeters > 0;
}

export function isWithinArrivalRadius(
  userLocation: GeographicCoordinates,
  destination: GeographicCoordinates,
  radiusMeters = DEFAULT_ARRIVAL_RADIUS_METERS,
): boolean {
  if (!isValidArrivalRadius(radiusMeters)) {
    return false;
  }

  const distanceMeters = calculateDistanceMeters(
    userLocation,
    destination,
  );

  return (
    distanceMeters !== undefined &&
    distanceMeters <= radiusMeters
  );
}

export function findArrivalMatch<
  T extends ArrivalCandidate,
>(
  places: readonly T[],
  userLocation: GeographicCoordinates,
  promptedSlugs: ReadonlySet<string>,
  radiusMeters = DEFAULT_ARRIVAL_RADIUS_METERS,
): ArrivalMatch<T> | undefined {
  if (!isValidArrivalRadius(radiusMeters)) {
    return undefined;
  }

  let nearestMatch: ArrivalMatch<T> | undefined;

  for (const place of places) {
    if (!place.detailHref) continue;
    if (promptedSlugs.has(place.slug)) continue;

    const distanceMeters = calculateDistanceMeters(
      userLocation,
      place.coordinates,
    );

    if (
      distanceMeters === undefined ||
      distanceMeters > radiusMeters
    ) {
      continue;
    }

    if (
      !nearestMatch ||
      distanceMeters < nearestMatch.distanceMeters
    ) {
      nearestMatch = {
        place,
        detailHref: place.detailHref,
        distanceMeters,
      };
    }
  }

  return nearestMatch;
}