// @vitest-environment node

import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { closeDb, getDb } from "@/db/client";
import {
  citiesTable,
  contentSourcesTable,
  placesTable,
  placeSourcesTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import { importCanonicalLubeckContent } from "@/lib/admin/content/importLubeck.server";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { getGuideEligibility } from "@/lib/guideEligibility.server";
import {
  addVerifiedKnowledgeChunk,
  relinkVerifiedKnowledgeChunkSource,
  removeVerifiedKnowledgeChunk,
} from "@/lib/verifiedKnowledgeAdmin.server";
import { DatabaseVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

const shouldRun = process.env.VERIFIED_KNOWLEDGE_DB_INTEGRATION === "1";
const testText = "AI-02 integration evidence that must never ship as content.";
const replacementSourceUrl = "https://example.test/verified-knowledge-source-relink";

describe.runIf(shouldRun)("verified knowledge PostgreSQL integration", () => {
  afterAll(async () => {
    const db = getDb();
    await db
      .delete(verifiedKnowledgeChunksTable)
      .where(eq(verifiedKnowledgeChunksTable.text, testText));
    const [replacementSource] = await db.select({ id: contentSourcesTable.id })
      .from(contentSourcesTable)
      .where(eq(contentSourcesTable.canonicalUrl, replacementSourceUrl));
    if (replacementSource) {
      await db.delete(placeSourcesTable)
        .where(eq(placeSourcesTable.sourceId, replacementSource.id));
      await db.delete(contentSourcesTable)
        .where(eq(contentSourcesTable.id, replacementSource.id));
    }
    await closeDb();
  });

  it("requires an explicit exact-locale chunk and remains idempotently removable", async () => {
    await importCanonicalLubeckContent();
    const db = getDb();
    const [relationship] = await db
      .select({
        placeId: placesTable.id,
        sourceId: contentSourcesTable.id,
        sourceUrl: contentSourcesTable.canonicalUrl,
      })
      .from(placesTable)
      .innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .innerJoin(placeSourcesTable, eq(placeSourcesTable.placeId, placesTable.id))
      .innerJoin(
        contentSourcesTable,
        eq(placeSourcesTable.sourceId, contentSourcesTable.id),
      )
      .where(and(
        eq(citiesTable.slug, "lubeck"),
        eq(placesTable.slug, "cafe-niederegger"),
      ))
      .limit(1);
    expect(relationship).toBeDefined();
    const [foreignRelationship] = await db
      .select({ sourceUrl: contentSourcesTable.canonicalUrl })
      .from(placesTable)
      .innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .innerJoin(placeSourcesTable, eq(placeSourcesTable.placeId, placesTable.id))
      .innerJoin(
        contentSourcesTable,
        eq(placeSourcesTable.sourceId, contentSourcesTable.id),
      )
      .where(and(
        eq(citiesTable.slug, "lubeck"),
        eq(placesTable.slug, "holstentor"),
      ))
      .limit(1);
    expect(foreignRelationship).toBeDefined();

    const provider = new DatabaseVerifiedKnowledgeProvider();
    const snapshot = await getPublicCitySnapshot("lubeck", "database");
    await expect(getGuideEligibility({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      source: "database",
      snapshot,
      provider,
    })).resolves.toBe(false);

    const inserted = await addVerifiedKnowledgeChunk({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      sourceUrl: relationship!.sourceUrl,
      locale: "en",
      text: testText,
      topics: ["integration"],
    });

    await expect(getGuideEligibility({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      source: "database",
      snapshot,
      provider,
    })).resolves.toBe(true);
    await expect(provider.listVerifiedChunks({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      locale: "de",
    })).resolves.toEqual([]);

    await expect(relinkVerifiedKnowledgeChunkSource({
      id: inserted!.id,
      sourceUrl: foreignRelationship!.sourceUrl,
    })).rejects.toThrow(/replacement source must already be linked to this place/i);
    expect((await db.select({
      sourceId: verifiedKnowledgeChunksTable.sourceId,
      isActive: verifiedKnowledgeChunksTable.isActive,
    }).from(verifiedKnowledgeChunksTable)
      .where(eq(verifiedKnowledgeChunksTable.id, inserted!.id)))[0])
      .toEqual({ sourceId: relationship!.sourceId, isActive: true });

    const [replacementSource] = await db.insert(contentSourcesTable).values({
      publisher: "Integration test",
      title: "Replacement source",
      canonicalUrl: replacementSourceUrl,
      verifiedAt: "2026-09-11",
    }).returning({ id: contentSourcesTable.id });
    await db.insert(placeSourcesTable).values({
      placeId: relationship!.placeId,
      sourceId: replacementSource!.id,
      required: true,
    });
    await expect(relinkVerifiedKnowledgeChunkSource({
      id: inserted!.id,
      sourceUrl: replacementSourceUrl,
    })).resolves.toMatchObject({
      id: inserted!.id,
      sourceId: replacementSource!.id,
      isActive: true,
    });
    await db.update(verifiedKnowledgeChunksTable)
      .set({ isActive: false })
      .where(eq(verifiedKnowledgeChunksTable.id, inserted!.id));
    await expect(relinkVerifiedKnowledgeChunkSource({
      id: inserted!.id,
      sourceUrl: relationship!.sourceUrl,
    })).resolves.toMatchObject({
      id: inserted!.id,
      sourceId: relationship!.sourceId,
      isActive: false,
    });

    await expect(removeVerifiedKnowledgeChunk(inserted!.id)).resolves.toBe(true);
    await expect(provider.listVerifiedChunks({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      locale: "en",
    })).resolves.toEqual([]);
  });
});
