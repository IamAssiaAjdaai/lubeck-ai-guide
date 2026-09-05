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

export type GuideGroundingStatus =
  | "grounded"
  | "insufficient_evidence";

export type ParsedGuideAnswer = Readonly<{
  answer: string;

  groundingStatus: GuideGroundingStatus;

  usedChunkIds: readonly string[];
}>;

export const GUIDE_RESPONSE_FORMAT = {
  type: "json_schema",

  json_schema: {
    name: "citywalk_guide_answer",

    strict: true,

    schema: {
      type: "object",

      properties: {
        answer: {
          type: "string",
        },

        groundingStatus: {
          type: "string",

          enum: [
            "grounded",
            "insufficient_evidence",
          ],
        },

        usedChunkIds: {
          type: "array",

          items: {
            type: "string",
          },
        },
      },

      required: [
        "answer",
        "groundingStatus",
        "usedChunkIds",
      ],

      additionalProperties: false,
    },
  },
} as const;

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
export function parseGuideStructuredAnswer(
  rawAnswer: string,
  knowledge: readonly GuideKnowledgeItem[],
): ParsedGuideAnswer | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawAnswer);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("answer" in parsed) ||
    typeof parsed.answer !== "string" ||
    !parsed.answer.trim() ||
    !("groundingStatus" in parsed) ||
    (parsed.groundingStatus !== "grounded" &&
      parsed.groundingStatus !== "insufficient_evidence") ||
    !("usedChunkIds" in parsed) ||
    !Array.isArray(parsed.usedChunkIds) ||
    !parsed.usedChunkIds.every(
      (chunkId) => typeof chunkId === "string",
    )
  ) {
    return null;
  }

  const allowedChunkIds = new Set(
    knowledge.map((item) => item.retrieved.chunk.id),
  );

  const usedChunkIds = Array.from(
    new Set(
      parsed.usedChunkIds.filter((chunkId) => allowedChunkIds.has(chunkId)),
    ),
  );

  return {
    answer: parsed.answer.trim(),

    groundingStatus: parsed.groundingStatus,

    usedChunkIds:
      parsed.groundingStatus === "grounded"
        ? usedChunkIds
        : [],
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
