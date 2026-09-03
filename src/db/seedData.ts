import { cities } from "@/data/cities";
import { lubeckPlaces, type Place } from "@/data/places";

import type {
  NewCityRow,
  NewPlaceRow,
} from "@/db/schema";

export type PlaceSeedRow = Omit<NewPlaceRow, "cityId">;

export const lubeckCitySeed: NewCityRow = {
  slug: cities.lubeck.slug,
  name: cities.lubeck.name,
};

export function mapPlaceToSeedRow(
  place: Place,
): PlaceSeedRow {
  return {
    slug: place.slug,
    category: place.category,
    latitude: place.coordinates.lat,
    longitude: place.coordinates.lng,
    durationMinutes: place.durationMinutes,
    environment: place.environment,
    pricing: place.pricing,
    status: place.status,
    statusVerifiedAt: place.statusVerifiedAt,
    image: place.image,
    tags: [...place.tags],
  };
}

export const lubeckPlaceSeeds =
  lubeckPlaces.map(mapPlaceToSeedRow);