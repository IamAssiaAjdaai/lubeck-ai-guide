
import { describe, expect, it } from "vitest";

import {
  createBrandContext,
  getApprovedBrandFacts,
} from "@marketing/core";

import { buildWebsiteBrief } from "./buildBrief";
import type { WebsiteIntakeResult } from "./types";

// Synthetic company for testing only.
const sampleWebsite: WebsiteIntakeResult = {
  websiteUrl: "https://glanz.example",
  title: "Glanz Reinigung",
  fetchedAt: "2026-10-21T09:00:00Z",

  facts: [
    {
      id: "office-cleaning",
      statement: "Glanz bietet Büroreinigung an.",
      sourceUrl: "https://glanz.example/leistungen",
      evidence: "Wir bieten Büroreinigung an.",
    },
    {
      id: "window-cleaning",
      statement: "Glanz bietet Fensterreinigung an.",
      sourceUrl: "https://glanz.example/leistungen",
      evidence: "Unsere Leistungen: Fensterreinigung.",
    },
    {
      id: "location",
      statement: "Glanz ist in Düsseldorf tätig.",
      sourceUrl: "https://glanz.example/kontakt",
      evidence: "Unser Einsatzgebiet ist Düsseldorf.",
    },
  ],
};

describe("buildWebsiteBrief", () => {
  it("creates proposed facts with source references", () => {
    const result = buildWebsiteBrief(
      sampleWebsite,
      "Glanz Reinigung",
    );

    expect(result.brief.identity.name).toBe(
      "Glanz Reinigung",
    );

    expect(result.brief.facts).toHaveLength(3);
    expect(result.brief.provenance).toHaveLength(3);
    expect(result.evidence).toHaveLength(3);

    expect(result.brief.facts[0].basis).toBe(
      "source_backed",
    );

    expect(result.brief.facts[0].provenanceIds).toEqual([
      result.brief.provenance[0].id,
    ]);

    expect(result.evidence[0].snippet).toBe(
      "Wir bieten Büroreinigung an.",
    );
  });

  it("never confirms imported facts automatically", () => {
    const result = buildWebsiteBrief(
      sampleWebsite,
      "Glanz Reinigung",
    );

    const context = createBrandContext(result.brief, {
      projectId: "test-project",
      contextId: "test-context",
      briefSourceId: "manual-brief",
      createdAt: "2026-10-21T10:00:00Z",
    });

    expect(getApprovedBrandFacts(context)).toEqual([]);

    expect(
      context.facts.every(
        (fact) => fact.confirmation === null,
      ),
    ).toBe(true);
  });


  it("rejects facts from a different website", () => {
    const invalidWebsite: WebsiteIntakeResult = {
        ...sampleWebsite,
        facts: [
        {
            ...sampleWebsite.facts[0],
            sourceUrl: "https://other.example/leistungen",
        },
        ],
    };

    expect(() => {
        buildWebsiteBrief(invalidWebsite, "Glanz Reinigung");
    }).toThrow();
    });

    it.each([
    ["HTTP website", "http://glanz.example"],
    ["Different domain", "https://other.example"],
    ["HTTP source", "http://glanz.example/leistungen"],
    ["URL credentials", "https://user:pass@glanz.example/leistungen"],
    ])("rejects %s", (_label, url) => {
    const invalidWebsite: WebsiteIntakeResult = {
        ...sampleWebsite,
        facts: [
        {
            ...sampleWebsite.facts[0],
            sourceUrl: url,
        },
        ],
    };

    expect(() =>
        buildWebsiteBrief(invalidWebsite, "Glanz Reinigung"),
    ).toThrow();
    });

    it.each(["", "   ", "\n\t"])(
    "rejects empty evidence: %j",
    (evidence) => {
        const invalidWebsite: WebsiteIntakeResult = {
        ...sampleWebsite,
        facts: [
            {
            ...sampleWebsite.facts[0],
            evidence,
            },
        ],
        };

        expect(() =>
        buildWebsiteBrief(
            invalidWebsite,
            "Glanz Reinigung",
        ),
        ).toThrow("Missing fact evidence");
    },
    );

});
