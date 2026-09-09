import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  citiesTable,
  cityLaunchReadinessTable,
  cityLocalizationsTable,
  citySourcesTable,
  contentSourcesTable,
  contentTagsTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placeRevisionsTable,
  placeSourcesTable,
  placesTable,
  tourLocalizationsTable,
  toursTable,
  tourStopsTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import {
  validateCityManifest,
  type CityManifest,
} from "@/lib/admin/content/cityManifest";
import { normalizeCanonicalSourceUrl } from "@/lib/admin/content/editorialWorkflow";
import {
  canBootstrapCanonicalRecord,
  canRefreshCanonicalLocalization,
} from "@/lib/admin/content/importPolicy";

export type CityManifestImportResult = Readonly<{
  citySlug: string;
  cityId: number;
  citySourceCount: number;
  placeCount: number;
  placeLocalizationCount: number;
  sourceLinkCount: number;
  currentRevisionCount: number;
  tourCount: number;
  tourStopCount: number;
  verifiedKnowledgeCount: number;
}>;

type CityManifestImportMode = "external-draft" | "trusted-bootstrap";

export function importCityManifest(
  uncheckedManifest: CityManifest,
): Promise<CityManifestImportResult> {
  return importValidatedCityManifest(uncheckedManifest, "external-draft");
}

export function importTrustedCityBootstrapManifest(
  uncheckedManifest: CityManifest,
): Promise<CityManifestImportResult> {
  return importValidatedCityManifest(uncheckedManifest, "trusted-bootstrap");
}

async function importValidatedCityManifest(
  uncheckedManifest: CityManifest,
  mode: CityManifestImportMode,
): Promise<CityManifestImportResult> {
  const manifest = validateCityManifest(uncheckedManifest);
  const isTrustedBootstrap = mode === "trusted-bootstrap";
  const cityPublicationStatus = isTrustedBootstrap
    ? manifest.city.publicationStatus
    : "draft";
  const db = getDb();

  return db.transaction(async (tx) => {
    const now = new Date();
    const [createdCity] = await tx
      .insert(citiesTable)
      .values({
        slug: manifest.city.slug,
        name: manifest.city.name,
        countryCode: manifest.city.countryCode,
        timezone: manifest.city.timezone,
        publicationStatus: cityPublicationStatus,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: citiesTable.slug })
      .returning();
    const city = createdCity ?? (await tx
      .select()
      .from(citiesTable)
      .where(eq(citiesTable.slug, manifest.city.slug))
      .limit(1))[0];
    if (!city) throw new Error(`Unable to import city ${manifest.city.slug}.`);

    const existingCityLocalizations = await tx
      .select()
      .from(cityLocalizationsTable)
      .where(eq(cityLocalizationsTable.cityId, city.id));
    const mayImportCity = canBootstrapCanonicalRecord({
      created: Boolean(createdCity),
      existingLocalizationCount: existingCityLocalizations.length,
      updatedByUserId: city.updatedByUserId,
    });
    const mayRefreshCanonicalCity = mayImportCity || !city.updatedByUserId;
    if (mayRefreshCanonicalCity && !createdCity) {
      await tx.update(citiesTable).set({
        name: manifest.city.name,
        countryCode: manifest.city.countryCode,
        timezone: manifest.city.timezone,
        publicationStatus: cityPublicationStatus,
        updatedAt: now,
      }).where(eq(citiesTable.id, city.id));
    }
    if (mayRefreshCanonicalCity) {
      for (const [locale, content] of Object.entries(manifest.city.content)) {
        if (!content) continue;
        const existing = existingCityLocalizations.find(
          (localization) => localization.locale === locale,
        );
        if (!existing) {
          await tx.insert(cityLocalizationsTable).values({
            cityId: city.id,
            locale,
            name: content.name,
            shortDescription: content.shortDescription,
            description: content.description,
          });
        } else if (canRefreshCanonicalLocalization({
          recordUpdatedByUserId: city.updatedByUserId,
          localizationUpdatedByUserId: existing.updatedByUserId,
        })) {
          await tx.update(cityLocalizationsTable).set({
            name: content.name,
            shortDescription: content.shortDescription,
            description: content.description,
            updatedAt: now,
          }).where(eq(cityLocalizationsTable.id, existing.id));
        }
      }
    }

    if (mayRefreshCanonicalCity) {
      for (const source of manifest.city.sources) {
        const canonicalUrl = normalizeCanonicalSourceUrl(source.canonicalUrl);
        const [createdSource] = await tx.insert(contentSourcesTable).values({
          publisher: source.publisher,
          title: source.title,
          canonicalUrl,
          verifiedAt: source.verifiedAt,
          notes: source.notes,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoNothing({
          target: contentSourcesTable.canonicalUrl,
        }).returning();
        const sourceRecord = createdSource ?? (await tx
          .select({ id: contentSourcesTable.id })
          .from(contentSourcesTable)
          .where(eq(contentSourcesTable.canonicalUrl, canonicalUrl))
          .limit(1))[0];
        if (!sourceRecord) throw new Error(`Unable to import source ${canonicalUrl}.`);
        await tx.insert(citySourcesTable).values({
          cityId: city.id,
          sourceId: sourceRecord.id,
          required: true,
          createdAt: now,
        }).onConflictDoNothing();
      }
    }

    await tx.insert(cityLaunchReadinessTable).values({
      cityId: city.id,
      targetPlaceCount: manifest.readiness.targetPlaceCount,
      requiredContentLocales: [...manifest.readiness.requiredContentLocales],
      reviewedContentLocales: isTrustedBootstrap
        ? [...manifest.readiness.reviewedContentLocales]
        : [],
      requiredAudioLocales: [...manifest.readiness.requiredAudioLocales],
      audioTargetPlaceCount: manifest.readiness.audioTargetPlaceCount,
      minimumVerifiedAiPlaceCount: manifest.readiness.minimumVerifiedAiPlaceCount,
      webQaStatus: isTrustedBootstrap ? manifest.readiness.webQaStatus : "pending",
      nativeQaStatus: isTrustedBootstrap ? manifest.readiness.nativeQaStatus : "pending",
      travelerQaStatus: isTrustedBootstrap
        ? manifest.readiness.travelerQaStatus
        : "pending",
      premiumContentStatus: isTrustedBootstrap
        ? manifest.readiness.premiumContentStatus
        : manifest.readiness.premiumContentStatus === "not_required"
          ? "not_required"
          : "pending",
      notes: manifest.readiness.notes,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing({ target: cityLaunchReadinessTable.cityId });

    const importedPlaceIds = new Map<string, number>();
    for (const placeManifest of manifest.places) {
      const placePublicationStatus = isTrustedBootstrap
        ? placeManifest.publicationStatus
        : "draft";
      const [createdPlace] = await tx.insert(placesTable).values({
        cityId: city.id,
        slug: placeManifest.slug,
        category: placeManifest.category,
        latitude: placeManifest.coordinates.lat,
        longitude: placeManifest.coordinates.lng,
        durationMinutes: placeManifest.durationMinutes,
        environment: placeManifest.environment,
        pricing: placeManifest.pricing,
        status: placeManifest.status,
        statusVerifiedAt: placeManifest.statusVerifiedAt,
        tags: [...placeManifest.tags],
        publicationStatus: placePublicationStatus,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing({
        target: [placesTable.cityId, placesTable.slug],
      }).returning();
      const place = createdPlace ?? (await tx
        .select()
        .from(placesTable)
        .where(and(
          eq(placesTable.cityId, city.id),
          eq(placesTable.slug, placeManifest.slug),
        ))
        .limit(1))[0];
      if (!place) throw new Error(`Unable to import place ${placeManifest.slug}.`);
      importedPlaceIds.set(placeManifest.slug, place.id);

      const localizationCount = (await tx
        .select({ id: placeLocalizationsTable.id })
        .from(placeLocalizationsTable)
        .where(eq(placeLocalizationsTable.placeId, place.id))).length;
      const mayImportPlace = canBootstrapCanonicalRecord({
        created: Boolean(createdPlace),
        existingLocalizationCount: localizationCount,
        updatedByUserId: place.updatedByUserId,
      });
      if (!mayImportPlace) continue;

      if (!createdPlace) {
        await tx.update(placesTable).set({
          category: placeManifest.category,
          latitude: placeManifest.coordinates.lat,
          longitude: placeManifest.coordinates.lng,
          durationMinutes: placeManifest.durationMinutes,
          environment: placeManifest.environment,
          pricing: placeManifest.pricing,
          status: placeManifest.status,
          statusVerifiedAt: placeManifest.statusVerifiedAt,
          tags: [...placeManifest.tags],
          publicationStatus: placePublicationStatus,
          updatedAt: now,
        }).where(eq(placesTable.id, place.id));
      }

      for (const [locale, content] of Object.entries(placeManifest.content)) {
        if (!content) continue;
        await tx.insert(placeLocalizationsTable).values({
          placeId: place.id,
          locale,
          name: content.name,
          shortDescription: content.shortDescription,
          description: content.description,
          story: content.story,
          visitNotes: content.visitNotes,
          facts: content.facts ? [...content.facts] : [],
        }).onConflictDoNothing({
          target: [placeLocalizationsTable.placeId, placeLocalizationsTable.locale],
        });
      }

      for (const tagSlug of placeManifest.tags) {
        await tx.insert(contentTagsTable).values({
          slug: tagSlug,
          label: formatTagLabel(tagSlug),
        }).onConflictDoNothing({ target: contentTagsTable.slug });
      }
      if (placeManifest.tags.length > 0) {
        const tags = await tx.select({ id: contentTagsTable.id })
          .from(contentTagsTable)
          .where(inArray(contentTagsTable.slug, [...placeManifest.tags]));
        for (const tag of tags) {
          await tx.insert(placeContentTagsTable).values({
            placeId: place.id,
            tagId: tag.id,
          }).onConflictDoNothing();
        }
      }

      const sourceIdByUrl = new Map<string, number>();
      for (const source of placeManifest.sources) {
        const canonicalUrl = normalizeCanonicalSourceUrl(source.canonicalUrl);
        const [createdSource] = await tx.insert(contentSourcesTable).values({
          publisher: source.publisher,
          title: source.title,
          canonicalUrl,
          verifiedAt: source.verifiedAt,
          notes: source.notes,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoNothing({ target: contentSourcesTable.canonicalUrl }).returning();
        const sourceRecord = createdSource ?? (await tx
          .select({ id: contentSourcesTable.id })
          .from(contentSourcesTable)
          .where(eq(contentSourcesTable.canonicalUrl, canonicalUrl))
          .limit(1))[0];
        if (!sourceRecord) throw new Error(`Unable to import source ${canonicalUrl}.`);
        sourceIdByUrl.set(source.canonicalUrl, sourceRecord.id);
        await tx.insert(placeSourcesTable).values({
          placeId: place.id,
          sourceId: sourceRecord.id,
          required: true,
          createdAt: now,
        }).onConflictDoNothing();
      }

      const [currentRevision] = await tx.select({ id: placeRevisionsTable.id })
        .from(placeRevisionsTable)
        .where(and(
          eq(placeRevisionsTable.placeId, place.id),
          eq(placeRevisionsTable.isCurrent, true),
        ))
        .limit(1);
      if (
        isTrustedBootstrap &&
        !currentRevision &&
        placePublicationStatus === "published"
      ) {
        await tx.insert(placeRevisionsTable).values({
          placeId: place.id,
          revisionNumber: 1,
          isCurrent: true,
          snapshot: {
            category: placeManifest.category,
            latitude: placeManifest.coordinates.lat,
            longitude: placeManifest.coordinates.lng,
            durationMinutes: placeManifest.durationMinutes,
            environment: placeManifest.environment,
            pricing: placeManifest.pricing,
            ...(placeManifest.status ? { status: placeManifest.status } : {}),
            ...(placeManifest.statusVerifiedAt
              ? { statusVerifiedAt: placeManifest.statusVerifiedAt }
              : {}),
            tagSlugs: [...placeManifest.tags],
            localizations: Object.entries(placeManifest.content).flatMap(
              ([locale, content]) => content ? [{
                locale: locale as keyof typeof placeManifest.content,
                name: content.name,
                shortDescription: content.shortDescription,
                ...(content.description ? { description: content.description } : {}),
                ...(content.story ? { story: content.story } : {}),
                ...(content.visitNotes ? { visitNotes: content.visitNotes } : {}),
                facts: content.facts ? [...content.facts] : [],
              }] : [],
            ),
          },
          publishedAt: now,
        });
      }

      for (const chunk of manifest.knowledge.filter(
        ({ placeSlug }) => placeSlug === placeManifest.slug,
      )) {
        const sourceId = sourceIdByUrl.get(chunk.sourceUrl);
        if (!sourceId) throw new Error(`Knowledge source unavailable for ${chunk.placeSlug}.`);
        const [existingChunk] = await tx.select({ id: verifiedKnowledgeChunksTable.id })
          .from(verifiedKnowledgeChunksTable)
          .where(and(
            eq(verifiedKnowledgeChunksTable.placeId, place.id),
            eq(verifiedKnowledgeChunksTable.sourceId, sourceId),
            eq(verifiedKnowledgeChunksTable.locale, chunk.locale),
            eq(verifiedKnowledgeChunksTable.text, chunk.text),
          ))
          .limit(1);
        if (!existingChunk) {
          await tx.insert(verifiedKnowledgeChunksTable).values({
            placeId: place.id,
            sourceId,
            locale: chunk.locale,
            text: chunk.text,
            topics: [...chunk.topics],
            priority: chunk.priority ?? 0,
            isActive: isTrustedBootstrap,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    for (const tourManifest of manifest.tours) {
      const tourPublicationStatus = isTrustedBootstrap
        ? tourManifest.publicationStatus
        : "draft";
      const [createdTour] = await tx.insert(toursTable).values({
        cityId: city.id,
        slug: tourManifest.slug,
        publicationStatus: tourPublicationStatus,
        estimatedDurationMinutes: tourManifest.estimatedDurationMinutes,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing({ target: [toursTable.cityId, toursTable.slug] }).returning();
      const tour = createdTour ?? (await tx.select().from(toursTable).where(and(
        eq(toursTable.cityId, city.id),
        eq(toursTable.slug, tourManifest.slug),
      )).limit(1))[0];
      if (!tour) throw new Error(`Unable to import tour ${tourManifest.slug}.`);
      const localizationCount = (await tx.select({ id: tourLocalizationsTable.id })
        .from(tourLocalizationsTable)
        .where(eq(tourLocalizationsTable.tourId, tour.id))).length;
      const mayImportTour = canBootstrapCanonicalRecord({
        created: Boolean(createdTour),
        existingLocalizationCount: localizationCount,
        updatedByUserId: tour.updatedByUserId,
      });
      if (!mayImportTour) continue;
      if (!createdTour) {
        await tx.update(toursTable).set({
          publicationStatus: tourPublicationStatus,
          estimatedDurationMinutes: tourManifest.estimatedDurationMinutes,
          updatedAt: now,
        }).where(eq(toursTable.id, tour.id));
      }
      for (const [locale, content] of Object.entries(tourManifest.content)) {
        if (!content) continue;
        await tx.insert(tourLocalizationsTable).values({
          tourId: tour.id,
          locale,
          title: content.title,
          shortDescription: content.shortDescription,
          description: content.description,
        }).onConflictDoNothing({
          target: [tourLocalizationsTable.tourId, tourLocalizationsTable.locale],
        });
      }
      for (const [index, stop] of tourManifest.stops.entries()) {
        const placeId = importedPlaceIds.get(stop.placeSlug);
        if (!placeId) throw new Error(`Unable to resolve tour stop ${stop.placeSlug}.`);
        await tx.insert(tourStopsTable).values({
          tourId: tour.id,
          placeId,
          position: index + 1,
          visitDurationMinutes: stop.visitDurationMinutes,
        }).onConflictDoNothing();
      }
    }

    return getImportResult(tx, city.id, manifest.city.slug);
  });
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function getImportResult(
  tx: Transaction,
  cityId: number,
  citySlug: string,
): Promise<CityManifestImportResult> {
  const places = await tx.select({ id: placesTable.id }).from(placesTable)
    .where(eq(placesTable.cityId, cityId));
  const placeIds = places.map(({ id }) => id);
  const tours = await tx.select({ id: toursTable.id }).from(toursTable)
    .where(eq(toursTable.cityId, cityId));
  const tourIds = tours.map(({ id }) => id);
  const citySources = await tx.select({ sourceId: citySourcesTable.sourceId })
    .from(citySourcesTable)
    .where(eq(citySourcesTable.cityId, cityId));
  const localizations = placeIds.length
    ? await tx.select({ id: placeLocalizationsTable.id }).from(placeLocalizationsTable)
      .where(inArray(placeLocalizationsTable.placeId, placeIds))
    : [];
  const sourceLinks = placeIds.length
    ? await tx.select({ placeId: placeSourcesTable.placeId }).from(placeSourcesTable)
      .where(inArray(placeSourcesTable.placeId, placeIds))
    : [];
  const revisions = placeIds.length
    ? await tx.select({ id: placeRevisionsTable.id }).from(placeRevisionsTable)
      .where(and(
        inArray(placeRevisionsTable.placeId, placeIds),
        eq(placeRevisionsTable.isCurrent, true),
      ))
    : [];
  const stops = tourIds.length
    ? await tx.select({ tourId: tourStopsTable.tourId }).from(tourStopsTable)
      .where(inArray(tourStopsTable.tourId, tourIds))
    : [];
  const knowledge = placeIds.length
    ? await tx.select({ id: verifiedKnowledgeChunksTable.id })
      .from(verifiedKnowledgeChunksTable)
      .where(inArray(verifiedKnowledgeChunksTable.placeId, placeIds))
    : [];
  return {
    citySlug,
    cityId,
    citySourceCount: citySources.length,
    placeCount: places.length,
    placeLocalizationCount: localizations.length,
    sourceLinkCount: sourceLinks.length,
    currentRevisionCount: revisions.length,
    tourCount: tours.length,
    tourStopCount: stops.length,
    verifiedKnowledgeCount: knowledge.length,
  };
}

function formatTagLabel(slug: string): string {
  return slug.split("-").map((part) =>
    `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`,
  ).join(" ");
}
