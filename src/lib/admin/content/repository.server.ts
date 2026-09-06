import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  citiesTable,
  cityLocalizationsTable,
  contentTagsTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placesTable,
  tourLocalizationsTable,
  toursTable,
  tourStopsTable,
} from "@/db/schema";
import type {
  CityInput,
  PlaceInput,
  PublicationStatus,
  TourInput,
} from "@/lib/admin/content/validation";
import {
  CROSS_CITY_PLACE_MOVE_ERROR,
  PUBLISHED_TOUR_PLACE_ARCHIVE_ERROR,
  getPublishedTourGraphError,
  hasCrossCityTourReference,
} from "@/lib/admin/content/graphIntegrity";
import { assertEntityMovePreservesMediaCity } from "@/lib/media/repository.server";

export class CmsContentNotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} was not found.`);
    this.name = "CmsContentNotFoundError";
  }
}

export class CmsContentConflictError extends Error {
  constructor() {
    super("This record changed after you opened it. Reload before saving.");
    this.name = "CmsContentConflictError";
  }
}

export class CmsContentIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsContentIntegrityError";
  }
}

export async function listCmsCities() {
  const db = getDb();
  const [cities, localizations, places, tours] = await Promise.all([
    db.select().from(citiesTable).orderBy(asc(citiesTable.slug)),
    db.select().from(cityLocalizationsTable),
    db.select({ cityId: placesTable.cityId }).from(placesTable),
    db.select({ cityId: toursTable.cityId }).from(toursTable),
  ]);
  return cities.map((city) => ({
    ...city,
    localizations: localizations.filter(({ cityId }) => cityId === city.id),
    placeCount: places.filter(({ cityId }) => cityId === city.id).length,
    tourCount: tours.filter(({ cityId }) => cityId === city.id).length,
  }));
}

export async function getCmsCity(id: number) {
  const db = getDb();
  const [city] = await db
    .select()
    .from(citiesTable)
    .where(eq(citiesTable.id, id))
    .limit(1);
  if (!city) return undefined;
  const localizations = await db
    .select()
    .from(cityLocalizationsTable)
    .where(eq(cityLocalizationsTable.cityId, id))
    .orderBy(asc(cityLocalizationsTable.locale));
  return { ...city, localizations };
}

export async function createCmsCity(input: CityInput, actorId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [city] = await tx
      .insert(citiesTable)
      .values({
        slug: input.slug,
        name: input.localizations[0]?.name ?? input.slug,
        publicationStatus: input.publicationStatus,
        createdByUserId: actorId,
        updatedByUserId: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!city) throw new CmsContentIntegrityError("City creation failed.");
    if (input.localizations.length > 0) {
      await tx.insert(cityLocalizationsTable).values(
        input.localizations.map((localization) => ({
          cityId: city.id,
          ...localization,
          createdByUserId: actorId,
          updatedByUserId: actorId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    return city;
  });
}

export async function updateCmsCity(
  id: number,
  input: CityInput,
  actorId: string,
  expectedUpdatedAt: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [city] = await tx
      .update(citiesTable)
      .set({
        slug: input.slug,
        name: input.localizations[0]?.name ?? input.slug,
        publicationStatus: input.publicationStatus,
        updatedByUserId: actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(citiesTable.id, id),
          eq(citiesTable.updatedAt, new Date(expectedUpdatedAt)),
        ),
      )
      .returning();
    if (!city) {
      const [exists] = await tx
        .select({ id: citiesTable.id })
        .from(citiesTable)
        .where(eq(citiesTable.id, id))
        .limit(1);
      if (!exists) throw new CmsContentNotFoundError("City");
      throw new CmsContentConflictError();
    }
    for (const localization of input.localizations) {
      await tx
        .insert(cityLocalizationsTable)
        .values({
          cityId: id,
          ...localization,
          createdByUserId: actorId,
          updatedByUserId: actorId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [cityLocalizationsTable.cityId, cityLocalizationsTable.locale],
          set: {
            name: localization.name,
            shortDescription: localization.shortDescription,
            updatedByUserId: actorId,
            updatedAt: now,
          },
        });
    }
    return city;
  });
}

export async function listCmsTags() {
  return getDb()
    .select()
    .from(contentTagsTable)
    .orderBy(asc(contentTagsTable.slug));
}

export async function listCmsPlaces() {
  const db = getDb();
  const [places, cities, localizations, tagRelations, tags] = await Promise.all([
    db.select().from(placesTable).orderBy(asc(placesTable.slug)),
    db.select().from(citiesTable),
    db.select().from(placeLocalizationsTable),
    db.select().from(placeContentTagsTable),
    db.select().from(contentTagsTable),
  ]);
  return places.map((place) => {
    const tagIds = tagRelations
      .filter(({ placeId }) => placeId === place.id)
      .map(({ tagId }) => tagId);
    return {
      ...place,
      city: cities.find(({ id }) => id === place.cityId),
      localizations: localizations.filter(({ placeId }) => placeId === place.id),
      tags: tags.filter(({ id }) => tagIds.includes(id)),
    };
  });
}

export async function getCmsPlace(id: number) {
  const places = await listCmsPlaces();
  return places.find((place) => place.id === id);
}

export async function createCmsPlace(input: PlaceInput, actorId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await assertCityExists(tx, input.cityId);
    const now = new Date();
    const [place] = await tx
      .insert(placesTable)
      .values({
        cityId: input.cityId,
        slug: input.slug,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        durationMinutes: input.durationMinutes,
        environment: input.environment,
        pricing: input.pricing,
        status: input.status,
        statusVerifiedAt: input.statusVerifiedAt,
        visitNoteVerifiedAt: input.visitNoteVerifiedAt,
        visitNoteValidUntil: input.visitNoteValidUntil,
        image: input.image,
        tags: [...input.tagSlugs],
        publicationStatus: input.publicationStatus,
        createdByUserId: actorId,
        updatedByUserId: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!place) throw new CmsContentIntegrityError("Place creation failed.");
    await savePlaceLocalizations(tx, place.id, input, actorId, now);
    await replacePlaceTags(tx, place.id, input.tagSlugs);
    return place;
  });
}

export async function updateCmsPlace(
  id: number,
  input: PlaceInput,
  actorId: string,
  expectedUpdatedAt: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await assertCityExists(tx, input.cityId);
    const current = await lockCmsPlace(tx, id);
    if (current.cityId !== input.cityId) {
      await assertPlaceMovePreservesTourCities(tx, id, input.cityId);
      await assertEntityMovePreservesMediaCity(tx, "place", id, input.cityId);
    }
    const now = new Date();
    const [place] = await tx
      .update(placesTable)
      .set({
        cityId: input.cityId,
        slug: input.slug,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        durationMinutes: input.durationMinutes,
        environment: input.environment,
        pricing: input.pricing,
        status: input.status,
        statusVerifiedAt: input.statusVerifiedAt,
        visitNoteVerifiedAt: input.visitNoteVerifiedAt,
        visitNoteValidUntil: input.visitNoteValidUntil,
        image: input.image,
        tags: [...input.tagSlugs],
        publicationStatus: input.publicationStatus,
        updatedByUserId: actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(placesTable.id, id),
          eq(placesTable.updatedAt, new Date(expectedUpdatedAt)),
        ),
      )
      .returning();
    if (!place) {
      const [exists] = await tx
        .select({ id: placesTable.id })
        .from(placesTable)
        .where(eq(placesTable.id, id))
        .limit(1);
      if (!exists) throw new CmsContentNotFoundError("Place");
      throw new CmsContentConflictError();
    }
    await savePlaceLocalizations(tx, id, input, actorId, now);
    await replacePlaceTags(tx, id, input.tagSlugs);
    return place;
  });
}

export async function listCmsTours() {
  const db = getDb();
  const [tours, cities, localizations, stops] = await Promise.all([
    db.select().from(toursTable).orderBy(asc(toursTable.slug)),
    db.select().from(citiesTable),
    db.select().from(tourLocalizationsTable),
    db.select().from(tourStopsTable).orderBy(asc(tourStopsTable.position)),
  ]);
  return tours.map((tour) => ({
    ...tour,
    city: cities.find(({ id }) => id === tour.cityId),
    localizations: localizations.filter(({ tourId }) => tourId === tour.id),
    stops: stops.filter(({ tourId }) => tourId === tour.id),
  }));
}

export async function getCmsTour(id: number) {
  const tours = await listCmsTours();
  return tours.find((tour) => tour.id === id);
}

export async function createCmsTour(input: TourInput, actorId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await assertTourRelations(tx, input);
    const now = new Date();
    const [tour] = await tx
      .insert(toursTable)
      .values({
        cityId: input.cityId,
        slug: input.slug,
        publicationStatus: input.publicationStatus,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        createdByUserId: actorId,
        updatedByUserId: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!tour) throw new CmsContentIntegrityError("Tour creation failed.");
    await saveTourChildren(tx, tour.id, input, actorId, now);
    return tour;
  });
}

export async function updateCmsTour(
  id: number,
  input: TourInput,
  actorId: string,
  expectedUpdatedAt: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const current = await lockCmsTour(tx, id);
    if (current.cityId !== input.cityId) {
      await assertEntityMovePreservesMediaCity(tx, "tour", id, input.cityId);
    }
    await assertTourRelations(tx, input);
    const now = new Date();
    const [tour] = await tx
      .update(toursTable)
      .set({
        cityId: input.cityId,
        slug: input.slug,
        publicationStatus: input.publicationStatus,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        updatedByUserId: actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(toursTable.id, id),
          eq(toursTable.updatedAt, new Date(expectedUpdatedAt)),
        ),
      )
      .returning();
    if (!tour) {
      const [exists] = await tx
        .select({ id: toursTable.id })
        .from(toursTable)
        .where(eq(toursTable.id, id))
        .limit(1);
      if (!exists) throw new CmsContentNotFoundError("Tour");
      throw new CmsContentConflictError();
    }
    await saveTourChildren(tx, id, input, actorId, now);
    return tour;
  });
}

export async function setCmsPublicationStatus(
  entity: "city" | "place" | "tour",
  id: number,
  status: PublicationStatus,
  actorId: string,
) {
  return getDb().transaction(async (tx) => {
    if (entity === "tour" && status === "published") {
      await assertStoredTourCanBePublished(tx, id);
    }
    if (entity === "place" && status === "archived") {
      await assertPlaceCanBeArchived(tx, id);
    }
    const table =
      entity === "city"
        ? citiesTable
        : entity === "place"
          ? placesTable
          : toursTable;
    const [record] = await tx
      .update(table)
      .set({
        publicationStatus: status,
        updatedByUserId: actorId,
        updatedAt: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    if (!record) throw new CmsContentNotFoundError(entity);
    return record;
  });
}

export async function deleteCmsDraft(
  entity: "city" | "place" | "tour",
  id: number,
) {
  const db = getDb();
  const table =
    entity === "city"
      ? citiesTable
      : entity === "place"
        ? placesTable
        : toursTable;
  if (entity === "city") {
    const [places, tours] = await Promise.all([
      db.select({ id: placesTable.id }).from(placesTable).where(eq(placesTable.cityId, id)),
      db.select({ id: toursTable.id }).from(toursTable).where(eq(toursTable.cityId, id)),
    ]);
    if (places.length || tours.length) {
      throw new CmsContentIntegrityError(
        "A city with places or tours cannot be deleted.",
      );
    }
  }
  const [deleted] = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.publicationStatus, "draft")))
    .returning();
  if (!deleted) {
    throw new CmsContentIntegrityError(
      "Only an existing draft record can be permanently deleted.",
    );
  }
  return deleted;
}

async function assertCityExists(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  cityId: number,
) {
  const [city] = await tx
    .select({
      id: citiesTable.id,
      publicationStatus: citiesTable.publicationStatus,
    })
    .from(citiesTable)
    .where(eq(citiesTable.id, cityId))
    .for("update")
    .limit(1);
  if (!city) throw new CmsContentIntegrityError("City does not exist.");
  return city;
}

async function assertTourRelations(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  input: Readonly<{
    cityId: number;
    publicationStatus: PublicationStatus;
    stops: readonly Readonly<{ placeId: number }>[];
  }>,
) {
  const city = await assertCityExists(tx, input.cityId);
  if (input.stops.length === 0) {
    if (input.publicationStatus === "published") {
      throw new CmsContentIntegrityError(
        "Published tours require at least one stop.",
      );
    }
    return;
  }
  const placeIds = input.stops.map(({ placeId }) => placeId);
  const records = await tx
    .select({
      id: placesTable.id,
      cityId: placesTable.cityId,
      publicationStatus: placesTable.publicationStatus,
    })
    .from(placesTable)
    .where(inArray(placesTable.id, placeIds))
    .for("update");
  if (
    records.length !== placeIds.length ||
    records.some(({ cityId }) => cityId !== input.cityId)
  ) {
    throw new CmsContentIntegrityError(
      "Every tour stop must exist and belong to the tour city.",
    );
  }
  if (input.publicationStatus === "published") {
    const graphError = getPublishedTourGraphError(
      city.publicationStatus,
      records.map(({ publicationStatus }) => publicationStatus),
    );
    if (graphError) throw new CmsContentIntegrityError(graphError);
  }
}

type CmsTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

async function lockCmsPlace(tx: CmsTransaction, placeId: number) {
  const [place] = await tx
    .select({ id: placesTable.id, cityId: placesTable.cityId })
    .from(placesTable)
    .where(eq(placesTable.id, placeId))
    .for("update")
    .limit(1);
  if (!place) throw new CmsContentNotFoundError("Place");
  return place;
}

async function lockCmsTour(tx: CmsTransaction, tourId: number) {
  const [tour] = await tx
    .select({ id: toursTable.id, cityId: toursTable.cityId })
    .from(toursTable)
    .where(eq(toursTable.id, tourId))
    .for("update")
    .limit(1);
  if (!tour) throw new CmsContentNotFoundError("Tour");
  return tour;
}

async function assertStoredTourCanBePublished(
  tx: CmsTransaction,
  tourId: number,
) {
  const tour = await lockCmsTour(tx, tourId);
  const stops = await tx
    .select({ placeId: tourStopsTable.placeId })
    .from(tourStopsTable)
    .where(eq(tourStopsTable.tourId, tourId));
  await assertTourRelations(tx, {
    cityId: tour.cityId,
    publicationStatus: "published",
    stops,
  });
}

async function assertPlaceCanBeArchived(
  tx: CmsTransaction,
  placeId: number,
) {
  await lockCmsPlace(tx, placeId);
  const [publishedTour] = await tx
    .select({ slug: toursTable.slug })
    .from(tourStopsTable)
    .innerJoin(toursTable, eq(tourStopsTable.tourId, toursTable.id))
    .where(
      and(
        eq(tourStopsTable.placeId, placeId),
        eq(toursTable.publicationStatus, "published"),
      ),
    )
    .limit(1);
  if (publishedTour) {
    throw new CmsContentIntegrityError(
      PUBLISHED_TOUR_PLACE_ARCHIVE_ERROR,
    );
  }
}

async function assertPlaceMovePreservesTourCities(
  tx: CmsTransaction,
  placeId: number,
  targetCityId: number,
) {
  const tourCities = await tx
    .select({ cityId: toursTable.cityId })
    .from(tourStopsTable)
    .innerJoin(toursTable, eq(tourStopsTable.tourId, toursTable.id))
    .where(eq(tourStopsTable.placeId, placeId));
  if (
    hasCrossCityTourReference(
      targetCityId,
      tourCities.map(({ cityId }) => cityId),
    )
  ) {
    throw new CmsContentIntegrityError(CROSS_CITY_PLACE_MOVE_ERROR);
  }
}

async function savePlaceLocalizations(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  placeId: number,
  input: PlaceInput,
  actorId: string,
  now: Date,
) {
  for (const localization of input.localizations) {
    await tx
      .insert(placeLocalizationsTable)
      .values({
        placeId,
        locale: localization.locale,
        name: localization.name,
        shortDescription: localization.shortDescription,
        description: localization.description,
        story: localization.story,
        visitNotes: localization.visitNotes,
        facts: [...localization.facts],
        createdByUserId: actorId,
        updatedByUserId: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [placeLocalizationsTable.placeId, placeLocalizationsTable.locale],
        set: {
          name: localization.name,
          shortDescription: localization.shortDescription,
          description: localization.description,
          story: localization.story,
          visitNotes: localization.visitNotes,
          facts: [...localization.facts],
          updatedByUserId: actorId,
          updatedAt: now,
        },
      });
  }
}

async function replacePlaceTags(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  placeId: number,
  tagSlugs: readonly string[],
) {
  await tx
    .delete(placeContentTagsTable)
    .where(eq(placeContentTagsTable.placeId, placeId));
  if (tagSlugs.length === 0) return;
  for (const slug of tagSlugs) {
    await tx
      .insert(contentTagsTable)
      .values({ slug, label: formatTagLabel(slug) })
      .onConflictDoNothing({ target: contentTagsTable.slug });
  }
  const tags = await tx
    .select({ id: contentTagsTable.id })
    .from(contentTagsTable)
    .where(inArray(contentTagsTable.slug, [...tagSlugs]));
  await tx.insert(placeContentTagsTable).values(
    tags.map(({ id: tagId }) => ({ placeId, tagId })),
  );
}

async function saveTourChildren(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  tourId: number,
  input: TourInput,
  actorId: string,
  now: Date,
) {
  for (const localization of input.localizations) {
    await tx
      .insert(tourLocalizationsTable)
      .values({
        tourId,
        ...localization,
        createdByUserId: actorId,
        updatedByUserId: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [tourLocalizationsTable.tourId, tourLocalizationsTable.locale],
        set: {
          title: localization.title,
          shortDescription: localization.shortDescription,
          description: localization.description,
          updatedByUserId: actorId,
          updatedAt: now,
        },
      });
  }
  await tx.delete(tourStopsTable).where(eq(tourStopsTable.tourId, tourId));
  if (input.stops.length > 0) {
    await tx.insert(tourStopsTable).values(
      input.stops.map((stop) => ({ tourId, ...stop })),
    );
  }
}

function formatTagLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
