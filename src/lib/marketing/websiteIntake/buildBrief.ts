
import {
  rawBusinessBriefSchema,
} from "@marketing/core";

import type {
  WebsiteIntakeResult,
} from "./types";

import { websiteIntakeSchema } from "./contracts";
import type { BrandBriefAdapter } from "@marketing/core";

import { validateSourceUrls } from "./validateSourceUrls";

export function buildWebsiteBrief(
  website: WebsiteIntakeResult,
  businessName: string,
) {
    // Keep the original explicit error for existing callers.
    if (website.facts?.some(fact => typeof fact.evidence === "string" && !fact.evidence.trim())) throw new Error("Missing fact evidence");
    website = websiteIntakeSchema.parse(website);
    validateSourceUrls(website);

    for (const fact of website.facts) {
    if (!fact.evidence.trim()) {
        throw new Error("Missing fact evidence");
    }
    }

    const websiteUrl = new URL(website.websiteUrl);

    if (
    websiteUrl.protocol !== "https:" ||
    websiteUrl.username ||
    websiteUrl.password
    ) {
    throw new Error("Invalid website URL");
    }

    for (const fact of website.facts) {
    const sourceUrl = new URL(fact.sourceUrl);

    if (
        sourceUrl.protocol !== "https:" ||
        sourceUrl.origin !== websiteUrl.origin ||
        sourceUrl.username ||
        sourceUrl.password
    ) {
        throw new Error("Invalid fact source");
    }
    }
  
  const provenance = website.facts.map((fact, index) => ({
    id: `website-source-${index + 1}`,
    kind: "website" as const,
    label: `Website page ${index + 1}`,
    locator: fact.sourceUrl,
    observedAt: website.fetchedAt,
  }));

  const brief = rawBusinessBriefSchema.parse({
    rawText: `Website submitted: ${website.websiteUrl}`,
    identity: {
      name: businessName,
      website: website.websiteUrl,
    },
    provenance,
    facts: website.facts.map((fact, index) => ({
      id: fact.id,
      statement: fact.statement,
      basis: "source_backed" as const,
      provenanceIds: [provenance[index].id],
    })),
  });

  const evidence = website.facts.map((fact) => ({
    factId: fact.id,
    snippet: fact.evidence,
  }));

  return { brief, evidence };
}

export const websiteBriefAdapter: BrandBriefAdapter<{ website: WebsiteIntakeResult; businessName: string }> = {
  kind: "website",
  normalize: ({ website, businessName }) => buildWebsiteBrief(website, businessName).brief,
};
