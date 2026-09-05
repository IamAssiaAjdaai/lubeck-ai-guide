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
  "image",
] as const satisfies readonly (keyof PlaceSeedRow)[];

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
