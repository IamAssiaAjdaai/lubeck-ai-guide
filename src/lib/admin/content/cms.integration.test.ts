// @vitest-environment node

import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { closeDb, getDb } from "@/db/client";
import {
  citiesTable,
  contentWorkflowEventsTable,
  contentTagsTable,
  contentSourcesTable,
  placeContentTagsTable,
  placeLocalizationsTable,
  placeRevisionsTable,
  placeSourcesTable,
  placesTable,
  tourStopsTable,
  toursTable,
} from "@/db/schema";
import {
  CmsContentConflictError,
  CmsContentIntegrityError,
  approveAndPublishCmsContent,
  createCmsCity,
  createCmsPlace,
  createCmsTour,
  createOrReuseCmsSourceForPlace,
  deleteCmsDraft,
  getCmsCity,
  getCmsPlace,
  getCmsTour,
  setCmsPublicationStatus,
  updateCmsCity,
  updateCmsPlace,
  updateCmsTour,
  withdrawCmsPublishedPlaceRevision,
} from "@/lib/admin/content/repository.server";
import {
  CROSS_CITY_PLACE_MOVE_ERROR,
  PUBLISHED_TOUR_PLACE_ARCHIVE_ERROR,
  TOUR_CITY_NOT_PUBLISHED_ERROR,
  TOUR_STOP_NOT_PUBLISHED_ERROR,
} from "@/lib/admin/content/graphIntegrity";
import {
  getPublicCitySummaries,
  getPublicCitySnapshot,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { importCanonicalLubeckContent } from "@/lib/admin/content/importLubeck.server";

const shouldRun = process.env.CMS_DB_INTEGRATION === "1";
const citySlug = "cms02-integration-city";
const graphCitySlug = "cms02-graph-city";
const graphOtherCitySlug = "cms02-graph-other-city";
const withdrawalCitySlug = "cms02-withdrawal-city";
const actorId = "cms02-integration-actor";

async function prepareForPublication(
  entity: "city" | "place" | "tour",
  id: number,
) {
  if (entity === "place") {
    await createOrReuseCmsSourceForPlace(id, {
      publisher: "CITYWALK integration",
      title: `Integration source ${id}`,
      canonicalUrl: `https://example.com/cms-source/${id}`,
      verifiedAt: "2020-01-01",
    }, actorId);
  }
  await setCmsPublicationStatus(entity, id, "in_review", actorId);
  await setCmsPublicationStatus(entity, id, "approved", actorId);
}

async function publish(
  entity: "city" | "place" | "tour",
  id: number,
) {
  await prepareForPublication(entity, id);
  return setCmsPublicationStatus(entity, id, "published", actorId);
}

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
        withdrawalCitySlug,
      ]));
    for (const city of testCities) {
      await db.delete(toursTable).where(eq(toursTable.cityId, city.id));
      await db.delete(placesTable).where(eq(placesTable.cityId, city.id));
      await db.delete(citiesTable).where(eq(citiesTable.id, city.id));
    }
    await db
      .delete(contentTagsTable)
      .where(eq(contentTagsTable.slug, "cms02-integration-tag"));
    await db
      .delete(contentSourcesTable)
      .where(eq(contentSourcesTable.publisher, "CITYWALK integration"));
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
    const canonicalSourceLinks = await getDb()
      .select({ placeId: placeSourcesTable.placeId })
      .from(placeSourcesTable)
      .innerJoin(placesTable, eq(placeSourcesTable.placeId, placesTable.id))
      .where(eq(placesTable.cityId, lubeck!.id));
    expect(new Set(canonicalSourceLinks.map(({ placeId }) => placeId)).size).toBe(25);
    const canonicalRevisions = await getDb()
      .select({
        id: placeRevisionsTable.id,
        placeId: placeRevisionsTable.placeId,
        revisionNumber: placeRevisionsTable.revisionNumber,
      })
      .from(placeRevisionsTable)
      .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
      .where(
        and(
          eq(placesTable.cityId, lubeck!.id),
          eq(placeRevisionsTable.isCurrent, true),
        ),
      );
    expect(canonicalRevisions).toHaveLength(25);
    expect(new Set(canonicalRevisions.map(({ placeId }) => placeId)).size).toBe(25);
    expect(canonicalRevisions.every(({ revisionNumber }) => revisionNumber === 1)).toBe(true);

    const revisionIdsBeforeRepeat = canonicalRevisions.map(({ id }) => id).sort((a, b) => a - b);
    await importCanonicalLubeckContent();
    await importCanonicalLubeckContent();
    const canonicalRevisionsAfterRepeat = await getDb()
      .select({ id: placeRevisionsTable.id, placeId: placeRevisionsTable.placeId })
      .from(placeRevisionsTable)
      .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
      .where(
        and(
          eq(placesTable.cityId, lubeck!.id),
          eq(placeRevisionsTable.isCurrent, true),
        ),
      );
    expect(canonicalRevisionsAfterRepeat).toHaveLength(25);
    expect(new Set(canonicalRevisionsAfterRepeat.map(({ placeId }) => placeId)).size).toBe(25);
    expect(canonicalRevisionsAfterRepeat.map(({ id }) => id).sort((a, b) => a - b))
      .toEqual(revisionIdsBeforeRepeat);
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
    expect((await getPublicCitySummaries("database")).some(
      ({ city: publicCity }) => publicCity.slug === citySlug,
    )).toBe(false);
    await publish("city", city.id);
    expect((await getPublicCitySummaries("database")).some(
      ({ city: publicCity }) => publicCity.slug === citySlug,
    )).toBe(false);

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

    await publish("place", firstPlace.id);
    await publish("place", secondPlace.id);
    const combinedPlace = await createCmsPlace({
      cityId: city.id,
      slug: "combined-place",
      category: "see",
      latitude: 53.854,
      longitude: 10.674,
      durationMinutes: 10,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{ locale: "en", name: "Combined place", shortDescription: "Combined action.", facts: [] }],
    }, actorId);
    await createOrReuseCmsSourceForPlace(combinedPlace.id, {
      publisher: "CITYWALK integration",
      title: "Combined source",
      canonicalUrl: `https://example.com/cms-source/${combinedPlace.id}/combined`,
      verifiedAt: "2020-01-01",
    }, actorId);
    await setCmsPublicationStatus("place", combinedPlace.id, "in_review", actorId);
    await expect(approveAndPublishCmsContent("place", combinedPlace.id, actorId))
      .resolves.toMatchObject({ publicationStatus: "published" });
    expect((await getCmsPlace(combinedPlace.id))?.workflowEvents.slice(-2).map(({ action }) => action))
      .toEqual(["approved", "published"]);
    await setCmsPublicationStatus("place", combinedPlace.id, "archived", actorId);
    const expiredSourcePlace = await createCmsPlace({
      cityId: city.id,
      slug: "expired-source-place",
      category: "see",
      latitude: 53.853,
      longitude: 10.673,
      durationMinutes: 10,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Expired source place",
        shortDescription: "Publication must remain blocked.",
        facts: [],
      }],
    }, actorId);
    await expect(
      setCmsPublicationStatus("place", expiredSourcePlace.id, "in_review", actorId),
    ).resolves.toMatchObject({ publicationStatus: "in_review" });
    await setCmsPublicationStatus("place", expiredSourcePlace.id, "draft", actorId);
    await createOrReuseCmsSourceForPlace(expiredSourcePlace.id, {
      publisher: "CITYWALK integration",
      title: "Expired source",
      canonicalUrl: `https://example.com/cms-source/${expiredSourcePlace.id}/expired`,
      verifiedAt: "2020-01-01",
      validUntil: "2020-01-02",
    }, actorId);
    await setCmsPublicationStatus("place", expiredSourcePlace.id, "in_review", actorId);
    await setCmsPublicationStatus("place", expiredSourcePlace.id, "approved", actorId);
    await expect(
      setCmsPublicationStatus("place", expiredSourcePlace.id, "published", actorId),
    ).rejects.toThrow("required source is invalid or expired");

    const publishedFirstPlace = await getCmsPlace(firstPlace.id);
    expect(publishedFirstPlace?.sourceLinks).toHaveLength(1);
    const secondarySource = {
      publisher: "CITYWALK integration",
      title: "Secondary integration source",
      canonicalUrl: `https://example.com/cms-source/${firstPlace.id}/secondary`,
      verifiedAt: "2020-01-01",
    } as const;
    await createOrReuseCmsSourceForPlace(firstPlace.id, secondarySource, actorId);
    await createOrReuseCmsSourceForPlace(firstPlace.id, secondarySource, actorId);
    expect((await getCmsPlace(firstPlace.id))?.sourceLinks).toHaveLength(2);
    await updateCmsPlace(firstPlace.id, {
      cityId: city.id,
      slug: "first-place",
      category: "see",
      latitude: 53.86,
      longitude: 10.68,
      durationMinutes: 25,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "published",
      tagSlugs: ["cms02-integration-tag", "hidden-gem"],
      localizations: [{
        locale: "en",
        name: "First place",
        shortDescription: "Materially edited content.",
        facts: [{ label: "Test", value: "Structured" }],
      }, {
        locale: "de",
        name: "Erster Ort",
        shortDescription: "Neue Arbeitsübersetzung.",
        facts: [],
      }],
    }, actorId, publishedFirstPlace!.updatedAt.toISOString());
    expect((await getCmsPlace(firstPlace.id))?.publicationStatus).toBe("draft");
    const publicWhileDraft = (await getPublicCitySnapshot(citySlug, "database")).places.find(
      ({ slug }) => slug === "first-place",
    );
    expect(publicWhileDraft?.durationMinutes).toBe(20);
    expect(publicWhileDraft?.content.en?.shortDescription).toBe("First authored localization.");
    expect(publicWhileDraft?.content.de).toBeUndefined();
    await setCmsPublicationStatus("place", firstPlace.id, "in_review", actorId);
    expect((await getPublicCitySnapshot(citySlug, "database")).places.find(
      ({ slug }) => slug === "first-place",
    )?.durationMinutes).toBe(20);
    await setCmsPublicationStatus("place", firstPlace.id, "approved", actorId);
    expect((await getPublicCitySnapshot(citySlug, "database")).places.find(
      ({ slug }) => slug === "first-place",
    )?.durationMinutes).toBe(20);
    await setCmsPublicationStatus("place", firstPlace.id, "published", actorId);
    const publicAfterPublish = (await getPublicCitySnapshot(citySlug, "database")).places.find(
      ({ slug }) => slug === "first-place",
    );
    expect(publicAfterPublish?.durationMinutes).toBe(25);
    expect(publicAfterPublish?.content.en?.shortDescription).toBe("Materially edited content.");
    expect(publicAfterPublish?.content.de?.shortDescription).toBe("Neue Arbeitsübersetzung.");
    expect(await getDb().select().from(placeRevisionsTable).where(
      eq(placeRevisionsTable.placeId, firstPlace.id),
    )).toHaveLength(2);

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
    await publish("tour", tour.id);

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
    expect((await getCmsTour(tour.id))?.publicationStatus).toBe("draft");
    await publish("tour", tour.id);

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
    expect((await getCmsCity(city.id))?.publicationStatus).toBe("draft");
    await publish("city", city.id);

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
    expect((await getPublicCitySummaries("database")).some(
      ({ city: publicCity }) => publicCity.slug === citySlug,
    )).toBe(false);
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
    )).toHaveLength(2);
    expect(await getDb().select().from(placeContentTagsTable).where(
      eq(placeContentTagsTable.placeId, firstPlace.id),
    )).toHaveLength(2);
    expect(await getDb().select().from(tourStopsTable).where(
      eq(tourStopsTable.tourId, tour.id),
    )).toHaveLength(2);
    expect((await getCmsPlace(firstPlace.id))?.workflowEvents.map(({ action }) => action))
      .toEqual(expect.arrayContaining([
        "submitted_for_review",
        "approved",
        "published",
        "returned_to_draft",
      ]));
  });

  it("withdraws a live revision while preserving its working draft", async () => {
    const city = await createCmsCity({
      slug: withdrawalCitySlug,
      publicationStatus: "draft",
      localizations: [{ locale: "en", name: "Withdrawal city" }],
    }, actorId);
    await publish("city", city.id);
    const place = await createCmsPlace({
      cityId: city.id,
      slug: "deferred-place",
      category: "see",
      latitude: 53.55,
      longitude: 9.99,
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "draft",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Deferred place",
        shortDescription: "Published version one.",
        facts: [],
      }],
    }, actorId);
    await publish("place", place.id);

    const publishedPlace = await getCmsPlace(place.id);
    await updateCmsPlace(place.id, {
      cityId: city.id,
      slug: "deferred-place",
      category: "see",
      latitude: 53.55,
      longitude: 9.99,
      durationMinutes: 25,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "published",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Deferred place draft",
        shortDescription: "Unpublished working content remains editable.",
        facts: [],
      }],
    }, actorId, publishedPlace!.updatedAt.toISOString());

    await expect(withdrawCmsPublishedPlaceRevision(place.id, actorId))
      .resolves.toMatchObject({ placeId: place.id });

    const preservedDraft = await getCmsPlace(place.id);
    expect(preservedDraft?.publicationStatus).toBe("draft");
    expect(preservedDraft?.localizations[0]?.name).toBe("Deferred place draft");
    expect(preservedDraft?.publishedRevision).toBeUndefined();
    await expect(getPublicCitySnapshot(withdrawalCitySlug, "database"))
      .rejects.toThrow("Published city is not traveler-discoverable");
    const [event] = await getDb()
      .select({ action: contentWorkflowEventsTable.action })
      .from(contentWorkflowEventsTable)
      .where(and(
        eq(contentWorkflowEventsTable.entityType, "place"),
        eq(contentWorkflowEventsTable.entityId, place.id),
        eq(contentWorkflowEventsTable.action, "published_revision_withdrawn"),
      ));
    expect(event?.action).toBe("published_revision_withdrawn");
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

    await prepareForPublication("tour", tour.id);
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).rejects.toMatchObject({
      message: TOUR_CITY_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await publish("city", city.id);
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await publish("place", firstPlace.id);
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).rejects.toMatchObject({
      message: TOUR_STOP_NOT_PUBLISHED_ERROR,
    } satisfies Partial<CmsContentIntegrityError>);

    await publish("place", secondPlace.id);
    await expect(
      setCmsPublicationStatus("tour", tour.id, "published", actorId),
    ).resolves.toMatchObject({ publicationStatus: "published" });

    const liveFirstPlace = await getCmsPlace(firstPlace.id);
    await updateCmsPlace(firstPlace.id, {
      cityId: city.id,
      slug: "graph-first-place",
      category: "see",
      latitude: 53.85,
      longitude: 10.67,
      durationMinutes: 30,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "published",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Graph first place revision",
        shortDescription: "Working revision.",
        facts: [],
      }],
    }, actorId, liveFirstPlace!.updatedAt.toISOString());
    expect((await getCmsTour(tour.id))?.publicationStatus).toBe("published");
    const publicDuringPlaceEdit = await getPublicCitySnapshot(graphCitySlug, "database");
    expect(publicDuringPlaceEdit.tours[0]?.stops).toHaveLength(2);
    expect(publicDuringPlaceEdit.places.find(({ slug }) => slug === "graph-first-place")?.durationMinutes).toBe(20);
    await publish("place", firstPlace.id);

    const republishedFirstPlace = await getCmsPlace(firstPlace.id);
    await expect(updateCmsPlace(firstPlace.id, {
      cityId: city.id,
      slug: "changed-live-slug",
      category: "see",
      latitude: 53.85,
      longitude: 10.67,
      durationMinutes: 30,
      environment: "outdoor",
      pricing: "free",
      publicationStatus: "published",
      tagSlugs: [],
      localizations: [{
        locale: "en",
        name: "Graph first place revision",
        shortDescription: "Working revision.",
        facts: [],
      }],
    }, actorId, republishedFirstPlace!.updatedAt.toISOString())).rejects.toMatchObject({
      message: "Archive this published place before changing its slug.",
    } satisfies Partial<CmsContentIntegrityError>);
    expect(
      (await getPublicCitySnapshot(graphCitySlug, "database")).places.some(
        ({ slug }) => slug === "graph-first-place",
      ),
    ).toBe(true);

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
    }, actorId, currentTour!.updatedAt.toISOString())).resolves.toMatchObject({
      publicationStatus: "draft",
    });
    expect((await getCmsTour(tour.id))?.stops.map(({ placeId }) => placeId))
      .toEqual([firstPlace.id, draftPlace.id]);

    const draftTour = await getCmsTour(tour.id);
    await updateCmsTour(tour.id, {
      cityId: city.id,
      slug: "graph-tour",
      publicationStatus: "draft",
      localizations: [{ locale: "en", title: "Graph tour" }],
      stops: [
        { placeId: firstPlace.id, position: 1 },
        { placeId: secondPlace.id, position: 2 },
      ],
    }, actorId, draftTour!.updatedAt.toISOString());
    await publish("tour", tour.id);

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
    await prepareForPublication("tour", archivedStopTour.id);
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
