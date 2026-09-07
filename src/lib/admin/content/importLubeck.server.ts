import { and, asc, eq, inArray } from "drizzle-orm";

import { cities } from "@/data/cities";
import { lubeckLandmarks, lubeckPlaces } from "@/data/places";
import { getPlaceSources } from "@/data/placeSources";
import { getDb } from "@/db/client";
import {
  citiesTable,
  cityLocalizationsTable,
  contentTagsTable,
  contentSourcesTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placeRevisionsTable,
  placeSourcesTable,
  placesTable,
  tourLocalizationsTable,
  toursTable,
  tourStopsTable,
} from "@/db/schema";
import { getTranslations, locales } from "@/lib/i18n";
import { canBootstrapCanonicalRecord } from "@/lib/admin/content/importPolicy";
import { normalizeCanonicalSourceUrl } from "@/lib/admin/content/editorialWorkflow";

export const LUBECK_EDITORIAL_TOUR_SLUG = "historic-center-walk";

export async function importCanonicalLubeckContent() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [createdCity] = await tx
      .insert(citiesTable)
      .values({
        slug: cities.lubeck.slug,
        name: cities.lubeck.name,
        publicationStatus: "published",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: citiesTable.slug })
      .returning();
    const city =
      createdCity ??
      (
        await tx
          .select()
          .from(citiesTable)
          .where(eq(citiesTable.slug, cities.lubeck.slug))
          .limit(1)
      )[0];
    if (!city) throw new Error("Canonical Lubeck city import failed.");

    const existingCityLocalizations = await tx
      .select({ id: cityLocalizationsTable.id })
      .from(cityLocalizationsTable)
      .where(eq(cityLocalizationsTable.cityId, city.id));
    const mayImportCity = canBootstrapCanonicalRecord({
      created: Boolean(createdCity),
      existingLocalizationCount: existingCityLocalizations.length,
      updatedByUserId: city.updatedByUserId,
    });
    if (mayImportCity && !createdCity) {
      await tx
        .update(citiesTable)
        .set({
          name: cities.lubeck.name,
          publicationStatus: "published",
          updatedAt: now,
        })
        .where(eq(citiesTable.id, city.id));
    }
    if (mayImportCity) {
      await tx
        .insert(cityLocalizationsTable)
        .values([
          { cityId: city.id, locale: "de", name: "Lübeck" },
          { cityId: city.id, locale: "en", name: "Lübeck" },
        ])
        .onConflictDoNothing();
    }

    for (const source of lubeckPlaces) {
      const [createdPlace] = await tx
        .insert(placesTable)
        .values({
          cityId: city.id,
          slug: source.slug,
          category: source.category,
          latitude: source.coordinates.lat,
          longitude: source.coordinates.lng,
          durationMinutes: source.durationMinutes,
          environment: source.environment,
          pricing: source.pricing,
          status: source.status,
          statusVerifiedAt: source.statusVerifiedAt,
          visitNoteVerifiedAt: source.visitNoteVerifiedAt,
          visitNoteValidUntil: source.visitNoteValidUntil,
          image: source.image,
          tags: [...source.tags],
          publicationStatus: "published",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [placesTable.cityId, placesTable.slug],
        })
        .returning();
      const place =
        createdPlace ??
        (
          await tx
            .select()
            .from(placesTable)
            .where(
              eq(placesTable.cityId, city.id),
            )
            .orderBy(asc(placesTable.id))
        ).find(({ slug }) => slug === source.slug);
      if (!place) throw new Error(`Failed to import place ${source.slug}.`);
      const existingLocalizations = await tx
        .select({ id: placeLocalizationsTable.id })
        .from(placeLocalizationsTable)
        .where(eq(placeLocalizationsTable.placeId, place.id));
      const mayImportPlace = canBootstrapCanonicalRecord({
        created: Boolean(createdPlace),
        existingLocalizationCount: existingLocalizations.length,
        updatedByUserId: place.updatedByUserId,
      });
      if (mayImportPlace && !createdPlace) {
        await tx
          .update(placesTable)
          .set({
            category: source.category,
            latitude: source.coordinates.lat,
            longitude: source.coordinates.lng,
            durationMinutes: source.durationMinutes,
            environment: source.environment,
            pricing: source.pricing,
            status: source.status,
            statusVerifiedAt: source.statusVerifiedAt,
            visitNoteVerifiedAt: source.visitNoteVerifiedAt,
            visitNoteValidUntil: source.visitNoteValidUntil,
            image: source.image,
            tags: [...source.tags],
            publicationStatus: "published",
            updatedAt: now,
          })
          .where(eq(placesTable.id, place.id));
      }
      for (const canonicalSource of getPlaceSources(source.slug)) {
        const canonicalUrl = normalizeCanonicalSourceUrl(canonicalSource.url);
        const [createdSource] = await tx
          .insert(contentSourcesTable)
          .values({
            publisher: new URL(canonicalUrl).hostname,
            title: canonicalSource.label,
            canonicalUrl,
            verifiedAt: canonicalSource.verifiedAt,
            notes: `Canonical CITYWALK ${canonicalSource.type} provenance.`,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: contentSourcesTable.canonicalUrl })
          .returning();
        const canonicalRecord = createdSource ?? (await tx
          .select({ id: contentSourcesTable.id })
          .from(contentSourcesTable)
          .where(eq(contentSourcesTable.canonicalUrl, canonicalUrl))
          .limit(1))[0];
        if (!canonicalRecord) throw new Error(`Failed to import source ${canonicalUrl}.`);
        await tx
          .insert(placeSourcesTable)
          .values({ placeId: place.id, sourceId: canonicalRecord.id, required: true, createdAt: now })
          .onConflictDoNothing();
      }
      if (!mayImportPlace) continue;

      for (const locale of locales) {
        const content = source.content[locale];
        if (!content) continue;
        await tx
          .insert(placeLocalizationsTable)
          .values({
            placeId: place.id,
            locale,
            name: content.name,
            shortDescription: content.shortDescription,
            description: content.description,
            story: content.story,
            visitNotes: content.visitNote,
            facts: content.facts ? [...content.facts] : [],
          })
          .onConflictDoNothing({
            target: [
              placeLocalizationsTable.placeId,
              placeLocalizationsTable.locale,
            ],
          });
      }

      for (const slug of source.tags) {
        await tx
          .insert(contentTagsTable)
          .values({ slug, label: formatTagLabel(slug) })
          .onConflictDoNothing({ target: contentTagsTable.slug });
      }
      if (source.tags.length > 0) {
        const tags = await tx
          .select({ id: contentTagsTable.id })
          .from(contentTagsTable)
          .where(inArray(contentTagsTable.slug, [...source.tags]));
        for (const tag of tags) {
          await tx
            .insert(placeContentTagsTable)
            .values({ placeId: place.id, tagId: tag.id })
            .onConflictDoNothing();
        }
      }
      const [currentRevision] = await tx
        .select({ id: placeRevisionsTable.id })
        .from(placeRevisionsTable)
        .where(
          and(
            eq(placeRevisionsTable.placeId, place.id),
            eq(placeRevisionsTable.isCurrent, true),
          ),
        )
        .limit(1);
      if (!currentRevision && place.publicationStatus === "published") {
        await tx.insert(placeRevisionsTable).values({
          placeId: place.id,
          revisionNumber: 1,
          isCurrent: true,
          snapshot: {
            category: source.category,
            latitude: source.coordinates.lat,
            longitude: source.coordinates.lng,
            durationMinutes: source.durationMinutes,
            environment: source.environment,
            pricing: source.pricing,
            ...(source.status ? { status: source.status } : {}),
            ...(source.statusVerifiedAt ? { statusVerifiedAt: source.statusVerifiedAt } : {}),
            ...(source.visitNoteVerifiedAt ? { visitNoteVerifiedAt: source.visitNoteVerifiedAt } : {}),
            ...(source.visitNoteValidUntil ? { visitNoteValidUntil: source.visitNoteValidUntil } : {}),
            ...(source.image ? { image: source.image } : {}),
            tagSlugs: [...source.tags],
            localizations: locales.flatMap((locale) => {
              const content = source.content[locale];
              return content ? [{
                locale,
                name: content.name,
                shortDescription: content.shortDescription,
                ...(content.description ? { description: content.description } : {}),
                ...(content.story ? { story: content.story } : {}),
                ...(content.visitNote ? { visitNotes: content.visitNote } : {}),
                facts: content.facts ? [...content.facts] : [],
              }] : [];
            }),
          },
          publishedAt: now,
        });
      }
    }

    const [createdTour] = await tx
      .insert(toursTable)
      .values({
        cityId: city.id,
        slug: LUBECK_EDITORIAL_TOUR_SLUG,
        publicationStatus: "published",
        estimatedDurationMinutes: cities.lubeck.estimatedMinutes,
      })
      .onConflictDoNothing({
        target: [toursTable.cityId, toursTable.slug],
      })
      .returning();
    const tour =
      createdTour ??
      (
        await tx
          .select()
          .from(toursTable)
          .where(eq(toursTable.cityId, city.id))
      ).find(({ slug }) => slug === LUBECK_EDITORIAL_TOUR_SLUG);
    if (!tour) throw new Error("Canonical Lubeck tour import failed.");
    const existingTourLocalizations = await tx
      .select({ id: tourLocalizationsTable.id })
      .from(tourLocalizationsTable)
      .where(eq(tourLocalizationsTable.tourId, tour.id));
    const mayImportTour = canBootstrapCanonicalRecord({
      created: Boolean(createdTour),
      existingLocalizationCount: existingTourLocalizations.length,
      updatedByUserId: tour.updatedByUserId,
    });
    if (mayImportTour) {
      for (const locale of locales) {
        const translations = getTranslations(locale);
        await tx
          .insert(tourLocalizationsTable)
          .values({
            tourId: tour.id,
            locale,
            title: translations.explore.historicCenter,
            shortDescription: translations.explore.walkingTour,
          })
          .onConflictDoNothing({
            target: [
              tourLocalizationsTable.tourId,
              tourLocalizationsTable.locale,
            ],
          });
      }
      const stopPlaces = await tx
        .select({ id: placesTable.id, slug: placesTable.slug })
        .from(placesTable)
        .where(
          and(
            eq(placesTable.cityId, city.id),
            inArray(
              placesTable.slug,
              lubeckLandmarks.map(({ slug }) => slug),
            ),
          ),
        );
      const placeIdBySlug = new Map(
        stopPlaces.map(({ id, slug }) => [slug, id] as const),
      );
      for (const [index, landmark] of lubeckLandmarks.entries()) {
        const placeId = placeIdBySlug.get(landmark.slug);
        if (!placeId) throw new Error(`Missing tour stop ${landmark.slug}.`);
        await tx
          .insert(tourStopsTable)
          .values({
            tourId: tour.id,
            placeId,
            position: index + 1,
            visitDurationMinutes: landmark.durationMinutes,
          })
          .onConflictDoNothing();
      }
    }

    return getLubeckCmsImportCounts(tx, city.id);
  });
}

async function getLubeckCmsImportCounts(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  cityId: number,
) {
  const places = await tx
    .select()
    .from(placesTable)
    .where(eq(placesTable.cityId, cityId));
  const localizations = await tx
    .select({ placeId: placeLocalizationsTable.placeId })
    .from(placeLocalizationsTable)
    .innerJoin(
      placesTable,
      eq(placeLocalizationsTable.placeId, placesTable.id),
    )
    .where(eq(placesTable.cityId, cityId));
  const tags = await tx.select().from(contentTagsTable);
  const hiddenGemRelations = await tx
    .select({
      placeId: placeContentTagsTable.placeId,
      category: placesTable.category,
    })
    .from(placeContentTagsTable)
    .innerJoin(
      contentTagsTable,
      eq(placeContentTagsTable.tagId, contentTagsTable.id),
    )
    .innerJoin(placesTable, eq(placeContentTagsTable.placeId, placesTable.id))
    .where(
      and(
        eq(contentTagsTable.slug, "hidden-gem"),
        eq(placesTable.cityId, cityId),
        eq(placesTable.category, "see"),
      ),
    );
  const tours = await tx
    .select()
    .from(toursTable)
    .where(eq(toursTable.cityId, cityId));
  const stops = await tx
    .select({ tourId: tourStopsTable.tourId })
    .from(tourStopsTable)
    .innerJoin(toursTable, eq(tourStopsTable.tourId, toursTable.id))
    .where(eq(toursTable.cityId, cityId));
  return {
    cityCount: 1,
    placeCount: places.length,
    placeLocalizationCount: localizations.length,
    tagCount: tags.length,
    hiddenGemCount: new Set(hiddenGemRelations.map(({ placeId }) => placeId)).size,
    tourCount: tours.length,
    tourStopCount: stops.length,
    categories: {
      see: places.filter(({ category }) => category === "see").length,
      eat: places.filter(({ category }) => category === "eat").length,
      fun: places.filter(({ category }) => category === "fun").length,
    },
  } as const;
}

function formatTagLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
