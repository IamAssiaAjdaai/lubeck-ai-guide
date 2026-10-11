import type { GuideKnowledgeItem, ParsedGuideAnswer } from "@/lib/guideKnowledge.server";

/**
 * Narrow fail-closed guard for unsupported four-digit years in grounded AI answers.
 * This is NOT semantic entailment: it does not verify other facts, nor whether a
 * year is attributed to the correct event. Source IDs alone are not proof.
 */
export function hasUnsupportedYear(
  answer: ParsedGuideAnswer,
  evidence: readonly GuideKnowledgeItem[],
): boolean {
  if (answer.groundingStatus !== "grounded") return false;
  const ids = new Set(answer.usedChunkIds);
  const citedText = evidence
    .filter((item) => ids.has(item.retrieved.chunk.id))
    .map((item) => item.retrieved.chunk.text)
    .join(" ");
  const years = (text: string) =>
    [...text.matchAll(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g)].map((m) => m[0]);
  const supported = new Set(years(citedText));
  // Questions are not asserted historical facts. Split only at question
  // boundaries, preserving the preceding statement and the following one.
  // Other sentences (including contextual dates) remain fail-closed.
  const assertions = answer.answer
    .split(/(?<=\?)\s+/)
    .filter((sentence) => !sentence.trim().endsWith("?"));
  return years(assertions.join(" ")).some((year) => !supported.has(year));
}
