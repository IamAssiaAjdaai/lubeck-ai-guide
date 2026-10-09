// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { getDb, closeDb } from "@/db/client";
import {
  citiesTable,
  contentSourcesTable,
  placesTable,
  placeSourcesTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import {
  listMarketingVerifiedPlaces,
  loadMarketingVerifiedPlaceEvidence,
} from "./qaEvidence.server";

const shouldRun = process.env.CMS_DB_INTEGRATION === "1";

/**
 * Requires local, disposable PostgreSQL. Never point this test at the
 * production, Preview or a shared database. Each row has a unique fixture ID.
 */
function requireDisposableLocalDb() {
  let host: string;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    throw new Error("Marketing QA integration requires a local test database.");
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Marketing QA integration refuses a non-local database.");
  }
}

describe.runIf(shouldRun)("Marketing QA real PostgreSQL evidence acceptance", () => {
  const key = randomUUID();
  const fixtureSlug = "marketing-qa-test-" + key;
  const sourceUrl = "https://example.test/marketing-qa-evidence/" + key;
  const statement = "The visitor centre closes at 16:00.";
  const today = new Date().toISOString().slice(0, 10);
  let cityId: number | undefined;
  let placeId: number | undefined;
  let sourceId: number | undefined;
  let chunkId: string | undefined;
  let localDatabaseConfirmed = false;

  beforeAll(async () => {
    requireDisposableLocalDb();
    localDatabaseConfirmed = true;

    const db = getDb();
    const [city] = await db
      .select({ id: citiesTable.id })
      .from(citiesTable)
      .where(eq(citiesTable.slug, "lubeck"))
      .limit(1);

    if (!city) throw new Error("CI must seed the Lübeck city before Marketing QA integration.");
    cityId = city.id;

    const [place] = await db.insert(placesTable).values({
      cityId,
      slug: fixtureSlug,
      category: "see",
      latitude: 53.87,
      longitude: 10.69,
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "unknown",
      tags: [],
      publicationStatus: "published",
    }).returning({ id: placesTable.id });
    if (!place) throw new Error("Test place insertion failed.");
    placeId = place.id;

    const [source] = await db.insert(contentSourcesTable).values({
      publisher: "QA integration fixture",
      title: "Verified visitor information",
      canonicalUrl: sourceUrl,
      verifiedAt: today,
      validUntil: null,
    }).returning({ id: contentSourcesTable.id });
    if (!source) throw new Error("Test source insertion failed.");
    sourceId = source.id;

    await db.insert(placeSourcesTable).values({ placeId, sourceId });

    const [chunk] = await db.insert(verifiedKnowledgeChunksTable).values({
      placeId,
      sourceId,
      locale: "en",
      text: statement,
      topics: ["opening hours"],
      priority: 100,
      isActive: true,
    }).returning({ id: verifiedKnowledgeChunksTable.id });
    if (!chunk) throw new Error("Test verified chunk insertion failed.");
    chunkId = chunk.id;
  });

  afterAll(async () => {
    if (!localDatabaseConfirmed) return;
    const db = getDb();
    try {
      if (chunkId) {
        await db.delete(verifiedKnowledgeChunksTable).where(eq(verifiedKnowledgeChunksTable.id, chunkId));
      }
      if (placeId && sourceId) {
        await db.delete(placeSourcesTable).where(and(
          eq(placeSourcesTable.placeId, placeId),
          eq(placeSourcesTable.sourceId, sourceId),
        ));
      }
      if (sourceId) {
        await db.delete(contentSourcesTable).where(eq(contentSourcesTable.id, sourceId));
      }
      if (placeId) {
        await db.delete(placesTable).where(eq(placesTable.id, placeId));
      }
    } finally {
      await closeDb();
    }
  });

  it("lists only a published place with active English facts and valid linked source", async () => {
    const options = await listMarketingVerifiedPlaces(cityId!);
    expect(options).toContainEqual({ id: placeId, slug: fixtureSlug });
    const evidence = await loadMarketingVerifiedPlaceEvidence(cityId!, placeId!);
    expect(evidence.allowedFactIds).toContain(chunkId);
    expect(evidence.verifiedFacts).toContainEqual({
      id: chunkId,
      statement,
      sourceReferenceIds: ["source:" + sourceId],
    });
    expect(evidence.sourceReferences).toContainEqual({
      id: "source:" + sourceId,
      label: "QA integration fixture — Verified visitor information",
    });
    // Canonical source URLs stay on the server, not in Groq's bounded package.
    expect(JSON.stringify(evidence)).not.toContain(sourceUrl);
  });

  it("rejects a cross-city lookup rather than mixing facts", async () => {
    await expect(loadMarketingVerifiedPlaceEvidence(cityId! + 100_000, placeId!))
      .rejects.toThrow(/No verified source/);
  });

  it("rejects an unknown place without falling back to citywide facts", async () => {
    await expect(loadMarketingVerifiedPlaceEvidence(cityId!, 2_147_483_647))
      .rejects.toThrow(/No verified source/);
  });

  it("excludes expired sources from both selector and provider", async () => {
    const db = getDb();
    await db.update(contentSourcesTable)
      .set({ validUntil: "2000-01-01" })
      .where(eq(contentSourcesTable.id, sourceId!));
    try {
      expect(await listMarketingVerifiedPlaces(cityId!))
        .not.toContainEqual({ id: placeId, slug: fixtureSlug });
      await expect(loadMarketingVerifiedPlaceEvidence(cityId!, placeId!))
        .rejects.toThrow(/No verified source/);
    } finally {
      await db.update(contentSourcesTable)
        .set({ validUntil: null })
        .where(eq(contentSourcesTable.id, sourceId!));
    }
  });

  it("excludes sources verified in the future", async () => {
    const db = getDb();
    await db.update(contentSourcesTable)
      .set({ verifiedAt: "2099-01-01" })
      .where(eq(contentSourcesTable.id, sourceId!));
    try {
      expect(await listMarketingVerifiedPlaces(cityId!))
        .not.toContainEqual({ id: placeId, slug: fixtureSlug });
      await expect(loadMarketingVerifiedPlaceEvidence(cityId!, placeId!))
        .rejects.toThrow(/No verified source/);
    } finally {
      await db.update(contentSourcesTable)
        .set({ verifiedAt: today })
        .where(eq(contentSourcesTable.id, sourceId!));
    }
  });

  it("excludes inactive and non-English chunks", async () => {
    const db = getDb();
    for (const changed of [{ isActive: false }, { locale: "de" }]) {
      await db.update(verifiedKnowledgeChunksTable)
        .set(changed)
        .where(eq(verifiedKnowledgeChunksTable.id, chunkId!));
      try {
        expect(await listMarketingVerifiedPlaces(cityId!))
          .not.toContainEqual({ id: placeId, slug: fixtureSlug });
        await expect(loadMarketingVerifiedPlaceEvidence(cityId!, placeId!))
          .rejects.toThrow(/No verified source/);
      } finally {
        await db.update(verifiedKnowledgeChunksTable)
          .set({ isActive: true, locale: "en" })
          .where(eq(verifiedKnowledgeChunksTable.id, chunkId!));
      }
    }
  });

  it("does not treat merely linked source records as verified knowledge", async () => {
    const db = getDb();
    await db.delete(verifiedKnowledgeChunksTable)
      .where(eq(verifiedKnowledgeChunksTable.id, chunkId!));
    chunkId = undefined;
    expect(await listMarketingVerifiedPlaces(cityId!))
      .not.toContainEqual({ id: placeId, slug: fixtureSlug });
    await expect(loadMarketingVerifiedPlaceEvidence(cityId!, placeId!))
      .rejects.toThrow(/No verified source/);
  });
});
