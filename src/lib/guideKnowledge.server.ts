import type { LubeckPlaceSlug } from "@/data/places";

import type { RetrievedKnowledge } from "@/lib/knowledge";

import { retrieveVerifiedKnowledge } from "@/lib/knowledgeRetriever.server";

export const GUIDE_KNOWLEDGE_SOURCE_LOCALE = "en" as const;

export type GuideKnowledgeRole = "current" | "visited";

export type GuideKnowledgeItem = Readonly<{
  role: GuideKnowledgeRole;

  placeSlug: LubeckPlaceSlug;

  retrieved: RetrievedKnowledge;
}>;

export type GuideSourceMetadata = Readonly<{
  label: string;

  url: string;

  verifiedAt: string;

  placeSlug: LubeckPlaceSlug;

  chunkIds: readonly string[];
}>;

export type ParsedGuideAnswer = Readonly<{
  answer: string;

  usedChunkIds: readonly string[];
}>;

const SOURCE_MARKER_PATTERN = /\n*\[\[SOURCES:([^\]]*)\]\]\s*$/i;

export function buildGuideSourceMetadata(
  knowledge:
      readonly GuideKnowledgeItem[],

  usedChunkIds:
    readonly string[],
): readonly GuideSourceMetadata[] {
  const usedChunkIdSet =
    new Set(usedChunkIds);

  const grouped = new Map<
    string,
    {
      label: string;
      url: string;
      verifiedAt: string;
      placeSlug: LubeckPlaceSlug;
      chunkIds: string[];
    }
  >();

  for (const item of knowledge) {
    const chunkId = item.retrieved.chunk.id;

   if (
      !usedChunkIdSet.has(
        chunkId,
      )
    ) {
      continue;
    }
    const source = item.retrieved.chunk.source;

    const key = `${item.placeSlug}:${source.url}`;

    const existing = grouped.get(key);

    if (existing) {
      if (!existing.chunkIds.includes(chunkId)) {
        existing.chunkIds.push(chunkId);
      }

      continue;
    }

    grouped.set(key, {
      label: source.label,

      url: source.url,

      verifiedAt: source.verifiedAt,

      placeSlug: item.placeSlug,

      chunkIds: [chunkId],
    });
  }

  return Array.from(grouped.values()).map((source) => ({
    ...source,

    chunkIds: [...source.chunkIds],
  }));
}
export function parseGuideAnswerAttribution(
  rawAnswer: string,
  knowledge: readonly GuideKnowledgeItem[],
): ParsedGuideAnswer {
  const match = rawAnswer.match(SOURCE_MARKER_PATTERN);

  if (!match) {
    return {
      answer: rawAnswer.trim(),

      usedChunkIds: [],
    };
  }

  const answer = rawAnswer.replace(SOURCE_MARKER_PATTERN, "").trim();

  const allowedChunkIds = new Set(
    knowledge.map((item) => item.retrieved.chunk.id),
  );

  const requestedChunkIds = match[1]
    .split(",")
    .map((chunkId) => chunkId.trim())
    .filter(Boolean);

  const usedChunkIds = Array.from(
    new Set(
      requestedChunkIds.filter((chunkId) => allowedChunkIds.has(chunkId)),
    ),
  );

  return {
    answer,
    usedChunkIds,
  };
}
export function retrieveGuideKnowledge({
  currentPlaceSlug,
  visitedPlaceSlugs,
  question,
}: {
  currentPlaceSlug: LubeckPlaceSlug;

  visitedPlaceSlugs: readonly LubeckPlaceSlug[];

  question: string;
}): readonly GuideKnowledgeItem[] {
  const currentKnowledge = retrieveVerifiedKnowledge({
    city: "lubeck",

    placeSlug: currentPlaceSlug,

    /*
     * RAG v1 uses English
     * source chunks.
     *
     * The model may still answer
     * in the visitor's locale.
     */
    locale: GUIDE_KNOWLEDGE_SOURCE_LOCALE,

    question,

    limit: 2,
  }).map((retrieved) => ({
    role: "current" as const,

    placeSlug: currentPlaceSlug,

    retrieved,
  }));

  const uniqueVisited = Array.from(new Set(visitedPlaceSlugs)).filter(
    (slug) => slug !== currentPlaceSlug,
  );

  const visitedKnowledge = uniqueVisited.flatMap((placeSlug) =>
    retrieveVerifiedKnowledge({
      city: "lubeck",

      placeSlug,

      locale: GUIDE_KNOWLEDGE_SOURCE_LOCALE,

      question,

      limit: 2,
    }).map((retrieved) => ({
      role: "visited" as const,

      placeSlug,

      retrieved,
    })),
  );

  return [...currentKnowledge, ...visitedKnowledge];
}
