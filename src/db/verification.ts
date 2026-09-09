import type { CityRow, PlaceRow } from "@/db/schema";
import {
  lubeckCitySeed,
  lubeckPlaceSeeds,
  type PlaceSeedRow,
} from "@/db/seedData";

export type DatabaseCitySnapshot = Readonly<
  Pick<CityRow, "id" | "slug" | "name">
>;

export type DatabasePlaceSnapshot = Readonly<
  Pick<
    PlaceRow,
    | "cityId"
    | "slug"
    | "category"
    | "latitude"
    | "longitude"
    | "durationMinutes"
    | "environment"
    | "pricing"
    | "status"
    | "statusVerifiedAt"
    | "visitNoteVerifiedAt"
    | "visitNoteValidUntil"
    | "image"
    | "tags"
  >
>;

export type LubeckDatabaseVerification = Readonly<{
  cityCount: number;
  placeCount: number;
  curatedHiddenGemCount: number;
  categoryCounts: Readonly<{
    see: number;
    eat: number;
    fun: number;
  }>;
}>;

export type DatabaseCatalogCityVerification = Readonly<{
  slug: string;
  name: string;
  placeCount: number;
  curatedHiddenGemCount: number;
  categoryCounts: Readonly<{
    see: number;
    eat: number;
    fun: number;
  }>;
}>;

export type DatabaseCatalogVerification = Readonly<{
  cityCount: number;
  placeCount: number;
  cities: readonly DatabaseCatalogCityVerification[];
}>;

export class DatabaseVerificationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Database verification failed: ${issues.join("; ")}`);
    this.name = "DatabaseVerificationError";
  }
}

const comparableSeedKeys = [
  "category",
  "latitude",
  "longitude",
  "durationMinutes",
  "environment",
  "pricing",
  "status",
  "statusVerifiedAt",
  "visitNoteVerifiedAt",
  "visitNoteValidUntil",
  "image",
] as const satisfies readonly (keyof PlaceSeedRow)[];

const placeCategories = new Set(["see", "eat", "fun"]);

export function verifyDatabaseCatalogSnapshot(
  cities: readonly DatabaseCitySnapshot[],
  places: readonly DatabasePlaceSnapshot[],
): DatabaseCatalogVerification {
  const issues: string[] = [];
  const citiesById = new Map<number, DatabaseCitySnapshot>();
  const citySlugs = new Set<string>();
  const cityPlaceSlugs = new Set<string>();

  if (cities.length === 0) {
    issues.push("expected at least one city");
  }

  for (const city of cities) {
    if (!city.slug.trim()) {
      issues.push(`city ${city.id} has an empty slug`);
    }
    if (!city.name.trim()) {
      issues.push(`city ${city.slug || city.id} has an empty name`);
    }
    if (citiesById.has(city.id)) {
      issues.push(`duplicate city id: ${city.id}`);
    }
    if (citySlugs.has(city.slug)) {
      issues.push(`duplicate city slug: ${city.slug}`);
    }
    citiesById.set(city.id, city);
    citySlugs.add(city.slug);
  }

  for (const place of places) {
    if (!citiesById.has(place.cityId)) {
      issues.push(`place ${place.slug} references unknown city ${place.cityId}`);
    }

    const citySlugKey = `${place.cityId}/${place.slug}`;
    if (cityPlaceSlugs.has(citySlugKey)) {
      issues.push(`duplicate city/place slug: ${citySlugKey}`);
    }
    cityPlaceSlugs.add(citySlugKey);

    if (!place.slug.trim()) {
      issues.push(`place in city ${place.cityId} has an empty slug`);
    }
    if (!placeCategories.has(place.category)) {
      issues.push(`${citySlugKey} has invalid category ${place.category}`);
    }
    if (
      !Number.isFinite(place.latitude) ||
      place.latitude < -90 ||
      place.latitude > 90
    ) {
      issues.push(`${citySlugKey} has invalid latitude`);
    }
    if (
      !Number.isFinite(place.longitude) ||
      place.longitude < -180 ||
      place.longitude > 180
    ) {
      issues.push(`${citySlugKey} has invalid longitude`);
    }
    if (!Number.isInteger(place.durationMinutes) || place.durationMinutes <= 0) {
      issues.push(`${citySlugKey} has invalid duration`);
    }
  }

  const lubeckCities = cities.filter(
    ({ slug }) => slug === lubeckCitySeed.slug,
  );
  const lubeckCityIds = new Set(lubeckCities.map(({ id }) => id));
  const lubeckPlaces = places.filter(({ cityId }) => lubeckCityIds.has(cityId));

  try {
    verifyLubeckDatabaseSnapshot(lubeckCities, lubeckPlaces);
  } catch (error) {
    if (error instanceof DatabaseVerificationError) {
      issues.push(...error.issues);
    } else {
      throw error;
    }
  }

  if (issues.length > 0) {
    throw new DatabaseVerificationError(issues);
  }

  const cityResults = cities
    .map((city): DatabaseCatalogCityVerification => {
      const cityPlaces = places.filter(({ cityId }) => cityId === city.id);
      const categoryCounts = cityPlaces.reduce(
        (counts, place) => ({
          ...counts,
          [place.category]: counts[place.category] + 1,
        }),
        { see: 0, eat: 0, fun: 0 },
      );

      return {
        slug: city.slug,
        name: city.name,
        placeCount: cityPlaces.length,
        curatedHiddenGemCount: cityPlaces.filter(
          ({ category, tags }) =>
            category === "see" && tags.includes("hidden-gem"),
        ).length,
        categoryCounts,
      };
    })
    .sort((left, right) => left.slug.localeCompare(right.slug));

  return {
    cityCount: cities.length,
    placeCount: places.length,
    cities: cityResults,
  };
}

export function verifyLubeckDatabaseSnapshot(
  cities: readonly DatabaseCitySnapshot[],
  places: readonly DatabasePlaceSnapshot[],
): LubeckDatabaseVerification {
  const issues: string[] = [];

  if (cities.length !== 1) {
    issues.push(`expected 1 Lübeck city, found ${cities.length}`);
  }

  const city = cities[0];

  if (
    city &&
    (city.slug !== lubeckCitySeed.slug || city.name !== lubeckCitySeed.name)
  ) {
    issues.push("Lübeck city metadata differs from the canonical seed");
  }

  if (places.length !== lubeckPlaceSeeds.length) {
    issues.push(
      `expected ${lubeckPlaceSeeds.length} Lübeck places, found ${places.length}`,
    );
  }

  const placesBySlug = new Map<string, DatabasePlaceSnapshot[]>();
  const citySlugKeys = new Set<string>();

  for (const place of places) {
    const matches = placesBySlug.get(place.slug) ?? [];
    matches.push(place);
    placesBySlug.set(place.slug, matches);

    const citySlugKey = `${place.cityId}/${place.slug}`;
    if (citySlugKeys.has(citySlugKey)) {
      issues.push(`duplicate city/place slug: ${place.slug}`);
    }
    citySlugKeys.add(citySlugKey);
  }

  for (const expected of lubeckPlaceSeeds) {
    const matches = placesBySlug.get(expected.slug) ?? [];

    if (matches.length !== 1) {
      issues.push(`expected ${expected.slug} once, found ${matches.length}`);
      continue;
    }

    const actual = matches[0];

    for (const key of comparableSeedKeys) {
      if ((actual[key] ?? null) !== (expected[key] ?? null)) {
        issues.push(`${expected.slug} has mismatched ${key}`);
      }
    }

    if (JSON.stringify(actual.tags) !== JSON.stringify(expected.tags)) {
      issues.push(`${expected.slug} has mismatched tags`);
    }
  }

  const canonicalSlugs = new Set(
    lubeckPlaceSeeds.map((place) => place.slug),
  );

  for (const slug of placesBySlug.keys()) {
    if (!canonicalSlugs.has(slug)) {
      issues.push(`unexpected Lübeck place: ${slug}`);
    }
  }

  if (issues.length > 0) {
    throw new DatabaseVerificationError(issues);
  }

  const categoryCounts = places.reduce(
    (counts, place) => ({
      ...counts,
      [place.category]: counts[place.category] + 1,
    }),
    { see: 0, eat: 0, fun: 0 },
  );
  const curatedHiddenGemCount = places.filter(
    (place) =>
      place.category === "see" && place.tags.includes("hidden-gem"),
  ).length;

  return {
    cityCount: cities.length,
    placeCount: places.length,
    curatedHiddenGemCount,
    categoryCounts,
  };
}
