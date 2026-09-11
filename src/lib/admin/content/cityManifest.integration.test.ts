// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { hamburgCityManifest, HAMBURG_PLACE_COUNT } from "@/data/cities/hamburg";
import { closeDb, getDb } from "@/db/client";
import {
  citiesTable,
  cityLaunchReadinessTable,
  cityLocalizationsTable,
  citySourcesTable,
  contentSourcesTable,
  contentWorkflowEventsTable,
  placeLocalizationsTable,
  placeRevisionsTable,
  placeSourcesTable,
  placesTable,
  toursTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import { GET as getPublicCityIndex } from "@/app/api/content/cities/route";
import { GET as getPublicCity } from "@/app/api/content/cities/[citySlug]/route";
import { loadCityManifestFile } from "@/lib/admin/content/cityManifestFile.server";
import {
  importCityManifest,
  importTrustedCityBootstrapManifest,
} from "@/lib/admin/content/importCityManifest.server";
import { setCmsPublicationStatus } from "@/lib/admin/content/repository.server";
import { DatabaseVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";
import { getCityPassConfiguration } from "@/lib/commerce/cityPassConfig";
import {
  getPublicCitySnapshot,
  getPublicCitySummaries,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import {
  getCityReadinessMatrix,
  getCityReadinessReport,
} from "@/lib/content/cityReadiness.server";

const shouldRun = process.env.CITY_CONTENT_DB_INTEGRATION === "1";

const NO_CODE_CITY_SLUG = "no-code-pipeline-test";
const UNTRACKED_CITY_SLUG = "untracked-published-test";
const NO_CODE_SOURCE_URLS = [
  "https://example.test/no-code-pipeline-test/city",
  "https://example.test/no-code-pipeline-test/json-museum",
  "https://example.test/no-code-pipeline-test/data-garden",
] as const;

function createNoCodeManifest() {
  return {
    schemaVersion: 1,
    city: {
      slug: NO_CODE_CITY_SLUG,
      name: "No-code Pipeline Test",
      countryCode: "DE",
      timezone: "Europe/Berlin",
      publicationStatus: "published",
      content: {
        de: {
          name: "No-Code-Pipeline-Test",
          shortDescription: "Eine temporaere Stadt aus einem JSON-Manifest.",
          description: "Diese Einfuehrung wird als validierte Daten und nicht als Anwendungscode importiert.",
        },
        en: {
          name: "No-code Pipeline Test",
          shortDescription: "A temporary city from a JSON manifest.",
          description: "This introduction is imported as validated data rather than application code.",
        },
      },
      sources: [{
        publisher: "No-code test authority",
        title: "No-code test city source",
        canonicalUrl: NO_CODE_SOURCE_URLS[0],
        verifiedAt: "2026-09-09",
      }],
    },
    coordinateQa: { latitude: [52, 53], longitude: [9, 11] },
    readiness: {
      targetPlaceCount: 2,
      requiredContentLocales: ["de", "en"],
      reviewedContentLocales: ["de", "en"],
      requiredAudioLocales: [],
      audioTargetPlaceCount: 0,
      minimumVerifiedAiPlaceCount: 0,
      webQaStatus: "passed",
      nativeQaStatus: "passed",
      travelerQaStatus: "passed",
      premiumContentStatus: "ready",
    },
    places: [
      {
        slug: "json-museum",
        category: "see",
        coordinates: { lat: 52.51, lng: 10.01 },
        durationMinutes: 30,
        environment: "indoor",
        pricing: "unknown",
        status: "unknown",
        visitNoteVerifiedAt: "2026-09-11",
        visitNoteValidUntil: "2026-12-31",
        tags: ["history"],
        publicationStatus: "published",
        content: {
          de: { name: "JSON-Museum", shortDescription: "Ein temporaerer Testort." },
          en: { name: "JSON Museum", shortDescription: "A temporary test place." },
        },
        sources: [{
          publisher: "No-code test authority",
          title: "JSON Museum source",
          canonicalUrl: NO_CODE_SOURCE_URLS[1],
          verifiedAt: "2026-09-09",
        }],
      },
      {
        slug: "data-garden",
        category: "fun",
        coordinates: { lat: 52.52, lng: 10.02 },
        durationMinutes: 20,
        environment: "outdoor",
        pricing: "free",
        status: "unknown",
        tags: ["family"],
        publicationStatus: "published",
        content: {
          de: { name: "Datengarten", shortDescription: "Ein zweiter temporaerer Testort." },
          en: { name: "Data Garden", shortDescription: "A second temporary test place." },
        },
        sources: [{
          publisher: "No-code test authority",
          title: "Data Garden source",
          canonicalUrl: NO_CODE_SOURCE_URLS[2],
          verifiedAt: "2026-09-09",
        }],
      },
    ],
    tours: [{
      slug: "no-code-introduction",
      publicationStatus: "published",
      estimatedDurationMinutes: 60,
      content: {
        de: { title: "No-Code-Einfuehrung" },
        en: { title: "No-code introduction" },
      },
      stops: [
        { placeSlug: "json-museum", visitDurationMinutes: 30 },
        { placeSlug: "data-garden", visitDurationMinutes: 20 },
      ],
    }],
    knowledge: [{
      placeSlug: "json-museum",
      sourceUrl: NO_CODE_SOURCE_URLS[1],
      locale: "en",
      text: "Reviewed facts must not become active merely because JSON supplied them.",
      topics: ["history"],
    }],
  } as const;
}

async function publishThroughCmsWorkflow(
  entity: "city" | "place" | "tour",
  id: number,
) {
  const actorId = "city-import-integration-reviewer";
  await setCmsPublicationStatus(entity, id, "in_review", actorId);
  await setCmsPublicationStatus(entity, id, "approved", actorId);
  await setCmsPublicationStatus(entity, id, "published", actorId);
}

describe.runIf(shouldRun)("generic city content PostgreSQL integration", () => {
  afterAll(async () => closeDb());

  it("imports Hamburg idempotently through CMS tables and published revisions", async () => {
    const first = await importTrustedCityBootstrapManifest(hamburgCityManifest);
    const second = await importTrustedCityBootstrapManifest(hamburgCityManifest);

    expect(first).toMatchObject({
      citySlug: "hamburg",
      citySourceCount: 1,
      placeCount: HAMBURG_PLACE_COUNT,
      placeLocalizationCount: HAMBURG_PLACE_COUNT * 2,
      currentRevisionCount: HAMBURG_PLACE_COUNT,
      tourCount: 1,
      tourStopCount: 7,
      verifiedKnowledgeCount: 5,
    });
    expect(first.sourceLinkCount).toBeGreaterThanOrEqual(HAMBURG_PLACE_COUNT);
    expect(second).toEqual(first);

    const db = getDb();
    const [city] = await db.select().from(citiesTable)
      .where(eq(citiesTable.slug, "hamburg"));
    expect(city).toMatchObject({ countryCode: "DE", timezone: "Europe/Berlin" });
    const cityLocalizations = await db.select().from(cityLocalizationsTable)
      .where(eq(cityLocalizationsTable.cityId, city!.id));
    expect(cityLocalizations).toEqual(expect.arrayContaining([
      expect.objectContaining({ locale: "de", description: expect.any(String) }),
      expect.objectContaining({ locale: "en", description: expect.any(String) }),
    ]));
    expect(await db.select().from(citySourcesTable)
      .where(eq(citySourcesTable.cityId, city!.id))).toHaveLength(1);
    const places = await db.select().from(placesTable)
      .where(eq(placesTable.cityId, city!.id));
    const revisions = await db.select().from(placeRevisionsTable)
      .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
      .where(and(
        eq(placesTable.cityId, city!.id),
        eq(placeRevisionsTable.isCurrent, true),
      ));
    expect(new Set(places.map(({ slug }) => slug)).size).toBe(HAMBURG_PLACE_COUNT);
    expect(revisions).toHaveLength(HAMBURG_PLACE_COUNT);
    expect(new Set(revisions.map(({ place_revisions }) => place_revisions.placeId)).size)
      .toBe(HAMBURG_PLACE_COUNT);
    expect(await db.select().from(placeLocalizationsTable)
      .innerJoin(placesTable, eq(placeLocalizationsTable.placeId, placesTable.id))
      .where(eq(placesTable.cityId, city!.id))).toHaveLength(HAMBURG_PLACE_COUNT * 2);
    expect(await db.select().from(placeSourcesTable)
      .innerJoin(placesTable, eq(placeSourcesTable.placeId, placesTable.id))
      .where(eq(placesTable.cityId, city!.id)))
      .toHaveLength(first.sourceLinkCount);
    expect(await db.select().from(verifiedKnowledgeChunksTable)
      .innerJoin(placesTable, eq(verifiedKnowledgeChunksTable.placeId, placesTable.id))
      .where(eq(placesTable.cityId, city!.id))).toHaveLength(5);
  });

  it("does not overwrite staff-edited city localization content on rerun", async () => {
    await importTrustedCityBootstrapManifest(hamburgCityManifest);
    const db = getDb();
    const [city] = await db.select().from(citiesTable)
      .where(eq(citiesTable.slug, "hamburg"));
    const [english] = await db.select().from(cityLocalizationsTable)
      .where(and(
        eq(cityLocalizationsTable.cityId, city!.id),
        eq(cityLocalizationsTable.locale, "en"),
      ));
    const canonical = hamburgCityManifest.city.content.en;
    const staffDescription = "Staff-authored integration-test introduction.";

    try {
      await db.update(cityLocalizationsTable).set({
        description: staffDescription,
        updatedByUserId: "integration-test-editor",
      }).where(eq(cityLocalizationsTable.id, english!.id));

      await importTrustedCityBootstrapManifest(hamburgCityManifest);

      const [protectedLocalization] = await db.select()
        .from(cityLocalizationsTable)
        .where(eq(cityLocalizationsTable.id, english!.id));
      expect(protectedLocalization).toMatchObject({
        description: staffDescription,
        updatedByUserId: "integration-test-editor",
      });
    } finally {
      await db.update(cityLocalizationsTable).set({
        name: canonical.name,
        shortDescription: canonical.shortDescription,
        description: canonical.description,
        updatedByUserId: null,
      }).where(eq(cityLocalizationsTable.id, english!.id));
    }
  });

  it("exposes Hamburg and Lubeck as isolated generic public snapshots", async () => {
    const summaries = await getPublicCitySummaries("database");
    const hamburg = await getPublicCitySnapshot("hamburg", "database");
    const lubeck = await getPublicCitySnapshot("lubeck", "database");

    expect(summaries.map(({ city }) => city.slug)).toEqual(
      expect.arrayContaining(["hamburg", "lubeck"]),
    );
    expect(hamburg.city).toMatchObject({
      slug: "hamburg",
      countryCode: "DE",
      timezone: "Europe/Berlin",
    });
    expect(hamburg.city.content.de?.description).toBeTruthy();
    expect(hamburg.city.content.en?.description).toBeTruthy();
    expect(lubeck.city.content.de?.description).toBeTruthy();
    expect(lubeck.city.content.en?.description).toBeTruthy();
    expect(hamburg.places).toHaveLength(HAMBURG_PLACE_COUNT);
    expect(hamburg.places.every(({ city }) => city === "hamburg")).toBe(true);
    expect(hamburg.places.some(({ slug }) =>
      lubeck.places.some((place) => place.slug === slug),
    )).toBe(false);
    expect(hamburg.tours).toHaveLength(1);
    expect(hamburg.tours[0]?.stops.map(({ position }) => position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(resolvePublicLocalization(hamburg.city.content, "ar")).toMatchObject({
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
    });
    await expect(getPublicCitySnapshot("not-hamburg", "database")).rejects.toThrow();
  });

  it("reports honest blockers without creating Hamburg premium configuration", async () => {
    const report = await getCityReadinessReport("hamburg");

    expect(report).toMatchObject({
      publishedPlaceCount: HAMBURG_PLACE_COUNT,
      citySourceProvenanceReady: true,
      cityContentCompleteByLocale: { de: true, en: true },
      sourceCompletePlaceCount: HAMBURG_PLACE_COUNT,
      verifiedAiEligiblePlaceCount: 5,
      keyImageCompletePlaceCount: 0,
      publishedTourCount: 1,
      coherentPublishedTourCount: 1,
      contentCoveragePercentByLocale: { de: 100, en: 100 },
      audioCoveragePercentByLocale: { de: 0, en: 0 },
      premiumContentStatus: "not_required",
      launchReady: false,
    });
    expect(report.blockers).toEqual(expect.arrayContaining([
      "approved_key_imagery_incomplete",
      "content_review_pending:de",
      "content_review_pending:en",
      "exact_locale_audio_incomplete:de",
      "exact_locale_audio_incomplete:en",
      "web_qa_pending",
      "native_qa_pending",
      "traveler_qa_pending",
    ]));
    expect(getCityPassConfiguration("hamburg")).toBeUndefined();
    expect(getCityPassConfiguration("lubeck")).toBeDefined();
  });

  it("includes the Lubeck flagship in the same honest readiness matrix", async () => {
    const matrix = await getCityReadinessMatrix(["hamburg", "lubeck"]);
    const lubeck = matrix.find(({ citySlug }) => citySlug === "lubeck");

    expect(matrix.map(({ citySlug }) => citySlug)).toEqual(["hamburg", "lubeck"]);
    expect(lubeck).toMatchObject({
      cityPublished: true,
      citySourceProvenanceReady: true,
      cityContentCompleteByLocale: { de: true, en: true },
      reviewedContentLocales: [],
      launchReady: false,
    });
    expect(typeof lubeck?.cityKeyImageReady).toBe("boolean");
    expect(lubeck?.blockers).toEqual(expect.arrayContaining([
      "content_review_pending:de",
      "content_review_pending:en",
    ]));
    if (!lubeck?.cityKeyImageReady) {
      expect(lubeck?.blockers).toContain("approved_key_imagery_incomplete");
    }
  });

  it("ingests external JSON as draft and exposes it only after the CMS workflow", async () => {
    const db = getDb();
    const beforeHamburg = await getPublicCitySnapshot("hamburg", "database");
    const beforeLubeck = await getPublicCitySnapshot("lubeck", "database");
    const directory = await mkdtemp(join(tmpdir(), "citywalk-no-code-city-"));
    const manifestPath = join(directory, "third-city.json");
    const previousSource = process.env.CITYWALK_CONTENT_SOURCE;

    try {
      await writeFile(
        manifestPath,
        JSON.stringify(createNoCodeManifest()),
        "utf8",
      );
      const manifest = await loadCityManifestFile(manifestPath);

      const first = await importCityManifest(manifest);
      const second = await importCityManifest(manifest);
      expect(first).toMatchObject({
        citySlug: NO_CODE_CITY_SLUG,
        placeCount: 2,
        placeLocalizationCount: 4,
        currentRevisionCount: 0,
        tourCount: 1,
        verifiedKnowledgeCount: 1,
      });
      expect(second).toEqual(first);

      const [testCity] = await db.select().from(citiesTable)
        .where(eq(citiesTable.slug, NO_CODE_CITY_SLUG));
      const importedPlaces = await db.select().from(placesTable)
        .where(eq(placesTable.cityId, testCity!.id));
      const [importedTour] = await db.select().from(toursTable)
        .where(eq(toursTable.cityId, testCity!.id));
      const [readinessProfile] = await db.select().from(cityLaunchReadinessTable)
        .where(eq(cityLaunchReadinessTable.cityId, testCity!.id));
      const importedKnowledge = await db.select().from(verifiedKnowledgeChunksTable)
        .innerJoin(placesTable, eq(verifiedKnowledgeChunksTable.placeId, placesTable.id))
        .where(eq(placesTable.cityId, testCity!.id));

      expect(testCity!.publicationStatus).toBe("draft");
      expect(importedPlaces).toHaveLength(2);
      expect(importedPlaces.every(({ publicationStatus }) =>
        publicationStatus === "draft"
      )).toBe(true);
      expect(importedPlaces.find(({ slug }) => slug === "json-museum"))
        .toMatchObject({
          visitNoteVerifiedAt: "2026-09-11",
          visitNoteValidUntil: "2026-12-31",
        });
      expect(importedTour!.publicationStatus).toBe("draft");
      expect(readinessProfile).toMatchObject({
        reviewedContentLocales: [],
        webQaStatus: "pending",
        nativeQaStatus: "pending",
        travelerQaStatus: "pending",
        premiumContentStatus: "pending",
      });
      expect(importedKnowledge).toHaveLength(1);
      expect(importedKnowledge[0]!.verified_knowledge_chunks.isActive).toBe(false);
      expect(await db.select().from(contentWorkflowEventsTable)
        .where(and(
          eq(contentWorkflowEventsTable.entityType, "city"),
          eq(contentWorkflowEventsTable.entityId, testCity!.id),
        )))
        .toHaveLength(0);
      expect(await new DatabaseVerifiedKnowledgeProvider().listVerifiedChunks({
        citySlug: NO_CODE_CITY_SLUG,
        placeSlug: "json-museum",
        locale: "en",
      })).toEqual([]);

      const draftRevisions = await db.select().from(placeRevisionsTable)
        .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
        .where(and(
          eq(placesTable.cityId, testCity!.id),
          eq(placeRevisionsTable.isCurrent, true),
        ));
      expect(draftRevisions).toHaveLength(0);

      process.env.CITYWALK_CONTENT_SOURCE = "database";
      const draftIndexResponse = await getPublicCityIndex(
        new Request("http://localhost/api/content/cities?locale=en"),
      );
      expect(draftIndexResponse.status).toBe(200);
      expect((await draftIndexResponse.json()).cities).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ slug: NO_CODE_CITY_SLUG }),
        ]),
      );
      expect((await getPublicCity(
        new Request(`http://localhost/api/content/cities/${NO_CODE_CITY_SLUG}?locale=de`),
        { params: Promise.resolve({ citySlug: NO_CODE_CITY_SLUG }) },
      )).status).toBe(404);

      const [englishCityContent] = await db.select().from(cityLocalizationsTable)
        .where(and(
          eq(cityLocalizationsTable.cityId, testCity!.id),
          eq(cityLocalizationsTable.locale, "en"),
        ));
      const staffDescription = "Staff-reviewed draft introduction.";
      await db.update(cityLocalizationsTable).set({
        description: staffDescription,
        updatedByUserId: "city-import-integration-editor",
      }).where(eq(cityLocalizationsTable.id, englishCityContent!.id));
      await importCityManifest(manifest);
      expect((await db.select().from(cityLocalizationsTable)
        .where(eq(cityLocalizationsTable.id, englishCityContent!.id)))[0])
        .toMatchObject({
          description: staffDescription,
          updatedByUserId: "city-import-integration-editor",
        });

      await publishThroughCmsWorkflow("city", testCity!.id);
      for (const place of importedPlaces) {
        await publishThroughCmsWorkflow("place", place.id);
      }
      await publishThroughCmsWorkflow("tour", importedTour!.id);

      const [untrackedCity] = await db.insert(citiesTable).values({
        slug: UNTRACKED_CITY_SLUG,
        name: "Untracked Published Test",
        countryCode: "DE",
        timezone: "Europe/Berlin",
        publicationStatus: "published",
      }).onConflictDoNothing({ target: citiesTable.slug }).returning();

      const indexResponse = await getPublicCityIndex(
        new Request("http://localhost/api/content/cities?locale=en"),
      );
      expect(indexResponse.status).toBe(200);
      const indexPayload = await indexResponse.json();
      expect(indexPayload.cities).toEqual(expect.arrayContaining([
        expect.objectContaining({ slug: NO_CODE_CITY_SLUG, name: "No-code Pipeline Test" }),
      ]));

      const detailResponse = await getPublicCity(
        new Request(`http://localhost/api/content/cities/${NO_CODE_CITY_SLUG}?locale=de`),
        { params: Promise.resolve({ citySlug: NO_CODE_CITY_SLUG }) },
      );
      expect(detailResponse.status).toBe(200);
      const detailPayload = await detailResponse.json();
      expect(detailPayload.city).toMatchObject({
        slug: NO_CODE_CITY_SLUG,
        requestedLocale: "de",
        resolvedLocale: "de",
        didFallback: false,
      });
      expect(detailPayload.places.map(({ slug }: { slug: string }) => slug)).toEqual([
        "json-museum",
        "data-garden",
      ]);
      expect(detailPayload.tours).toEqual([
        expect.objectContaining({ slug: "no-code-introduction" }),
      ]);

      const readiness = await getCityReadinessMatrix();
      expect(readiness.map(({ citySlug }) => citySlug)).toContain(NO_CODE_CITY_SLUG);
      expect(readiness.map(({ citySlug }) => citySlug)).not.toContain(UNTRACKED_CITY_SLUG);

      const revisions = await db.select().from(placeRevisionsTable)
        .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
        .where(and(
          eq(placesTable.cityId, testCity!.id),
          eq(placeRevisionsTable.isCurrent, true),
        ));
      expect(revisions).toHaveLength(2);
      await importCityManifest(manifest);
      const revisionsAfterReimport = await db.select().from(placeRevisionsTable)
        .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
        .where(and(
          eq(placesTable.cityId, testCity!.id),
          eq(placeRevisionsTable.isCurrent, true),
        ));
      expect(revisionsAfterReimport).toHaveLength(2);
      expect((await db.select().from(citiesTable)
        .where(eq(citiesTable.id, testCity!.id)))[0]!.publicationStatus)
        .toBe("published");
      expect((await db.select().from(placesTable)
        .where(eq(placesTable.cityId, testCity!.id)))
        .every(({ publicationStatus }) => publicationStatus === "published"))
        .toBe(true);

      if (untrackedCity) {
        await db.delete(citiesTable).where(eq(citiesTable.id, untrackedCity.id));
      }
    } finally {
      if (previousSource === undefined) {
        delete process.env.CITYWALK_CONTENT_SOURCE;
      } else {
        process.env.CITYWALK_CONTENT_SOURCE = previousSource;
      }
      const [testCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
        .where(eq(citiesTable.slug, NO_CODE_CITY_SLUG));
      if (testCity) {
        await db.delete(toursTable).where(eq(toursTable.cityId, testCity.id));
        await db.delete(citiesTable).where(eq(citiesTable.id, testCity.id));
      }
      const [untrackedCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
        .where(eq(citiesTable.slug, UNTRACKED_CITY_SLUG));
      if (untrackedCity) {
        await db.delete(citiesTable).where(eq(citiesTable.id, untrackedCity.id));
      }
      await db.delete(contentSourcesTable).where(
        inArray(contentSourcesTable.canonicalUrl, [...NO_CODE_SOURCE_URLS]),
      );
      await rm(directory, { force: true, recursive: true });
    }

    const afterHamburg = await getPublicCitySnapshot("hamburg", "database");
    const afterLubeck = await getPublicCitySnapshot("lubeck", "database");
    expect(afterHamburg.places.map(({ slug }) => slug)).toEqual(
      beforeHamburg.places.map(({ slug }) => slug),
    );
    expect(afterLubeck.places.map(({ slug }) => slug)).toEqual(
      beforeLubeck.places.map(({ slug }) => slug),
    );
    await expect(
      getPublicCitySnapshot(NO_CODE_CITY_SLUG, "database"),
    ).rejects.toThrow();
  });
});
