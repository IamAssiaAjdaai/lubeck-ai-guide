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