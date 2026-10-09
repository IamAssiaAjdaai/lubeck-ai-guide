import type { AiContentQaInput } from "@/lib/contentQa/aiReview";

/**
 * A verified knowledge chunk is authoritative only inside the matching
 * published place, city, English knowledge locale and current source window.
 *
 * Marketing copy, source-link rows alone, and publication do not grant trust.
 */
export type MarketingTrustedChunkRow = Readonly<{
  id: string;
  cityId: number;
  placeId: number;
  publicationStatus: string;
  locale: string;
  isActive: boolean;
  text: string;
  sourceId: number;
  publisher: string;
  sourceTitle: string;
  verifiedAt: string;
  validUntil: string | null;
}>;

export type MarketingQaEvidence = Pick<
  AiContentQaInput,
  "allowedFactIds" | "verifiedFacts" | "sourceReferences"
>;

const MAX_FACTS = 6;
const MAX_FACT_CHARACTERS = 700;
const MAX_SOURCE_LABEL_CHARACTERS = 140;

/** Security-in-depth projection; a malformed or expired source is not included. */
export function projectVerifiedMarketingEvidence(
  candidates: readonly MarketingTrustedChunkRow[],
  scope: Readonly<{ cityId: number; placeId: number; today: string }>,
): MarketingQaEvidence {
  const facts: NonNullable<MarketingQaEvidence["verifiedFacts"]>[number][] = [];
  const sources = new Map<string, { id: string; label: string }>();
  const usedFacts = new Set<string>();

  for (const item of candidates) {
    if (facts.length >= MAX_FACTS) break;
    if (
      item.cityId !== scope.cityId ||
      item.placeId !== scope.placeId ||
      item.publicationStatus !== "published" ||
      item.locale !== "en" ||
      !item.isActive ||
      !Number.isSafeInteger(item.sourceId) ||
      item.sourceId <= 0 ||
      typeof item.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(item.id) ||
      usedFacts.has(item.id) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.verifiedAt) ||
      item.verifiedAt > scope.today ||
      (item.validUntil !== null &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(item.validUntil) ||
          item.validUntil < scope.today))
    ) continue;

    const statement = item.text.trim();
    if (!statement || statement.length > MAX_FACT_CHARACTERS) continue;
    const sourceId = "source:" + item.sourceId;
    const label = (item.publisher.trim() + " — " + item.sourceTitle.trim()).slice(
      0,
      MAX_SOURCE_LABEL_CHARACTERS,
    );
    if (!item.publisher.trim() || !item.sourceTitle.trim()) continue;

    sources.set(sourceId, { id: sourceId, label });
    facts.push({ id: item.id, statement, sourceReferenceIds: [sourceId] });
    usedFacts.add(item.id);
  }

  return {
    allowedFactIds: facts.map((item) => item.id),
    verifiedFacts: facts,
    sourceReferences: [...sources.values()],
  };
}
