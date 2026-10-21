import { rawBusinessBriefSchema, redactObviousCredentials, type BrandBriefAdapter } from "@marketing/core";
import type { WebsiteIntakeResult } from "./types";
import { websiteIntakeSchema } from "./contracts";
import { validateSourceUrls } from "./validateSourceUrls";

export function buildWebsiteBrief(website: WebsiteIntakeResult, businessName: string) {
  // Retain the existing public error contract.
  if (website.facts?.some(fact => typeof fact.evidence === "string" && !fact.evidence.trim())) {
    throw new Error("Missing fact evidence");
  }
  website = websiteIntakeSchema.parse(website);
  validateSourceUrls(website);
  const provenance = website.facts.map((fact, index) => ({
    id: `website-source-${index + 1}`,
    kind: "website" as const,
    label: `Website page ${index + 1}`,
    locator: fact.sourceUrl,
    observedAt: website.fetchedAt,
  }));
  const brief = rawBusinessBriefSchema.parse({
    rawText: `Website submitted: ${website.websiteUrl}`,
    identity: { name: businessName, website: website.websiteUrl },
    provenance,
    facts: website.facts.map((fact, index) => ({
      id: fact.id, statement: fact.statement, basis: "source_backed" as const,
      provenanceIds: [provenance[index].id],
    })),
  });
  const evidence = website.facts.map(fact => ({ factId: fact.id, snippet: redactObviousCredentials(fact.evidence) }));
  return { brief, evidence };
}

export const websiteBriefAdapter: BrandBriefAdapter<{ website: WebsiteIntakeResult; businessName: string }> = {
  kind: "website",
  normalize: ({ website, businessName }) => buildWebsiteBrief(website, businessName).brief,
};
