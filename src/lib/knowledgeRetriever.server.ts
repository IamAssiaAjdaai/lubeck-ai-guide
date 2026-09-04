import {
  lubeckKnowledgeChunks,
} from "@/data/knowledge/lubeck";

import type {
  KnowledgeChunk,
  KnowledgeQuery,
  RetrievedKnowledge,
} from "@/lib/knowledge";

const STOP_WORDS =
  new Set([
    "the",
    "a",
    "an",
    "is",
    "it",
    "this",
    "that",
    "was",
    "were",
    "are",
    "why",
    "what",
    "how",
    "when",
    "where",
    "who",
    "of",
    "to",
    "for",
    "and",
    "or",
    "in",
    "on",
    "at",
    "about",
    "place",
  ]);

function tokenize(
  value: string,
): readonly string[] {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .split(/\s+/)
    .map((token) =>
      token.trim(),
    )
    .filter(
      (token) =>
        token.length >= 2 &&
        !STOP_WORDS.has(token),
    );
}

function scoreChunk(
  questionTokens:
    ReadonlySet<string>,

  chunk: KnowledgeChunk,
): number {
  const contentTokens =
    new Set(
      tokenize(
        [
          chunk.text,
          ...chunk.topics,
        ].join(" "),
      ),
    );

  let score = 0;

  for (
    const token
    of questionTokens
  ) {
    if (
      contentTokens.has(token)
    ) {
      score += 1;
    }
  }

  /*
   * Topic matches have more weight
   * than ordinary word overlap.
   */
  for (
    const topic
    of chunk.topics
  ) {
    const topicTokens =
      tokenize(topic);

    if (
      topicTokens.some(
        (token) =>
          questionTokens.has(
            token,
          ),
      )
    ) {
      score += 2;
    }
  }

  return score;
}

function normalizeLimit(
  limit: number | undefined,
): number {
  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit)
  ) {
    return 2;
  }

  return Math.min(
    5,
    Math.max(
      1,
      Math.floor(limit),
    ),
  );
}

export function retrieveVerifiedKnowledge(
  query: KnowledgeQuery,

  chunks:
    readonly KnowledgeChunk[] =
      lubeckKnowledgeChunks,
): readonly RetrievedKnowledge[] {
  /*
   * Security / grounding boundary:
   * filter authoritative dimensions
   * BEFORE semantic relevance.
   */
  const candidates =
    chunks.filter(
      (chunk) =>
        chunk.city ===
          query.city &&
        chunk.placeSlug ===
          query.placeSlug &&
        chunk.locale ===
          query.locale,
    );

  if (
    candidates.length === 0
  ) {
    return [];
  }

  const questionTokens =
    new Set(
      tokenize(
        query.question,
      ),
    );

  const ranked =
    candidates
      .map((chunk) => ({
        chunk,
        score: scoreChunk(
          questionTokens,
          chunk,
        ),
      }))
      .sort(
        (left, right) =>
          right.score -
            left.score ||
          right.chunk.priority -
            left.chunk
              .priority ||
          left.chunk.id.localeCompare(
            right.chunk.id,
          ),
      );

  const hasRelevantMatch =
    ranked.some(
      (item) =>
        item.score > 0,
    );

  const limit =
    normalizeLimit(
      query.limit,
    );

  /*
   * Generic questions such as
   * "Why is it famous?" may have
   * no useful lexical overlap.
   *
   * Because place/city/locale were
   * already strictly filtered, the
   * highest-priority curated chunks
   * are a safe fallback.
   */
  if (!hasRelevantMatch) {
    return [...ranked]
      .sort(
        (left, right) =>
          right.chunk.priority -
            left.chunk
              .priority ||
          left.chunk.id.localeCompare(
            right.chunk.id,
          ),
      )
      .slice(0, limit);
  }

  return ranked
    .filter(
      (item) =>
        item.score > 0,
    )
    .slice(0, limit);
}