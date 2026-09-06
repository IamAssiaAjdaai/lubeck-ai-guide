// @vitest-environment node

import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { closeDb, getDb } from "@/db/client";
import {
  citiesTable,
  contentTagsTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placesTable,
  tourStopsTable,
  toursTable,
} from "@/db/schema";
import {
  CmsContentConflictError,
  CmsContentIntegrityError,
  createCmsCity,
  createCmsPlace,
  createCmsTour,
  deleteCmsDraft,
  getCmsCity,
  getCmsPlace,
  getCmsTour,
  setCmsPublicationStatus,
  updateCmsCity,
  updateCmsPlace,
  updateCmsTour,
} from "@/lib/admin/content/repository.server";
import {
  CROSS_CITY_PLACE_MOVE_ERROR,
  PUBLISHED_TOUR_PLACE_ARCHIVE_ERROR,
  TOUR_CITY_NOT_PUBLISHED_ERROR,
  TOUR_STOP_NOT_PUBLISHED_ERROR,
} from "@/lib/admin/content/graphIntegrity";
import {
  getPublicCitySnapshot,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";

const shouldRun = process.env.CMS_DB_INTEGRATION === "1";
const citySlug = "cms02-integration-city";
const graphCitySlug = "cms02-graph-city";
const graphOtherCitySlug = "cms02-graph-other-city";
const actorId = "cms02-integration-actor";

describe.runIf(shouldRun)("CMS PostgreSQL integration", () => {
  afterAll(async () => {
    const db = getDb();
    const testCities = await db
      .select({ id: citiesTable.id })
      .from(citiesTable)
      .where(inArray(citiesTable.slug, [
        citySlug,
        graphCitySlug,
        graphOtherCitySlug,
      ]));
    for (const city of testCities) {
      await db.delete(toursTable).where(eq(toursTable.cityId, city.id));
      await db.delete(placesTable).where(eq(placesTable.cityId, city.id));
      await db.delete(citiesTable).where(eq(citiesTable.id, city.id));
    }
    await db
      .delete(contentTagsTable)
      .where(eq(contentTagsTable.slug, "cms02-integration-tag"));
    await closeDb();
  });

  it("exposes the idempotently imported canonical Lubeck snapshot", async () => {
    const snapshot = await getPublicCitySnapshot("lubeck", "database");
    const categoryCounts = snapshot.places.reduce(
      (counts, place) => {
        counts[place.category] += 1;
        return counts;
      },
      { see: 0, eat: 0, fun: 0 },
    );
    const curatedHiddenGems = snapshot.places.filter(
      ({ category, tags }) =>
        category === "see" && tags.includes("hidden-gem"),
    );
    const cafe = snapshot.places.find(
      ({ slug }) => slug === "cafe-niederegger",
    );

    expect(snapshot.places).toHaveLength(25);
    expect(new Set(snapshot.places.map(({ slug }) => slug)).size).toBe(25);
    expect(categoryCounts).toEqual({ see: 17, eat: 5, fun: 3 });
    expect(curatedHiddenGems).toHaveLength(5);
    expect(snapshot.tours).toHaveLength(1);
    expect(snapshot.tours[0]?.stops).toHaveLength(5);
    expect(resolvePublicLocalization(cafe?.content ?? {}, "ar")).toMatchObject({
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
    });

    const [lubeck] = await getDb()
      .select({ id: citiesTable.id })
      .from(citiesTable)
      .where(eq(citiesTable.slug, "lubeck"));
    expect(lubeck).toBeDefined();
    expect(await getDb()
      .select({ id: placeLocalizationsTable.id })
      .from(placeLocalizationsTable)
      .innerJoin(
        placesTable,
        eq(placeLocalizationsTable.placeId, placesTable.id),
      )
      .where(eq(placesTable.cityId, lubeck!.id))).toHaveLength(175);
  });

  it("runs transactional CRUD, publication, ordering, and public visibility", async () => {
    const existing = await getDb()
      .select({ id: citiesTable.id })
      .from(citiesTable)
      .where(eq(citiesTable.slug, citySlug));
    expect(existing).toEqual([]);

    const city = await createCmsCity({
      slug: citySlug,
      publicationStatus: "draft",
      localizations: [{ locale: "en", name: "Integration City" }],
    }, actorId);
    await expect(
      getPublicCitySnapshot(citySlug, "database"),
    ).rejects.toThrow("Published city snapshot is unavailable");

    const firstPlace = await createCmsPlace({
      cityId: city.id,
      slug: "first-place",
      category: "see",
      latitude: 53.86,
      longitude: 10.68,
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "draft",
      tagSlugs: ["cms02-integration-tag", "hidden-gem"],
      localizations: [{
        locale: "en",
        name: "First place",
        shortDescription: "First authored localization.",
        facts: [{ label: "Test", value: "Structured" }],
      }],
    }, actorId);
    const secondPlace = await createCmsPlace({
      cityId: city.id,
      slug: "second-place",
      category: "fun",
      latitude: 53.861,
      longitude: 10.681,
      durationMinutes: 15,
      environment: "indoor",
      pricing: "paid",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{
        locale: "de",
        name: "Zweiter Ort",
        shortDescription: "Explizit verfasster Inhalt.",
        facts: [],
      }],
    }, actorId);

    const storedPlace = await getCmsPlace(firstPlace.id);
    expect(storedPlace?.localizations).toHaveLength(1);
    expect(storedPlace?.tags.map(({ slug }) => slug).sort()).toEqual([
      "cms02-integration-tag",
      "hidden-gem",
    ]);
    expect(storedPlace?.createdByUserId).toBe(actorId);

    await setCmsPublicationStatus("place", firstPlace.id, "published", actorId);
    await setCmsPublicationStatus("place", secondPlace.id, "published", actorId);
    await setCmsPublicationStatus("city", city.id, "published", actorId);

    const tour = await createCmsTour({
      cityId: city.id,
      slug: "integration-tour",
      publicationStatus: "draft",
      estimatedDurationMinutes: 50,
      localizations: [{ locale: "en", title: "Integration tour" }],
      stops: [
        { placeId: firstPlace.id, position: 1 },
        { placeId: secondPlace.id, position: 2 },
      ],
    }, actorId);
    await setCmsPublicationStatus("tour", tour.id, "published", actorId);

    const published = await getPublicCitySnapshot(citySlug, "database");
    expect(published.places.map(({ slug }) => slug)).toEqual([
      "first-place",
      "second-place",
    ]);
    expect(published.tours[0]?.stops.map(({ placeSlug }) => placeSlug)).toEqual([
      "first-place",
      "second-place",
    ]);

    const currentTour = await getCmsTour(tour.id);
    expect(currentTour).toBeDefined();
    await updateCmsTour(tour.id, {
      cityId: city.id,
      slug: "integration-tour",
      publicationStatus: "published",
      estimatedDurationMinutes: 50,
      localizations: [{ locale: "en", title: "Integration tour" }],
      stops: [
        { placeId: secondPlace.id, position: 1 },
        { placeId: firstPlace.id, position: 2 },
      ],
    }, actorId, currentTour!.updatedAt.toISOString());
    expect((await getCmsTour(tour.id))?.stops.map(({ placeId }) => placeId))
      .toEqual([secondPlace.id, firstPlace.id]);

    const currentCity = await getCmsCity(city.id);
    expect(currentCity).toBeDefined();
    await updateCmsCity(city.id, {
      slug: citySlug,
      publicationStatus: "published",
      localizations: [{ locale: "en", name: "Updated Integration City" }],
    }, actorId, currentCity!.updatedAt.toISOString());
    await expect(updateCmsCity(city.id, {
      slug: citySlug,
      publicationStatus: "published",
      localizations: [{ locale: "en", name: "Stale write" }],
    }, actorId, currentCity!.updatedAt.toISOString())).rejects.toBeInstanceOf(
      CmsContentConflictError,
    );

    const draft = await createCmsPlace({
      cityId: city.id,
      slug: "deletable-draft",
      category: "eat",
      latitude: 53.862,
      longitude: 10.682,
      durationMinutes: 10,
      environment: "indoor",
      pricing: "unknown",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [],
    }, actorId);
    expect(
      (await getPublicCitySnapshot(citySlug, "database")).places.some(
        ({ slug }) => slug === "deletable-draft",
      ),
    ).toBe(false);
    await deleteCmsDraft("place", draft.id);
    expect(await getCmsPlace(draft.id)).toBeUndefined();

    await setCmsPublicationStatus("city", city.id, "archived", actorId);
    await expect(
      getPublicCitySnapshot(citySlug, "database"),
    ).rejects.toThrow("Published city snapshot is unavailable");

    const duplicateRows = await getDb()
      .select({ slug: placesTable.slug })
      .from(placesTable)
      .where(
        and(
          eq(placesTable.cityId, city.id),
          eq(placesTable.slug, "first-place"),
        ),
      );
    expect(duplicateRows).toHaveLength(1);
    expect(await getDb().select().from(placeLocalizationsTable).where(
      eq(placeLocalizationsTable.placeId, firstPlace.id),
    )).toHaveLength(1);
    expect(await getDb().select().from(placeContentTagsTable).where(
      eq(placeContentTagsTable.placeId, firstPlace.id),
    )).toHaveLength(2);
    expect(await getDb().select().from(tourStopsTable).where(
      eq(tourStopsTable.tourId, tour.id),
    )).toHaveLength(2);
  });

  it("prevents publication graph corruption across every write path", async () => {
    const city = await createCmsCity({
      slug: graphCitySlug,
      publicationStatus: "draft",
      localizations: [{ locale: "en", name: "Graph City" }],
    }, actorId);
    const otherCity = await createCmsCity({
      slug: graphOtherCitySlug,
      publicationStatus: "draft",
      localizations: [{ locale: "en", name: "Other Graph City" }],
    }, actorId);
    const firstPlace = await createCmsPlace({
      cityId: city.id,
      slug: "graph-first-place",
      category: "see",
      latitude: 53.85,
      longitude: 10.67,
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Graph first place",
        shortDescription: "First graph place.",
        facts: [],
      }],
    }, actorId);
    const secondPlace = await createCmsPlace({
      cityId: city.id,
      slug: "graph-second-place",
      category: "fun",
      latitude: 53.851,
      longitude: 10.671,
      durationMinutes: 15,
      environment: "indoor",
      pricing: "paid",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Graph second place",
        shortDescription: "Second graph place.",
        facts: [],
      }],
    }, actorId);
    const tour = await createCmsTour({
      cityId: city.id,
      slug: "graph-tour",
      publicationStatus: "draft",
      localizations: [{ locale: "en", title: "Graph tour" }],
      stops: [
        { placeId: firstPlace.id, position: 1 },
        { placeId: secondPlace.id, position: 2 },
      ],
    }, actorId);

    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).rejects.toMatchObject({
      message: TOUR_CITY_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await setCmsPublicationStatus("city", city.id, "published", actorId);
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await setCmsPublicationStatus(
      "place",
      firstPlace.id,
      "published",
      actorId,
    );
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await setCmsPublicationStatus(
      "place",
      secondPlace.id,
      "published",
      actorId,
    );
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).resolves.toMatchObject({ publicationStatus: "published" });

    const draftPlace = await createCmsPlace({
      cityId: city.id,
      slug: "graph-draft-place",
      category: "eat",
      latitude: 53.852,
      longitude: 10.672,
      durationMinutes: 10,
      environment: "mixed",
      pricing: "unknown",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Graph draft place",
        shortDescription: "Draft graph place.",
        facts: [],
      }],
    }, actorId);
    const currentTour = await getCmsTour(tour.id);
    expect(currentTour).toBeDefined();
    await expect(updateCmsTour(tour.id, {
      cityId: city.id,
      slug: "graph-tour",
      publicationStatus: "published",
      localizations: [{ locale: "en", title: "Graph tour" }],
      stops: [
        { placeId: firstPlace.id, position: 1 },
        { placeId: draftPlace.id, position: 2 },
      ],
    }, actorId, currentTour!.updatedAt.toISOString())).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);
    expect((await getCmsTour(tour.id))?.stops.map(({ placeId }) => placeId))
      .toEqual([firstPlace.id, secondPlace.id]);

    await expect(
      setCmsPublicationStatus("place", secondPlace.id, "archived", actorId),
    ).rejects.toMatchObject({
      message: PUBLISHED_TOUR_PLACE_ARCHIVE_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await setCmsPublicationStatus("tour", tour.id, "archived", actorId);
    await expect(
      setCmsPublicationStatus("place", secondPlace.id, "archived", actorId),
    ).resolves.toMatchObject({ publicationStatus: "archived" });

    const archivedStopTour = await createCmsTour({
      cityId: city.id,
      slug: "archived-stop-tour",
      publicationStatus: "draft",
      localizations: [{ locale: "en", title: "Archived stop tour" }],
      stops: [{ placeId: secondPlace.id, position: 1 }],
    }, actorId);
    await expect(
      setCmsPublicationStatus(
        "tour",
        archivedStopTour.id,
        "published",
        actorId,
      ),
    ).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);
    await expect(createCmsTour({
      cityId: city.id,
      slug: "published-archived-stop-tour",
      publicationStatus: "published",
      localizations: [{ locale: "en", title: "Invalid published tour" }],
      stops: [{ placeId: secondPlace.id, position: 1 }],
    }, actorId)).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    const currentFirstPlace = await getCmsPlace(firstPlace.id);
    expect(currentFirstPlace).toBeDefined();
    await expect(updateCmsPlace(firstPlace.id, {
      cityId: otherCity.id,
      slug: "graph-first-place",
      category: "see",
      latitude: 53.85,
      longitude: 10.67,
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "published",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Graph first place",
        shortDescription: "First graph place.",
        facts: [],
      }],
    }, actorId, currentFirstPlace!.updatedAt.toISOString()))
      .rejects.toMatchObject({
        message: CROSS_CITY_PLACE_MOVE_ERROR,
      } satisfies Partial<CmsContentIntegrityError>);

    await expect(createCmsTour({
      cityId: otherCity.id,
      slug: "cross-city-draft-tour",
      publicationStatus: "draft",
      localizations: [{ locale: "en", title: "Cross-city draft tour" }],
      stops: [{ placeId: firstPlace.id, position: 1 }],
    }, actorId)).rejects.toThrow(
      "Every tour stop must exist and belong to the tour city.",
    );

    const publicSnapshot = await getPublicCitySnapshot(
      graphCitySlug,
      "database",
    );
    expect(publicSnapshot.places.map(({ slug }) => slug)).toEqual([
      "graph-first-place",
    ]);
    expect(publicSnapshot.tours).toEqual([]);
  });
});
