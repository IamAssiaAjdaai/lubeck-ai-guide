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
  removeVerifiedKnowledgeChunk,
} from "@/lib/verifiedKnowledgeAdmin.server";
import { DatabaseVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

const shouldRun = process.env.VERIFIED_KNOWLEDGE_DB_INTEGRATION === "1";
const testText = "AI-02 integration evidence that must never ship as content.";

describe.runIf(shouldRun)("verified knowledge PostgreSQL integration", () => {
  afterAll(async () => {
    await getDb()
      .delete(verifiedKnowledgeChunksTable)
      .where(eq(verifiedKnowledgeChunksTable.text, testText));
    await closeDb();
  });

  it("requires an explicit exact-locale chunk and remains idempotently removable", async () => {
    await importCanonicalLubeckContent();
    const db = getDb();
    const [relationship] = await db
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
        eq(placesTable.slug, "cafe-niederegger"),
      ))
      .limit(1);
    expect(relationship).toBeDefined();

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

    await expect(removeVerifiedKnowledgeChunk(inserted!.id)).resolves.toBe(true);
    await expect(provider.listVerifiedChunks({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      locale: "en",
    })).resolves.toEqual([]);
  });
});
