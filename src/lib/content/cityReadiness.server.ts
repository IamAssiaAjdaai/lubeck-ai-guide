import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  citiesTable,
  cityLaunchReadinessTable,
  cityLocalizationsTable,
  citySourcesTable,
  contentSourcesTable,
  placeRevisionsTable,
  placeSourcesTable,
  placesTable,
  tourStopsTable,
  toursTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import { isRequiredSourceValid } from "@/lib/admin/content/editorialWorkflow";
import {
  evaluateCityReadiness,
  type CityReadinessReport,
} from "@/lib/content/cityReadiness";
import { getPublicMediaSnapshot } from "@/lib/media/publicMedia.server";
import { isLocale } from "@/lib/i18n";

export async function getCityReadinessReport(
  citySlug: string,
): Promise<CityReadinessReport> {
  const db = getDb();
  const [city] = await db.select().from(citiesTable)
    .where(eq(citiesTable.slug, citySlug)).limit(1);
  if (!city) throw new Error(`Unknown city: ${citySlug}.`);
  const [profile] = await db.select().from(cityLaunchReadinessTable)
    .where(eq(cityLaunchReadinessTable.cityId, city.id)).limit(1);
  if (!profile) throw new Error(`City ${citySlug} has no launch-readiness profile.`);

  const [cityLocalizations, citySourceRows, placeRows, currentRevisions, sourceRows, tourRows, stopRows, knowledgeRows] =
    await Promise.all([
      db.select().from(cityLocalizationsTable)
        .where(eq(cityLocalizationsTable.cityId, city.id)),
      db.select({
        required: citySourcesTable.required,
        verifiedAt: contentSourcesTable.verifiedAt,
        validUntil: contentSourcesTable.validUntil,
      }).from(citySourcesTable)
        .innerJoin(contentSourcesTable, eq(citySourcesTable.sourceId, contentSourcesTable.id))
        .where(eq(citySourcesTable.cityId, city.id)),
      db.select().from(placesTable).where(eq(placesTable.cityId, city.id)),
      db.select().from(placeRevisionsTable).where(eq(placeRevisionsTable.isCurrent, true)),
      db.select({
        placeId: placeSourcesTable.placeId,
        sourceId: placeSourcesTable.sourceId,
        required: placeSourcesTable.required,
        verifiedAt: contentSourcesTable.verifiedAt,
        validUntil: contentSourcesTable.validUntil,
      }).from(placeSourcesTable)
        .innerJoin(contentSourcesTable, eq(placeSourcesTable.sourceId, contentSourcesTable.id))
        .innerJoin(placesTable, eq(placeSourcesTable.placeId, placesTable.id))
        .where(eq(placesTable.cityId, city.id)),
      db.select().from(toursTable).where(eq(toursTable.cityId, city.id)),
      db.select().from(tourStopsTable),
      db.select({
        placeId: verifiedKnowledgeChunksTable.placeId,
        sourceId: verifiedKnowledgeChunksTable.sourceId,
      }).from(verifiedKnowledgeChunksTable)
        .innerJoin(placesTable, eq(verifiedKnowledgeChunksTable.placeId, placesTable.id))
        .where(and(
          eq(placesTable.cityId, city.id),
          eq(verifiedKnowledgeChunksTable.isActive, true),
        )),
    ]);
  const revisionByPlaceId = new Map(
    currentRevisions.map((revision) => [revision.placeId, revision] as const),
  );
  const publishedPlaces = placeRows.filter((place) =>
    place.publicationStatus !== "archived" &&
    (place.publicationStatus === "published" || revisionByPlaceId.has(place.id)),
  );
  const publishedPlaceIds = publishedPlaces.map(({ id }) => id);
  const publishedTours = tourRows.filter(({ publicationStatus }) =>
    publicationStatus === "published",
  );
  const media = await getPublicMediaSnapshot(
    city.id,
    publishedPlaceIds,
    publishedTours.map(({ id }) => id),
  );
  const sourceCompletePlaceCount = publishedPlaces.filter(({ id }) => {
    const required = sourceRows.filter((sourceRow) =>
      sourceRow.placeId === id && sourceRow.required,
    );
    return required.length > 0 && required.every((row) => isRequiredSourceValid(row));
  }).length;
  const keyImageCompletePlaceCount = publishedPlaces.filter(({ id }) =>
    (media.places.get(id) ?? []).some(({ kind, purpose }) =>
      kind === "image" && (purpose === "hero" || purpose === "card"),
    ),
  ).length;
  const contentCompletePlaceCountByLocale = Object.fromEntries(
    profile.requiredContentLocales.map((locale) => [
      locale,
      publishedPlaces.filter(({ id }) => {
        const revision = revisionByPlaceId.get(id);
        return revision?.snapshot.localizations.some((localization) =>
          localization.locale === locale &&
          Boolean(localization.name.trim()) &&
          Boolean(localization.shortDescription.trim()),
        );
      }).length,
    ]),
  );
  const cityContentCompleteByLocale = Object.fromEntries(
    profile.requiredContentLocales.map((locale) => [
      locale,
      cityLocalizations.some((localization) =>
        localization.locale === locale &&
        Boolean(localization.name.trim()) &&
        Boolean(localization.shortDescription?.trim()) &&
        Boolean(localization.description?.trim()),
      ),
    ]),
  );
  const requiredCitySources = citySourceRows.filter(({ required }) => required);
  const audioReadyPlaceCountByLocale = Object.fromEntries(
    profile.requiredAudioLocales.map((locale) => [
      locale,
      publishedPlaces.filter(({ id }) =>
        (media.places.get(id) ?? []).some((item) =>
          item.kind === "audio" &&
          item.purpose === "audio" &&
          item.locale === locale,
        ),
      ).length,
    ]),
  );
  const publishedPlaceIdSet = new Set(publishedPlaceIds);
  const coherentPublishedTourCount = publishedTours.filter((tour) => {
    const stops = stopRows.filter(({ tourId }) => tourId === tour.id);
    return stops.length >= 2 && stops.every(({ placeId }) => publishedPlaceIdSet.has(placeId));
  }).length;
  const requiredSourcePairs = new Set(
    sourceRows.filter((sourceRow) =>
      sourceRow.required && isRequiredSourceValid(sourceRow),
    )
      .map(({ placeId, sourceId }) => `${placeId}:${sourceId}`),
  );
  const verifiedAiEligiblePlaceCount = new Set(
    knowledgeRows
      .filter(({ placeId, sourceId }) =>
        publishedPlaceIdSet.has(placeId) &&
        requiredSourcePairs.has(`${placeId}:${sourceId}`),
      )
      .map(({ placeId }) => placeId),
  ).size;

  return evaluateCityReadiness({
    citySlug,
    cityPublished: city.publicationStatus === "published",
    citySourceProvenanceReady:
      requiredCitySources.length > 0 &&
      requiredCitySources.every((source) => isRequiredSourceValid(source)),
    cityContentCompleteByLocale,
    targetPlaceCount: profile.targetPlaceCount,
    publishedPlaceCount: publishedPlaces.length,
    sourceCompletePlaceCount,
    keyImageCompletePlaceCount,
    cityKeyImageReady: media.city.some(({ kind, purpose }) =>
      kind === "image" && (purpose === "hero" || purpose === "card"),
    ),
    publishedTourCount: publishedTours.length,
    coherentPublishedTourCount,
    minimumVerifiedAiPlaceCount: profile.minimumVerifiedAiPlaceCount,
    verifiedAiEligiblePlaceCount,
    requiredContentLocales: profile.requiredContentLocales.filter(isLocale),
    reviewedContentLocales: profile.reviewedContentLocales.filter(isLocale),
    contentCompletePlaceCountByLocale,
    requiredAudioLocales: profile.requiredAudioLocales.filter(isLocale),
    audioTargetPlaceCount: profile.audioTargetPlaceCount,
    audioReadyPlaceCountByLocale,
    premiumContentStatus: profile.premiumContentStatus,
    webQaStatus: profile.webQaStatus,
    nativeQaStatus: profile.nativeQaStatus,
    travelerQaStatus: profile.travelerQaStatus,
  });
}

export async function getCityReadinessMatrix(
  citySlugs?: readonly string[],
): Promise<readonly CityReadinessReport[]> {
  const db = getDb();
  const configuredCities = await db
    .select({ slug: citiesTable.slug })
    .from(cityLaunchReadinessTable)
    .innerJoin(citiesTable, eq(cityLaunchReadinessTable.cityId, citiesTable.id))
    .orderBy(asc(citiesTable.slug));
  const requested = citySlugs ? new Set(citySlugs) : undefined;
  return Promise.all(
    configuredCities
      .filter(({ slug }) => !requested || requested.has(slug))
      .map(({ slug }) => getCityReadinessReport(slug)),
  );
}
