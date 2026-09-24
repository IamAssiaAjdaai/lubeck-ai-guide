import "server-only";
import { isCityLaunched } from "@/data/cityAvailability";
import { PublicContentNotFoundError } from "./errors";

import { and, asc, eq, inArray } from "drizzle-orm";

import { cities } from "@/data/cities";
import {
  getPlace,
  lubeckLandmarks,
  lubeckPlaces,
  type Place,
  type PlaceContent,
} from "@/data/places";
import { getDb } from "@/db/client";
import {
  citiesTable,
  cityLocalizationsTable,
  contentTagsTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placeRevisionsTable,
  placesTable,
  tourLocalizationsTable,
  toursTable,
  tourStopsTable,
} from "@/db/schema";
import { assertContentSourceAllowed, getContentSource, type ContentSource } from "@/lib/content/source";
import { getTranslations, isLocale, locales, type Locale } from "@/lib/i18n";
import { getPublicMediaSnapshot } from "@/lib/media/publicMedia.server";
import {
  publicLegacyImageVariants,
  publicMediaImageVariants,
} from "@/lib/media/imageVariants";
import type { PublicMedia } from "@/lib/media/types";

export type PublicCityLocalization = Readonly<{
  name: string;
  shortDescription?: string;
  description?: string;
}>;

export type PublicTourLocalization = Readonly<{
  title: string;
  shortDescription?: string;
  description?: string;
}>;

export type PublicTour = Readonly<{
  slug: string;
  estimatedDurationMinutes?: number;
  content: Readonly<Partial<Record<Locale, PublicTourLocalization>>>;
  stops: readonly Readonly<{
    placeSlug: string;
    position: number;
    visitDurationMinutes?: number;
  }>[];
}>;

export type PublicCitySnapshot = Readonly<{
  city: Readonly<{
    slug: string;
    countryCode?: string;
    timezone?: string;
    content: Readonly<Partial<Record<Locale, PublicCityLocalization>>>;
  }>;
  places: readonly Place[];
  tours: readonly PublicTour[];
  media?: Readonly<{
    city: readonly PublicMedia[];
    places: Readonly<Record<string, readonly PublicMedia[]>>;
    tours: Readonly<Record<string, readonly PublicMedia[]>>;
  }>;
}>;

export type PublicCitySummary = Readonly<{
  city: Readonly<{
    slug: string;
    countryCode?: string;
    timezone?: string;
    content: Readonly<Partial<Record<Locale, PublicCityLocalization>>>;
  }>;
  media?: readonly PublicMedia[];
}>;

export type PublicPlaceCard = Readonly<{
  slug: string;
  category: Place["category"];
  coordinates: Place["coordinates"];
  durationMinutes: number;
  environment: Place["environment"];
  pricing: Place["pricing"];
  status?: Place["status"];
  tags: readonly string[];
  image?: string;
  imageVariants?: ReturnType<typeof publicLegacyImageVariants>;
  media: readonly PublicMedia[];
  requestedLocale: Locale;
  resolvedLocale: Locale;
  didFallback: boolean;
  content: Readonly<{
    name: string;
    shortDescription: string;
  }>;
}>;

export type ResolvedPublicContent<TContent> = Readonly<{
  requestedLocale: Locale;
  resolvedLocale: Locale;
  didFallback: boolean;
  content: TContent;
}>;

export type TravelerDiscoverabilityInput = Readonly<{
  publicationStatus: string;
  authoredLocalizationCount: number;
  publishedTravelerVisiblePlaceCount: number;
}>;

export function isTravelerDiscoverableCity({
  publicationStatus,
  authoredLocalizationCount,
  publishedTravelerVisiblePlaceCount,
}: TravelerDiscoverabilityInput): boolean {
  return (
    publicationStatus === "published" &&
    authoredLocalizationCount > 0 &&
    publishedTravelerVisiblePlaceCount > 0
  );
}

export async function getPublicCitySnapshot(
  citySlug: string,
  source: ContentSource = getContentSource(),
): Promise<PublicCitySnapshot> {
  assertContentSourceAllowed(source);
  if (!isCityLaunched(citySlug)) throw new PublicContentNotFoundError();
  if (source === "code") return getCodeSnapshot(citySlug);
  if (source === "database") {
    const snapshot = await loadPublishedDatabaseSnapshot(citySlug);
    assertCompleteSnapshot(snapshot);
    return snapshot;
  }
  try {
    const snapshot = await loadPublishedDatabaseSnapshot(citySlug);
    assertCompleteSnapshot(snapshot);
    return snapshot;
  } catch {
    console.warn("CITYWALK development auto source: using curated code because the database snapshot is unavailable.");
    return getCodeSnapshot(citySlug);
  }
}

export async function getPublicCitySummaries(
  source: ContentSource = getContentSource(),
): Promise<readonly PublicCitySummary[]> {
  assertContentSourceAllowed(source);
  if (source === "code") return [getCodeCitySummary()];
  if (source === "database") return loadPublishedDatabaseCitySummaries();
  try {
    const summaries = await loadPublishedDatabaseCitySummaries();
    if (summaries.length > 0) return summaries;
    console.warn("CITYWALK development auto source: using curated code because no cities are published.");
    return [getCodeCitySummary()];
  } catch {
    console.warn("CITYWALK development auto source: using curated code because city discovery is unavailable.");
    return [getCodeCitySummary()];
  }
}

export function resolvePublicLocalization<TContent>(
  content: Readonly<Partial<Record<Locale, TContent>>>,
  requestedLocale: Locale,
): ResolvedPublicContent<TContent> | undefined {
  const exact = content[requestedLocale];
  if (exact) {
    return {
      requestedLocale,
      resolvedLocale: requestedLocale,
      didFallback: false,
      content: exact,
    };
  }
  for (const resolvedLocale of ["en", "de", ...locales] as const) {
    const fallback = content[resolvedLocale];
    if (fallback) {
      return {
        requestedLocale,
        resolvedLocale,
        didFallback: true,
        content: fallback,
      };
    }
  }
  return undefined;
}

export function toLocalizedPublicCityResponse(
  snapshot: PublicCitySnapshot,
  requestedLocale: Locale,
) {
  const city = resolvePublicLocalization(snapshot.city.content, requestedLocale);
  if (!city) throw new Error("Published city has no authored localization.");
  return {
    city: {
      slug: snapshot.city.slug,
      ...(snapshot.city.countryCode ? { countryCode: snapshot.city.countryCode } : {}),
      ...(snapshot.city.timezone ? { timezone: snapshot.city.timezone } : {}),
      ...city,
      media: publicMediaForLocale(snapshot.media?.city ?? [], requestedLocale),
    },
    places: snapshot.places.flatMap((place) => {
      const resolved = resolvePublicLocalization(place.content, requestedLocale);
      if (!resolved) return [];
      return [{
        slug: place.slug,
        category: place.category,
        coordinates: place.coordinates,
        durationMinutes: place.durationMinutes,
        environment: place.environment,
        pricing: place.pricing,
        status: place.status,
        statusVerifiedAt: place.statusVerifiedAt,
        visitNoteVerifiedAt: place.visitNoteVerifiedAt,
        visitNoteValidUntil: place.visitNoteValidUntil,
        image: place.image,
        ...(place.image ? { imageVariants: publicLegacyImageVariants(place.image) } : {}),
        tags: place.tags,
        media: publicMediaForLocale(
          snapshot.media?.places[place.slug] ?? [],
          requestedLocale,
        ),
        ...resolved,
      }];
    }),
    tours: snapshot.tours.flatMap((tour) => {
      const resolved = resolvePublicLocalization(tour.content, requestedLocale);
      if (!resolved) return [];
      return [{
        slug: tour.slug,
        estimatedDurationMinutes: tour.estimatedDurationMinutes,
        stops: tour.stops,
        media: publicMediaForLocale(
          snapshot.media?.tours[tour.slug] ?? [],
          requestedLocale,
        ),
        ...resolved,
      }];
    }),
  };
}

export function toLocalizedPublicCitySummaryResponse(
  snapshot: PublicCitySnapshot,
  requestedLocale: Locale,
) {
  const full = toLocalizedPublicCityResponse(snapshot, requestedLocale);
  return {
    city: full.city,
    places: full.places.map((place): PublicPlaceCard => ({
      slug: place.slug,
      category: place.category,
      coordinates: place.coordinates,
      durationMinutes: place.durationMinutes,
      environment: place.environment,
      pricing: place.pricing,
      ...(place.status ? { status: place.status } : {}),
      tags: place.tags,
      ...(place.image ? { image: place.image } : {}),
      ...(place.imageVariants ? { imageVariants: place.imageVariants } : {}),
      media: place.media.filter(
        ({ kind, purpose }) =>
          kind === "image" && ["card", "hero", "thumbnail"].includes(purpose),
      ),
      requestedLocale: place.requestedLocale,
      resolvedLocale: place.resolvedLocale,
      didFallback: place.didFallback,
      content: {
        name: place.content.name,
        shortDescription: place.content.shortDescription,
      },
    })),
    tours: full.tours.map((tour) => ({
      ...tour,
      content: {
        title: tour.content.title,
        ...(tour.content.shortDescription
          ? { shortDescription: tour.content.shortDescription }
          : {}),
      },
      media: tour.media.filter(
        ({ kind, purpose }) =>
          kind === "image" && ["card", "hero", "thumbnail"].includes(purpose),
      ),
    })),
  };
}

export function toLocalizedPublicPlaceResponse(
  snapshot: PublicCitySnapshot,
  placeSlug: string,
  requestedLocale: Locale,
) {
  const full = toLocalizedPublicCityResponse(snapshot, requestedLocale);
  const place = full.places.find(({ slug }) => slug === placeSlug);
  if (!place) throw new PublicContentNotFoundError("Published place not found.");
  return { city: full.city, place };
}

export function toLocalizedPublicCityIndexResponse(
  summaries: readonly PublicCitySummary[],
  requestedLocale: Locale,
) {
  return {
    cities: summaries.flatMap((summary) => {
      const resolved = resolvePublicLocalization(
        summary.city.content,
        requestedLocale,
      );
      if (!resolved) return [];
      return [{
        slug: summary.city.slug,
        ...(summary.city.countryCode ? { countryCode: summary.city.countryCode } : {}),
        ...(summary.city.timezone ? { timezone: summary.city.timezone } : {}),
        name: resolved.content.name,
        ...(resolved.content.shortDescription
          ? { shortDescription: resolved.content.shortDescription }
          : {}),
        requestedLocale: resolved.requestedLocale,
        resolvedLocale: resolved.resolvedLocale,
        didFallback: resolved.didFallback,
        media: publicMediaForLocale(summary.media ?? [], requestedLocale),
      }];
    }),
  };
}

async function loadPublishedDatabaseSnapshot(
  citySlug: string,
): Promise<PublicCitySnapshot> {
  const db = getDb();
  const [city] = await db
    .select()
    .from(citiesTable)
    .where(eq(citiesTable.slug, citySlug))
    .limit(1);
  if (!city || city.publicationStatus !== "published") {
    throw new PublicContentNotFoundError("Published city snapshot is unavailable.");
  }
  const [cityLocalizations, placeRows, tourRows] = await Promise.all([
    db
      .select()
      .from(cityLocalizationsTable)
      .where(eq(cityLocalizationsTable.cityId, city.id)),
    db
      .select()
      .from(placesTable)
      .where(eq(placesTable.cityId, city.id))
      .orderBy(asc(placesTable.id)),
    db
      .select()
      .from(toursTable)
      .where(eq(toursTable.cityId, city.id))
      .orderBy(asc(toursTable.id)),
  ]);
  const placeIds = placeRows.map(({ id }) => id);
  const tourIds = tourRows.map(({ id }) => id);
  const [placeRevisions, placeLocalizations, tagRelations, tourLocalizations, stopRows] =
    await Promise.all([
      placeIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(placeRevisionsTable)
            .where(and(
              eq(placeRevisionsTable.isCurrent, true),
              inArray(placeRevisionsTable.placeId, placeIds),
            )),
      placeIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(placeLocalizationsTable)
            .where(inArray(placeLocalizationsTable.placeId, placeIds)),
      placeIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              placeId: placeContentTagsTable.placeId,
              slug: contentTagsTable.slug,
            })
            .from(placeContentTagsTable)
            .innerJoin(
              contentTagsTable,
              eq(placeContentTagsTable.tagId, contentTagsTable.id),
            )
            .where(inArray(placeContentTagsTable.placeId, placeIds)),
      tourIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(tourLocalizationsTable)
            .where(inArray(tourLocalizationsTable.tourId, tourIds)),
      tourIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(tourStopsTable)
            .where(inArray(tourStopsTable.tourId, tourIds))
            .orderBy(asc(tourStopsTable.position)),
    ]);
  const currentRevisionByPlaceId = new Map(
    placeRevisions.map((revision) => [revision.placeId, revision] as const),
  );
  const validCityLocalizations = cityLocalizations.filter(
    ({ locale, name }) => isLocale(locale) && name.trim().length > 0,
  );
  const publishedPlaces = placeRows.filter((place) => {
    const revision = currentRevisionByPlaceId.get(place.id);
    const localizationRows = revision
      ? revision.snapshot.localizations
      : placeLocalizations.filter(({ placeId }) => placeId === place.id);
    return (
      place.publicationStatus !== "archived" &&
      (place.publicationStatus === "published" || Boolean(revision)) &&
      localizationRows.some(
        ({ locale, name }) => isLocale(locale) && name.trim().length > 0,
      )
    );
  });
  if (!isTravelerDiscoverableCity({
    publicationStatus: city.publicationStatus,
    authoredLocalizationCount: validCityLocalizations.length,
    publishedTravelerVisiblePlaceCount: publishedPlaces.length,
  })) {
    throw new PublicContentNotFoundError("Published city is not traveler-discoverable.");
  }
  const placeSlugById = new Map(
    publishedPlaces.map(({ id, slug }) => [id, slug] as const),
  );
  const publishedTourRows = tourRows.filter(
    ({ publicationStatus }) => publicationStatus === "published",
  );
  const mediaSnapshot = await getPublicMediaSnapshot(
    city.id,
    publishedPlaces.map(({ id }) => id),
    publishedTourRows.map(({ id }) => id),
  );
  if (
    publishedTourRows.some((tour) =>
      stopRows.some(
        (stop) =>
          stop.tourId === tour.id && !placeSlugById.has(stop.placeId),
      ),
    )
  ) {
    throw new Error("Published tour references unpublished content.");
  }
  const places: Place[] = publishedPlaces.map((place) => {
    const revision = currentRevisionByPlaceId.get(place.id);
    const localizationRows = revision
      ? revision.snapshot.localizations
      : placeLocalizations.filter(({ placeId }) => placeId === place.id);
    const content = Object.fromEntries(
      localizationRows
        .filter(
          ({ locale, name }) => isLocale(locale) && name.trim().length > 0,
        )
        .map((localization) => [
          localization.locale,
          {
            name: localization.name,
            shortDescription: localization.shortDescription,
            ...(localization.description
              ? { description: localization.description }
              : {}),
            ...(localization.story ? { story: localization.story } : {}),
            ...(localization.visitNotes
              ? { visitNote: localization.visitNotes }
              : {}),
            ...(localization.facts.length > 0
              ? { facts: localization.facts }
              : {}),
          } satisfies PlaceContent,
        ]),
    ) as Partial<Record<Locale, PlaceContent>>;
    const normalizedTags = revision?.snapshot.tagSlugs ??
      tagRelations
        .filter(({ placeId }) => placeId === place.id)
        .map(({ slug }) => slug);
    const canonical = getPlace(citySlug, place.slug);
    const cmsMedia = mediaSnapshot.places.get(place.id) ?? [];
    const cmsImage = cmsMedia.find(
      ({ kind, purpose }) =>
        kind === "image" && (purpose === "hero" || purpose === "card"),
    );
    const cmsAudio = Object.fromEntries(
      cmsMedia.flatMap((media) =>
        media.kind === "audio" && media.locale
          ? [[media.locale, media.url] as const]
          : [],
      ),
    );
    return {
      slug: place.slug,
      city: citySlug,
      category: revision?.snapshot.category ?? place.category,
      coordinates: {
        lat: revision?.snapshot.latitude ?? place.latitude,
        lng: revision?.snapshot.longitude ?? place.longitude,
      },
      durationMinutes: revision?.snapshot.durationMinutes ?? place.durationMinutes,
      environment: revision?.snapshot.environment ?? place.environment,
      pricing: revision?.snapshot.pricing ?? place.pricing,
      ...((revision?.snapshot.status ?? place.status) ? { status: revision?.snapshot.status ?? place.status! } : {}),
      ...((revision?.snapshot.statusVerifiedAt ?? place.statusVerifiedAt)
        ? { statusVerifiedAt: revision?.snapshot.statusVerifiedAt ?? place.statusVerifiedAt! }
        : {}),
      ...((revision?.snapshot.visitNoteVerifiedAt ?? place.visitNoteVerifiedAt)
        ? { visitNoteVerifiedAt: revision?.snapshot.visitNoteVerifiedAt ?? place.visitNoteVerifiedAt! }
        : {}),
      ...((revision?.snapshot.visitNoteValidUntil ?? place.visitNoteValidUntil)
        ? { visitNoteValidUntil: revision?.snapshot.visitNoteValidUntil ?? place.visitNoteValidUntil! }
        : {}),
      ...(cmsImage?.url
        ? { image: cmsImage.url }
        : (revision?.snapshot.image ?? place.image)
          ? { image: revision?.snapshot.image ?? place.image! }
          : {}),
      tags: normalizedTags,
      ...(canonical?.audio || Object.keys(cmsAudio).length > 0
        ? { audio: { ...canonical?.audio, ...cmsAudio } }
        : {}),
      content,
    };
  });
  const tours: PublicTour[] = publishedTourRows
    .map((tour) => ({
      slug: tour.slug,
      ...(tour.estimatedDurationMinutes
        ? { estimatedDurationMinutes: tour.estimatedDurationMinutes }
        : {}),
      content: Object.fromEntries(
        tourLocalizations
          .filter(({ tourId, locale }) => tourId === tour.id && isLocale(locale))
          .map((localization) => [localization.locale, {
            title: localization.title,
            ...(localization.shortDescription
              ? { shortDescription: localization.shortDescription }
              : {}),
            ...(localization.description
              ? { description: localization.description }
              : {}),
          }]),
      ),
      stops: stopRows
        .filter(({ tourId }) => tourId === tour.id)
        .flatMap((stop) => {
          const placeSlug = placeSlugById.get(stop.placeId);
          return placeSlug
            ? [{
                placeSlug,
                position: stop.position,
                ...(stop.visitDurationMinutes
                  ? { visitDurationMinutes: stop.visitDurationMinutes }
                  : {}),
              }]
            : [];
        }),
    }));
  return {
    city: {
      slug: city.slug,
      ...(city.countryCode ? { countryCode: city.countryCode } : {}),
      ...(city.timezone ? { timezone: city.timezone } : {}),
      content: Object.fromEntries(
        validCityLocalizations
          .map((localization) => [localization.locale, {
            name: localization.name,
            ...(localization.shortDescription
              ? { shortDescription: localization.shortDescription }
              : {}),
            ...(localization.description
              ? { description: localization.description }
              : {}),
          }]),
      ),
    },
    places,
    tours,
    media: {
      city: mediaSnapshot.city,
      places: Object.fromEntries(
        publishedPlaces.map((place) => [
          place.slug,
          mediaSnapshot.places.get(place.id) ?? [],
        ]),
      ),
      tours: Object.fromEntries(
        publishedTourRows.map((tour) => [
          tour.slug,
          mediaSnapshot.tours.get(tour.id) ?? [],
        ]),
      ),
    },
  };
}

async function loadPublishedDatabaseCitySummaries(): Promise<readonly PublicCitySummary[]> {
  const db = getDb();
  const [cityRows, localizations, placeRows, placeRevisions, placeLocalizations] = await Promise.all([
    db
      .select()
      .from(citiesTable)
      .where(eq(citiesTable.publicationStatus, "published"))
      .orderBy(asc(citiesTable.slug)),
    db.select().from(cityLocalizationsTable),
    db.select().from(placesTable),
    db
      .select()
      .from(placeRevisionsTable)
      .where(eq(placeRevisionsTable.isCurrent, true)),
    db.select().from(placeLocalizationsTable),
  ]);
  const currentRevisionByPlaceId = new Map(
    placeRevisions.map((revision) => [revision.placeId, revision] as const),
  );
  const discoverableCities = cityRows.filter((city) =>
    isCityLaunched(city.slug) && isTravelerDiscoverableCity({
      publicationStatus: city.publicationStatus,
      authoredLocalizationCount: localizations.filter(
        ({ cityId, locale, name }) =>
          cityId === city.id && isLocale(locale) && name.trim().length > 0,
      ).length,
      publishedTravelerVisiblePlaceCount: placeRows.filter(
        (place) => {
          if (place.cityId !== city.id || place.publicationStatus === "archived") {
            return false;
          }
          const revision = currentRevisionByPlaceId.get(place.id);
          if (place.publicationStatus !== "published" && !revision) return false;
          const localizationRows = revision
            ? revision.snapshot.localizations
            : placeLocalizations.filter(({ placeId }) => placeId === place.id);
          return localizationRows.some(
            ({ locale, name }) => isLocale(locale) && name.trim().length > 0,
          );
        },
      ).length,
    }),
  );
  const media = await Promise.all(
    discoverableCities.map(({ id }) => getPublicMediaSnapshot(id, [], [])),
  );
  return discoverableCities.map((city, index) => {
    const summary = {
      city: {
        slug: city.slug,
        ...(city.countryCode ? { countryCode: city.countryCode } : {}),
        ...(city.timezone ? { timezone: city.timezone } : {}),
        content: Object.fromEntries(
          localizations
            .filter(
              ({ cityId, locale, name }) =>
                cityId === city.id &&
                isLocale(locale) &&
                name.trim().length > 0,
            )
            .map((localization) => [
              localization.locale,
              {
                name: localization.name,
                ...(localization.shortDescription
                  ? { shortDescription: localization.shortDescription }
                  : {}),
                ...(localization.description
                  ? { description: localization.description }
                  : {}),
              },
            ]),
        ),
      },
      media: media[index]?.city ?? [],
    } satisfies PublicCitySummary;
    return summary;
  });
}

function getCodeSnapshot(citySlug: string): PublicCitySnapshot {
  if (citySlug !== "lubeck") {
    throw new PublicContentNotFoundError(`Canonical code content is unavailable for ${citySlug}.`);
  }
  return {
    city: {
      slug: "lubeck",
      countryCode: cities.lubeck.countryCode,
      timezone: cities.lubeck.timezone,
      content: {
        ...cities.lubeck.legacyContent,
      },
    },
    places: lubeckPlaces,
    tours: [{
      slug: "historic-center-walk",
      estimatedDurationMinutes: cities.lubeck.estimatedMinutes,
      content: Object.fromEntries(
        locales.map((locale) => {
          const translations = getTranslations(locale);
          return [locale, {
            title: translations.explore.historicCenter,
            shortDescription: translations.explore.walkingTour,
          }];
        }),
      ),
      stops: lubeckLandmarks.map((place, index) => ({
        placeSlug: place.slug,
        position: index + 1,
        visitDurationMinutes: place.durationMinutes,
      })),
    }],
  };
}

function getCodeCitySummary(): PublicCitySummary {
  return {
    city: {
      slug: cities.lubeck.slug,
      countryCode: cities.lubeck.countryCode,
      timezone: cities.lubeck.timezone,
      content: Object.fromEntries(
        locales.map((locale) => {
          const translations = getTranslations(locale);
          return [
            locale,
            {
              name: cities.lubeck.name,
              shortDescription: translations.home.featuredCityDescription,
              ...(cities.lubeck.legacyContent[
                locale as keyof typeof cities.lubeck.legacyContent
              ]
                ? {
                    description:
                      cities.lubeck.legacyContent[
                        locale as keyof typeof cities.lubeck.legacyContent
                      ].description,
                  }
                : {}),
            },
          ];
        }),
      ),
    },
  };
}

function assertCompleteSnapshot(snapshot: PublicCitySnapshot) {
  if (Object.keys(snapshot.city.content).length === 0) {
    throw new Error("Published city snapshot has no authored localization.");
  }
  if (snapshot.places.some((place) => Object.keys(place.content).length === 0)) {
    throw new Error("Published place snapshot is incomplete.");
  }
  if (snapshot.places.length === 0) {
    throw new Error("Published city has no traveler-visible places.");
  }
  const placeSlugs = new Set(snapshot.places.map(({ slug }) => slug));
  if (
    snapshot.tours.some(
      (tour) =>
        Object.keys(tour.content).length === 0 ||
        tour.stops.some(({ placeSlug }) => !placeSlugs.has(placeSlug)),
    )
  ) {
    throw new Error("Published tour snapshot is inconsistent.");
  }
}

function publicMediaForLocale(
  media: readonly PublicMedia[],
  requestedLocale: Locale,
): readonly PublicMedia[] {
  return media.flatMap((item) => {
    if (item.locale !== undefined && item.locale !== requestedLocale) return [];
    return [{
      assetKey: item.assetKey,
      kind: item.kind,
      purpose: item.purpose,
      url: item.url,
      mimeType: item.mimeType,
      ...(item.sizeBytes !== undefined ? { sizeBytes: item.sizeBytes } : {}),
      ...(item.width !== undefined ? { width: item.width } : {}),
      ...(item.height !== undefined ? { height: item.height } : {}),
      ...(item.kind === "image" && item.url.startsWith("/api/media/")
        ? { variants: item.variants ?? publicMediaImageVariants(item.assetKey) }
        : item.variants ? { variants: item.variants } : {}),
      ...(item.durationSeconds !== undefined
        ? { durationSeconds: item.durationSeconds }
        : {}),
      ...(item.locale ? { locale: item.locale } : {}),
      ...(item.attribution
        ? {
            attribution: {
              text: item.attribution.text,
              ...(item.attribution.creator
                ? { creator: item.attribution.creator }
                : {}),
            },
          }
        : {}),
      ...(item.externalVideo ? { externalVideo: item.externalVideo } : {}),
    } satisfies PublicMedia];
  });
}
