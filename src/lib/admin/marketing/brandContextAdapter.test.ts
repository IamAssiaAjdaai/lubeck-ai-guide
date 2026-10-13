import { describe, expect, it } from "vitest";
import { getApprovedBrandFacts } from "@marketing/core";

import { citywalkBrief } from "../../../../packages/marketing-core/tests/fixtures";
import { createCitywalkCampaignBrandContext } from "./brandContextAdapter";

const campaign = {
  id: 7,
  cityId: 21,
  name: "Weekend city launch",
  objective: "Encourage first walks",
  audience: "Weekend visitors",
  message: "Explore at your own pace",
  cta: "Build your walk",
};
const metadata = {
  contextId: "context-001",
  projectId: "customer-001",
  briefSourceId: "brief-001",
  createdAt: "2026-10-13T10:00:00Z",
};

describe("CITYWALK Brand Context adapter", () => {
  it("keeps host scope outside the generic contract and maps no CMS claims to approval", () => {
    const before = structuredClone(campaign);
    const { context, citywalkScope } = createCitywalkCampaignBrandContext({ campaign, businessBrief: citywalkBrief }, metadata);
    expect(campaign).toEqual(before);
    expect(citywalkScope).toEqual({ cityId: 21, campaignId: 7 });
    expect(context.projectId).toBe("customer-001");
    expect(JSON.stringify(context)).not.toContain('"cityId"');
    expect(JSON.stringify(context)).not.toContain('"campaignId"');
    expect(context.marketingGoals).toContainEqual({ id: "citywalk-campaign:7:goal", description: campaign.objective, cta: campaign.cta });
    expect(context.hypotheses.filter((item) => item.id.startsWith("citywalk-campaign:"))).toHaveLength(2);
    expect(context.provenance).toContainEqual({ id: "citywalk-campaign:7", kind: "manual", label: campaign.name });
    expect(getApprovedBrandFacts(context)).toEqual([]);
    expect(context.facts).toHaveLength(citywalkBrief.facts!.length);
  });

  it("supports another city/campaign within the same generic project", () => {
    const { context, citywalkScope } = createCitywalkCampaignBrandContext({ campaign: { ...campaign, id: 8, cityId: 22 }, businessBrief: citywalkBrief }, metadata);
    expect(context.projectId).toBe(metadata.projectId);
    expect(citywalkScope).toEqual({ cityId: 22, campaignId: 8 });
  });

  it("rejects malformed host scope and reserved campaign source IDs", () => {
    expect(() => createCitywalkCampaignBrandContext({ campaign: { ...campaign, cityId: -1 }, businessBrief: citywalkBrief }, metadata)).toThrow("Invalid campaign scope");
    expect(() => createCitywalkCampaignBrandContext({ campaign, businessBrief: { ...citywalkBrief, provenance: [{ id: "citywalk-campaign:7", kind: "manual", label: "Forged" }] } }, metadata)).toThrow();
  });
});
