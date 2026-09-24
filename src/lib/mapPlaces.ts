import type { Place, PlaceCategory, PlaceCoordinates } from "@/data/places";
import { resolvePlaceContent } from "@/data/places";
import { getDirection, type Locale, type TextDirection } from "@/lib/i18n";

export type MapPlace = Readonly<{
  slug: string;
  category: PlaceCategory;
  image?: string;
  coordinates: PlaceCoordinates;
  name: string;
  shortDescription: string;
  visitNote?: string;
  durationMinutes: number;
  tags?: readonly string[];
  status?: Place["status"];
  statusVerifiedAt?: string;
  visitNoteVerifiedAt?: string;
  visitNoteValidUntil?: string;
  requestedLocale: Locale;
  actualLocale: Locale;
  contentDirection: TextDirection;
  didFallback: boolean;
  detailHref?: string;
}>;

export type MapBounds = readonly [
  southwest: readonly [lng: number, lat: number],
  northeast: readonly [lng: number, lat: number],
];

type PrepareMapPlacesOptions = Readonly<{
  getDetailHref?: (place: Place) => string | undefined;
}>;

export function isValidMapCoordinate(
  coordinates: PlaceCoordinates,
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

export function prepareMapPlaces(
  places: readonly Place[],
  requestedLocale: Locale,
  options: PrepareMapPlacesOptions = {},
): readonly MapPlace[] {
  return places.flatMap((place): MapPlace[] => {
    if (!isValidMapCoordinate(place.coordinates)) return [];

    const resolvedContent = resolvePlaceContent(place, requestedLocale);
    if (!resolvedContent) return [];

    const detailHref = options.getDetailHref?.(place);

    return [
      {
        slug: place.slug,
        category: place.category,
        image: place.image,
        coordinates: place.coordinates,
        name: resolvedContent.content.name,
        shortDescription: resolvedContent.content.shortDescription,
        visitNote: resolvedContent.content.visitNote,
        durationMinutes: place.durationMinutes,
        tags: place.tags,
        status: place.status,
        statusVerifiedAt:
          place.statusVerifiedAt,
        visitNoteVerifiedAt:
          place.visitNoteVerifiedAt,
        visitNoteValidUntil:
          place.visitNoteValidUntil,
        requestedLocale: resolvedContent.requestedLocale,
        actualLocale: resolvedContent.actualLocale,
        contentDirection: getDirection(resolvedContent.actualLocale),
        didFallback: resolvedContent.didFallback,
        ...(detailHref ? { detailHref } : {}),
      },
    ];
  });
}

export function calculateMapBounds(
  places: readonly Pick<MapPlace, "coordinates">[],
): MapBounds | undefined {
  if (places.length === 0) return undefined;

  let west = places[0].coordinates.lng;
  let east = places[0].coordinates.lng;
  let south = places[0].coordinates.lat;
  let north = places[0].coordinates.lat;

  for (const place of places.slice(1)) {
    west = Math.min(west, place.coordinates.lng);
    east = Math.max(east, place.coordinates.lng);
    south = Math.min(south, place.coordinates.lat);
    north = Math.max(north, place.coordinates.lat);
  }

  return [
    [west, south],
    [east, north],
  ];
}

export function getMapMarkerAriaLabel(
  placeName: string,
  categoryLabel: string,
): string {
  return `${placeName} — ${categoryLabel}`;
}
