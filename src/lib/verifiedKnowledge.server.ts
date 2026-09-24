import "server-only";

import { and, eq } from "drizzle-orm";

import { lubeckKnowledgeChunks } from "@/data/knowledge/lubeck";
import { getDb } from "@/db/client";
import {
  citiesTable,
  contentSourcesTable,
  placeSourcesTable,
  placesTable,
  verifiedKnowledgeChunksTable,
} from "@/db/schema";
import type { ContentSource } from "@/lib/content/source";
import type { Locale } from "@/lib/i18n";
import type { KnowledgeChunk } from "@/lib/knowledge";

export type VerifiedKnowledgeScope = Readonly<{
  citySlug: string;
  placeSlug: string;
  locale: Locale;
}>;

export interface VerifiedKnowledgeProvider {
  listVerifiedChunks(
    scope: VerifiedKnowledgeScope,
  ): Promise<readonly KnowledgeChunk[]>;
}

export class StaticVerifiedKnowledgeProvider
implements VerifiedKnowledgeProvider {
  constructor(
    private readonly chunks: readonly KnowledgeChunk[] = lubeckKnowledgeChunks,
  ) {}

  async listVerifiedChunks(
    scope: VerifiedKnowledgeScope,
  ): Promise<readonly KnowledgeChunk[]> {
    return this.chunks.filter((chunk) =>
      chunk.citySlug === scope.citySlug &&
      chunk.placeSlug === scope.placeSlug &&
      chunk.locale === scope.locale
    );
  }
}

export class DatabaseVerifiedKnowledgeProvider
implements VerifiedKnowledgeProvider {
  async listVerifiedChunks(
    scope: VerifiedKnowledgeScope,
  ): Promise<readonly KnowledgeChunk[]> {
    const rows = await getDb()
      .select({
        id: verifiedKnowledgeChunksTable.id,
        citySlug: citiesTable.slug,
        placeSlug: placesTable.slug,
        locale: verifiedKnowledgeChunksTable.locale,
        text: verifiedKnowledgeChunksTable.text,
        topics: verifiedKnowledgeChunksTable.topics,
        priority: verifiedKnowledgeChunksTable.priority,
        sourcePublisher: contentSourcesTable.publisher,
        sourceTitle: contentSourcesTable.title,
        sourceUrl: contentSourcesTable.canonicalUrl,
        sourceVerifiedAt: contentSourcesTable.verifiedAt,
      })
      .from(verifiedKnowledgeChunksTable)
      .innerJoin(
        placesTable,
        eq(verifiedKnowledgeChunksTable.placeId, placesTable.id),
      )
      .innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
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
      .where(
        and(
          eq(citiesTable.slug, scope.citySlug),
          eq(placesTable.slug, scope.placeSlug),
          eq(verifiedKnowledgeChunksTable.locale, scope.locale),
          eq(verifiedKnowledgeChunksTable.isActive, true),
        ),
      );

    return rows.flatMap((row): KnowledgeChunk[] => {
      if (row.locale !== scope.locale) return [];

      return [{
        id: row.id,
        citySlug: row.citySlug,
        placeSlug: row.placeSlug,
        locale: scope.locale,
        text: row.text,
        topics: row.topics,
        priority: row.priority,
        source: {
          label: `${row.sourcePublisher} — ${row.sourceTitle}`,
          url: row.sourceUrl,
          type: "reference",
          verifiedAt: row.sourceVerifiedAt,
        },
      }];
    });
  }
}

class CombinedVerifiedKnowledgeProvider
implements VerifiedKnowledgeProvider {
  constructor(
    private readonly providers: readonly VerifiedKnowledgeProvider[],
    private readonly tolerateProviderFailure = false,
  ) {}

  async listVerifiedChunks(
    scope: VerifiedKnowledgeScope,
  ): Promise<readonly KnowledgeChunk[]> {
    const chunkSets = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.listVerifiedChunks(scope);
        } catch (error) {
          if (!this.tolerateProviderFailure) throw error;
          if (process.env.NODE_ENV === "development") {
            console.error("Verified knowledge provider unavailable.", error);
          }
          return [];
        }
      }),
    );
    const chunks = new Map<string, KnowledgeChunk>();

    for (const chunk of chunkSets.flat()) {
      if (!chunks.has(chunk.id)) chunks.set(chunk.id, chunk);
    }

    return [...chunks.values()];
  }
}

export function getVerifiedKnowledgeProvider(
  source: ContentSource,
): VerifiedKnowledgeProvider {
  const staticProvider = new StaticVerifiedKnowledgeProvider();
  if (source === "code") return staticProvider;

  return new CombinedVerifiedKnowledgeProvider([
    staticProvider,
    new DatabaseVerifiedKnowledgeProvider(),
  ], source === "auto");
}
