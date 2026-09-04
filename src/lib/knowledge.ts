import type {
  LubeckPlaceSlug,
} from "@/data/places";

import type {
  PlaceSource,
} from "@/data/placeSources";

import type {
  Locale,
} from "@/lib/i18n";

export const KNOWLEDGE_CITIES = [
  "lubeck",
] as const;

export type KnowledgeCity =
  (typeof KNOWLEDGE_CITIES)[number];

export type KnowledgeChunk =
  Readonly<{
    id: string;

    city: KnowledgeCity;

    placeSlug: LubeckPlaceSlug;

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
    city: KnowledgeCity;

    placeSlug: LubeckPlaceSlug;

    locale: Locale;

    question: string;

    limit?: number;
  }>;

export type RetrievedKnowledge =
  Readonly<{
    chunk: KnowledgeChunk;

    score: number;
  }>;