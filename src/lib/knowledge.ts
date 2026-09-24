import type {
  PlaceSource,
} from "@/data/placeSources";

import type {
  Locale,
} from "@/lib/i18n";

export type KnowledgeChunk =
  Readonly<{
    id: string;

    citySlug: string;

    placeSlug: string;

    locale: Locale;

    text: string;

    topics: readonly string[];

    /*
     * Higher means this chunk is more
     * useful for generic questions such
     * as "Why is this place important?".
     */
    priority: number;

    /*
     * Provenance is attached directly
     * to every factual chunk.
     */
    source: PlaceSource;
  }>;

export type KnowledgeQuery =
  Readonly<{
    citySlug: string;

    placeSlug: string;

    locale: Locale;

    question: string;

    limit?: number;
  }>;

export type RetrievedKnowledge =
  Readonly<{
    chunk: KnowledgeChunk;

    score: number;
  }>;
