import {
  createBrandContextFromAdapter,
  rawBusinessBriefSchema,
  type BrandBriefAdapter,
  type IntakeMetadata,
} from "@marketing/core";

import type { MarketingCampaignRow } from "@/db/marketingSchema";

export type CitywalkCampaignBrief = Readonly<{
  campaign: Pick<MarketingCampaignRow, "id" | "cityId" | "name" | "objective" | "audience" | "message" | "cta">;
  businessBrief: unknown;
}>;

/**
 * Opt-in projection only; existing CMS paths do not call this adapter.
 * A future server caller must load the campaign and enforce city capability
 * before using it. Campaign prose never becomes an approved fact or RAG input.
 */
export const citywalkCampaignBriefAdapter: BrandBriefAdapter<CitywalkCampaignBrief> = {
  kind: "citywalk_campaign_brief",
  normalize({ campaign, businessBrief }) {
    if (!Number.isSafeInteger(campaign.id) || campaign.id <= 0 ||
        !Number.isSafeInteger(campaign.cityId) || campaign.cityId <= 0) {
      throw new Error("Invalid campaign scope");
    }
    const brief = rawBusinessBriefSchema.parse(businessBrief);
    const sourceId = `citywalk-campaign:${campaign.id}`;
    const audienceId = `${sourceId}:audience`;
    const messageId = `${sourceId}:message`;
    const goalId = `${sourceId}:goal`;
    // Reserve adapter IDs so a browser brief cannot replace host campaign data.
    if (brief.provenance.some((source) => source.id === sourceId) ||
        [...brief.facts, ...brief.hypotheses].some((item) => item.id === audienceId || item.id === messageId) ||
        brief.marketingGoals.some((goal) => goal.id === goalId)) {
      throw new Error("Reserved campaign brief identifier");
    }
    return rawBusinessBriefSchema.parse({
      ...brief,
      provenance: [...brief.provenance, {
        id: sourceId,
        kind: "manual",
        label: campaign.name,
      }],
      marketingGoals: [...brief.marketingGoals, {
        id: goalId,
        description: campaign.objective,
        cta: campaign.cta,
      }],
      hypotheses: [...brief.hypotheses, {
        id: audienceId,
        statement: campaign.audience,
        rationale: "Campaign audience assumption; requires research or human review.",
        provenanceIds: [sourceId],
      }, {
        id: messageId,
        statement: campaign.message,
        rationale: "Campaign positioning assumption; not verified business evidence.",
        provenanceIds: [sourceId],
      }],
    });
  },
};

export function createCitywalkCampaignBrandContext(
  input: CitywalkCampaignBrief,
  metadata: IntakeMetadata,
) {
  return {
    context: createBrandContextFromAdapter(citywalkCampaignBriefAdapter, input, metadata),
    citywalkScope: { cityId: input.campaign.cityId, campaignId: input.campaign.id },
  };
}
