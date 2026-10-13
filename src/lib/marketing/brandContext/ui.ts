import type { BrandContext, RawBusinessBrief } from "@marketing/core";

export type BrandActionResult = { ok: true; projectId?: string; contextId?: string; revision?: number } | { ok: false; code: "INVALID" | "FORBIDDEN" | "STALE_REVISION" | "UNAVAILABLE"; message: string; fields?: string[] };
export type BrandAction = (input: unknown) => Promise<BrandActionResult>;
export const emptyBrief = (): RawBusinessBrief => ({ rawText: "", identity: { name: "" }, offerings: [], targetAudiences: [], marketingGoals: [], tone: { voice: [], avoid: [], forbiddenClaims: [] }, markets: [], languages: [], provenance: [], facts: [], hypotheses: [], missingInformation: [] });
// A correction is declared input again. Remove only generated evidence, never invent approvals.
export function correctionBrief(context: BrandContext): RawBusinessBrief {
  return { rawText: context.rawText, identity: context.identity, offerings: context.offerings, targetAudiences: context.targetAudiences, marketingGoals: context.marketingGoals, tone: context.tone, markets: context.markets, languages: context.languages,
    provenance: context.provenance.filter(p => p.id !== context.briefSourceId), facts: context.facts.map(({ id, statement, basis, provenanceIds }) => ({ id, statement, basis, provenanceIds: provenanceIds.filter(p => p !== context.briefSourceId) })), hypotheses: context.hypotheses.map(h => ({ ...h, provenanceIds: h.provenanceIds.filter(p => p !== context.briefSourceId) })), missingInformation: context.missingInformation };
}
