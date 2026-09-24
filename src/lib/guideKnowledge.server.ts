import type { KnowledgeChunk, RetrievedKnowledge } from "@/lib/knowledge";

import { retrieveVerifiedKnowledge } from "@/lib/knowledgeRetriever.server";
import type { VerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

export const GUIDE_KNOWLEDGE_SOURCE_LOCALE = "en" as const;

export type GuideKnowledgeRole = "current" | "visited";

export type GuideKnowledgeItem = Readonly<{
  role: GuideKnowledgeRole;

  citySlug: string;

  placeSlug: string;

  retrieved: RetrievedKnowledge;
}>;

export type GuideSourceMetadata = Readonly<{
  label: string;

  url: string;

  verifiedAt: string;

  citySlug: string;

  placeSlug: string;

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
      citySlug: string;
      placeSlug: string;
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

    const key = `${item.citySlug}:${item.placeSlug}:${source.url}`;

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

      citySlug: item.citySlug,

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
export async function retrieveGuideKnowledge({
  citySlug,
  currentPlaceSlug,
  visitedPlaceSlugs,
  question,
  provider,
  currentTrustedChunks,
  knowledgeLocale = GUIDE_KNOWLEDGE_SOURCE_LOCALE,
}: {
  citySlug: string;

  currentPlaceSlug: string;

  visitedPlaceSlugs: readonly string[];

  question: string;

  provider: VerifiedKnowledgeProvider;

  currentTrustedChunks?: readonly KnowledgeChunk[];

  knowledgeLocale?: typeof GUIDE_KNOWLEDGE_SOURCE_LOCALE;
}): Promise<readonly GuideKnowledgeItem[]> {
  async function retrieveForPlace(placeSlug: string) {
    const chunks = placeSlug === currentPlaceSlug && currentTrustedChunks
      ? currentTrustedChunks
      : await provider.listVerifiedChunks({
          citySlug,
          placeSlug,
          locale: knowledgeLocale,
        });

    return retrieveVerifiedKnowledge(
      {
        citySlug,
        placeSlug,
        locale: knowledgeLocale,
        question,
        limit: 2,
      },
      chunks,
    );
  }

  const currentKnowledge = (await retrieveForPlace(currentPlaceSlug)).map(
    (retrieved) => ({
      role: "current" as const,
      citySlug,
      placeSlug: currentPlaceSlug,
      retrieved,
    }),
  );

  const uniqueVisited = Array.from(new Set(visitedPlaceSlugs)).filter(
    (slug) => slug !== currentPlaceSlug,
  );

  const visitedKnowledge = (
    await Promise.all(
      uniqueVisited.map(async (placeSlug) => ({
        placeSlug,
        retrieved: await retrieveForPlace(placeSlug),
      })),
    )
  ).flatMap(({ placeSlug, retrieved }) =>
    retrieved.map((item) => ({
      role: "visited" as const,
      citySlug,
      placeSlug,
      retrieved: item,
    })),
  );

  return [...currentKnowledge, ...visitedKnowledge];
}
