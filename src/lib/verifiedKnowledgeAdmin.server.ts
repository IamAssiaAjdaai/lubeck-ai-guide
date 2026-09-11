import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  citiesTable,
  contentSourcesTable,
  placesTable,
  placeSourcesTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import { isLocale, type Locale } from "@/lib/i18n";

export type AddVerifiedKnowledgeChunkInput = Readonly<{
  citySlug: string;
  placeSlug: string;
  sourceUrl: string;
  locale: Locale;
  text: string;
  topics?: readonly string[];
  priority?: number;
}>;

export type RelinkVerifiedKnowledgeChunkSourceInput = Readonly<{
  id: string;
  sourceUrl: string;
}>;

const KNOWLEDGE_CHUNK_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSlug(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(`${label} must be a lowercase slug.`);
  }
  return normalized;
}

export async function addVerifiedKnowledgeChunk(
  input: AddVerifiedKnowledgeChunkInput,
) {
  const citySlug = requireSlug(input.citySlug, "City slug");
  const placeSlug = requireSlug(input.placeSlug, "Place slug");
  const sourceUrl = input.sourceUrl.trim();
  const text = input.text.trim();
  const topics = [...new Set(input.topics?.map((topic) => topic.trim()).filter(Boolean) ?? [])];
  const priority = input.priority ?? 0;

  if (!isLocale(input.locale)) throw new Error("Unsupported knowledge locale.");
  if (!/^https:\/\//.test(sourceUrl)) throw new Error("Source URL must use HTTPS.");
  if (!text || text.length > 8_000) throw new Error("Knowledge text must be 1-8000 characters.");
  if (topics.length > 20 || topics.some((topic) => topic.length > 100)) {
    throw new Error("Knowledge topics are invalid.");
  }
  if (!Number.isInteger(priority) || priority < -1_000 || priority > 1_000) {
    throw new Error("Priority must be an integer from -1000 to 1000.");
  }

  return getDb().transaction(async (transaction) => {
    const [relationship] = await transaction
      .select({ placeId: placesTable.id, sourceId: contentSourcesTable.id })
      .from(placesTable)
      .innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .innerJoin(placeSourcesTable, eq(placeSourcesTable.placeId, placesTable.id))
      .innerJoin(
        contentSourcesTable,
        eq(placeSourcesTable.sourceId, contentSourcesTable.id),
      )
      .where(and(
        eq(citiesTable.slug, citySlug),
        eq(placesTable.slug, placeSlug),
        eq(contentSourcesTable.canonicalUrl, sourceUrl),
      ))
      .limit(1);

    if (!relationship) {
      throw new Error("The place and source must exist and already be linked in CMS.");
    }

    const [chunk] = await transaction
      .insert(verifiedKnowledgeChunksTable)
      .values({
        placeId: relationship.placeId,
        sourceId: relationship.sourceId,
        locale: input.locale,
        text,
        topics,
        priority,
      })
      .returning({ id: verifiedKnowledgeChunksTable.id });

    return chunk;
  });
}

export async function removeVerifiedKnowledgeChunk(id: string): Promise<boolean> {
  if (!KNOWLEDGE_CHUNK_ID_PATTERN.test(id)) {
    throw new Error("A valid knowledge chunk UUID is required.");
  }

  const deleted = await getDb()
    .delete(verifiedKnowledgeChunksTable)
    .where(eq(verifiedKnowledgeChunksTable.id, id))
    .returning({ id: verifiedKnowledgeChunksTable.id });
  return deleted.length === 1;
}

export async function relinkVerifiedKnowledgeChunkSource(
  input: RelinkVerifiedKnowledgeChunkSourceInput,
) {
  if (!KNOWLEDGE_CHUNK_ID_PATTERN.test(input.id)) {
    throw new Error("A valid knowledge chunk UUID is required.");
  }
  const sourceUrl = input.sourceUrl.trim();
  if (!/^https:\/\//.test(sourceUrl)) {
    throw new Error("Source URL must use HTTPS.");
  }

  return getDb().transaction(async (transaction) => {
    const [chunk] = await transaction
      .select({
        id: verifiedKnowledgeChunksTable.id,
        placeId: verifiedKnowledgeChunksTable.placeId,
        isActive: verifiedKnowledgeChunksTable.isActive,
      })
      .from(verifiedKnowledgeChunksTable)
      .where(eq(verifiedKnowledgeChunksTable.id, input.id))
      .limit(1);
    if (!chunk) throw new Error("Knowledge chunk not found.");

    const [source] = await transaction
      .select({ sourceId: contentSourcesTable.id })
      .from(placeSourcesTable)
      .innerJoin(
        contentSourcesTable,
        eq(placeSourcesTable.sourceId, contentSourcesTable.id),
      )
      .where(and(
        eq(placeSourcesTable.placeId, chunk.placeId),
        eq(contentSourcesTable.canonicalUrl, sourceUrl),
      ))
      .limit(1);
    if (!source) {
      throw new Error("The replacement source must already be linked to this place.");
    }

    const [updated] = await transaction
      .update(verifiedKnowledgeChunksTable)
      .set({ sourceId: source.sourceId, updatedAt: new Date() })
      .where(eq(verifiedKnowledgeChunksTable.id, chunk.id))
      .returning({
        id: verifiedKnowledgeChunksTable.id,
        sourceId: verifiedKnowledgeChunksTable.sourceId,
        isActive: verifiedKnowledgeChunksTable.isActive,
      });
    if (!updated) throw new Error("Knowledge source relink failed.");
    return updated;
  });
}
