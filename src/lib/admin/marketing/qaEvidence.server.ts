import "server-only";

import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  contentSourcesTable,
  placesTable,
  placeSourcesTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import {
  projectVerifiedMarketingEvidence,
  type MarketingTrustedChunkRow,
  type MarketingQaEvidence,
} from "./qaEvidence";

/**
 * In marketing, selecting a place is an explicit review context only.
 * Never infer that a linked campaign, city, CMS draft or source row proves facts.
 */
export type MarketingVerifiedPlaceOption = Readonly<{
  id: number;
  slug: string;
}>;

function trustedSourceConditions(cityId: number, today: string) {
  return and(
    eq(placesTable.cityId, cityId),
    eq(placesTable.publicationStatus, "published"),
    eq(verifiedKnowledgeChunksTable.isActive, true),
    eq(verifiedKnowledgeChunksTable.locale, "en"),
    lte(contentSourcesTable.verifiedAt, today),
    or(
      isNull(contentSourcesTable.validUntil),
      gte(contentSourcesTable.validUntil, today),
    ),
  );
}

function verifiedRelation() {
  return getDb()
    .select({
      id: verifiedKnowledgeChunksTable.id,
      cityId: placesTable.cityId,
      placeId: verifiedKnowledgeChunksTable.placeId,
      publicationStatus: placesTable.publicationStatus,
      locale: verifiedKnowledgeChunksTable.locale,
      isActive: verifiedKnowledgeChunksTable.isActive,
      text: verifiedKnowledgeChunksTable.text,
      sourceId: contentSourcesTable.id,
      publisher: contentSourcesTable.publisher,
      sourceTitle: contentSourcesTable.title,
      verifiedAt: contentSourcesTable.verifiedAt,
      validUntil: contentSourcesTable.validUntil,
    })
    .from(verifiedKnowledgeChunksTable)
    .innerJoin(
      placesTable,
      eq(verifiedKnowledgeChunksTable.placeId, placesTable.id),
    )
    .innerJoin(
      contentSourcesTable,
      eq(verifiedKnowledgeChunksTable.sourceId, contentSourcesTable.id),
    )
    .innerJoin(
      placeSourcesTable,
      and(
        eq(placeSourcesTable.placeId, placesTable.id),
        eq(placeSourcesTable.sourceId, contentSourcesTable.id),
      ),
    );
}

export async function listMarketingVerifiedPlaces(
  cityId: number,
): Promise<readonly MarketingVerifiedPlaceOption[]> {
  if (!Number.isSafeInteger(cityId) || cityId <= 0) return [];
  const today = new Date().toISOString().slice(0, 10);
  const rows = await getDb()
    .selectDistinct({
      id: placesTable.id,
      slug: placesTable.slug,
    })
    .from(placesTable)
    .innerJoin(
      verifiedKnowledgeChunksTable,
      eq(verifiedKnowledgeChunksTable.placeId, placesTable.id),
    )
    .innerJoin(
      contentSourcesTable,
      eq(verifiedKnowledgeChunksTable.sourceId, contentSourcesTable.id),
    )
    .innerJoin(
      placeSourcesTable,
      and(
        eq(placeSourcesTable.placeId, placesTable.id),
        eq(placeSourcesTable.sourceId, contentSourcesTable.id),
      ),
    )
    .where(trustedSourceConditions(cityId, today))
    .orderBy(asc(placesTable.slug))
    .limit(50);
  return rows;
}

export async function loadMarketingVerifiedPlaceEvidence(
  cityId: number,
  placeId: number,
): Promise<MarketingQaEvidence> {
  if (
    !Number.isSafeInteger(cityId) || cityId <= 0 ||
    !Number.isSafeInteger(placeId) || placeId <= 0
  ) {
    throw new Error("Invalid verified place context.");
  }

  const today = new Date().toISOString().slice(0, 10);
  // Both the selected place and its city scope are checked in this single
  // privileged read. A browser cannot supply facts or cross-city source IDs.
  const rows = await verifiedRelation()
    .where(
      and(
        trustedSourceConditions(cityId, today),
        eq(placesTable.id, placeId),
      ),
    )
    .orderBy(
      desc(verifiedKnowledgeChunksTable.priority),
      asc(verifiedKnowledgeChunksTable.id),
    )
    .limit(24);

  // No matching published/verified place is a hard rejection, not a silent
  // fallback to another city's knowledge or marketing copy.
  if (rows.length === 0) {
    throw new Error("No verified source is available for this place.");
  }

  const evidence = projectVerifiedMarketingEvidence(
    rows satisfies readonly MarketingTrustedChunkRow[],
    { cityId, placeId, today },
  );
  if (!evidence.verifiedFacts?.length) {
    throw new Error("No usable verified facts are available for this place.");
  }

  return evidence;
}
