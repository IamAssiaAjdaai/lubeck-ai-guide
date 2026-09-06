import type { PublicationStatus } from "@/lib/admin/content/validation";

export const TOUR_CITY_NOT_PUBLISHED_ERROR =
  "A published tour requires its city to be published.";
export const TOUR_STOP_NOT_PUBLISHED_ERROR =
  "Every stop in a published tour must be published.";
export const PUBLISHED_TOUR_PLACE_ARCHIVE_ERROR =
  "This place is referenced by a published tour. Archive or update the affected tour first.";
export const CROSS_CITY_PLACE_MOVE_ERROR =
  "This place is used by a tour in its current city. Remove it from every affected tour before moving it.";

export function getPublishedTourGraphError(
  cityStatus: PublicationStatus,
  stopStatuses: readonly PublicationStatus[],
): string | undefined {
  if (cityStatus !== "published") return TOUR_CITY_NOT_PUBLISHED_ERROR;
  if (stopStatuses.some((status) => status !== "published")) {
    return TOUR_STOP_NOT_PUBLISHED_ERROR;
  }
  return undefined;
}

export function hasCrossCityTourReference(
  targetCityId: number,
  referencingTourCityIds: readonly number[],
): boolean {
  return referencingTourCityIds.some((cityId) => cityId !== targetCityId);
}
