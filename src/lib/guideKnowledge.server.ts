import type {
  LubeckPlaceSlug,
} from "@/data/places";

import type {
  RetrievedKnowledge,
} from "@/lib/knowledge";

import {
  retrieveVerifiedKnowledge,
} from "@/lib/knowledgeRetriever.server";

export const GUIDE_KNOWLEDGE_SOURCE_LOCALE =
  "en" as const;

export type GuideKnowledgeRole =
  | "current"
  | "visited";

export type GuideKnowledgeItem =
  Readonly<{
    role: GuideKnowledgeRole;

    placeSlug: LubeckPlaceSlug;

    retrieved: RetrievedKnowledge;
  }>;

export type GuideSourceMetadata =
  Readonly<{
      label: string;

      url: string;

      verifiedAt: string;

      placeSlug: LubeckPlaceSlug;

      chunkIds:
        readonly string[];
}>;

export function retrieveGuideKnowledge({
  currentPlaceSlug,
  visitedPlaceSlugs,
  question,
}: {
  currentPlaceSlug: LubeckPlaceSlug;

  visitedPlaceSlugs:
    readonly LubeckPlaceSlug[];

  question: string;
}): readonly GuideKnowledgeItem[] {
  const currentKnowledge =
    retrieveVerifiedKnowledge({
      city: "lubeck",

      placeSlug:
        currentPlaceSlug,

      /*
       * RAG v1 uses English
       * source chunks.
       *
       * The model may still answer
       * in the visitor's locale.
       */
      locale:
        GUIDE_KNOWLEDGE_SOURCE_LOCALE,

      question,

      limit: 2,
    }).map(
      (retrieved) => ({
        role:
          "current" as const,

        placeSlug:
          currentPlaceSlug,

        retrieved,
      }),
    );

  const uniqueVisited =
    Array.from(
      new Set(
        visitedPlaceSlugs,
      ),
    ).filter(
      (slug) =>
        slug !==
        currentPlaceSlug,
    );

  const visitedKnowledge =
    uniqueVisited.flatMap(
      (placeSlug) =>
        retrieveVerifiedKnowledge({
          city: "lubeck",

          placeSlug,

          locale:
            GUIDE_KNOWLEDGE_SOURCE_LOCALE,

          question,

          limit: 2,
        }).map(
          (retrieved) => ({
            role:
              "visited" as const,

            placeSlug,

            retrieved,
          }),
        ),
    );

  return [
    ...currentKnowledge,
    ...visitedKnowledge,
  ];
}

export function buildGuideSourceMetadata(
  knowledge:
    readonly GuideKnowledgeItem[],
): readonly GuideSourceMetadata[] {
  const grouped =
    new Map<
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
    const source =
      item.retrieved.chunk.source;

    const key =
      `${item.placeSlug}:${source.url}`;

    const existing =
      grouped.get(key);

    if (existing) {
      if (
        !existing.chunkIds.includes(
          item.retrieved.chunk.id,
        )
      ) {
        existing.chunkIds.push(
          item.retrieved.chunk.id,
        );
      }

      continue;
    }

    grouped.set(
      key,
      {
        label:
          source.label,

        url:
          source.url,

        verifiedAt:
          source.verifiedAt,

        placeSlug:
          item.placeSlug,

        chunkIds: [
          item.retrieved.chunk.id,
        ],
      },
    );
  }

  return Array.from(
    grouped.values(),
  ).map(
    (source) => ({
      ...source,

      chunkIds: [
        ...source.chunkIds,
      ],
    }),
  );
}