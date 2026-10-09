import { describe, expect, it } from "vitest";

import {
  projectVerifiedMarketingEvidence,
  type MarketingTrustedChunkRow,
} from "./qaEvidence";

const scope = { cityId: 7, placeId: 21, today: "2026-10-09" } as const;
const fact: MarketingTrustedChunkRow = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  cityId: 7,
  placeId: 21,
  publicationStatus: "published",
  locale: "en",
  isActive: true,
  text: "The museum closes at 17:00.",
  sourceId: 3,
  publisher: "City museum",
  sourceTitle: "Official visitor information",
  verifiedAt: "2026-10-01",
  validUntil: "2026-12-31",
};

describe("Marketing verified place QA evidence", () => {
  it("projects explicitly verified, active English chunks with source attribution", () => {
    const result = projectVerifiedMarketingEvidence([fact], scope);
    expect(result).toEqual({
      allowedFactIds: [fact.id],
      verifiedFacts: [{
        id: fact.id,
        statement: "The museum closes at 17:00.",
        sourceReferenceIds: ["source:3"],
      }],
      sourceReferences: [{
        id: "source:3",
        label: "City museum — Official visitor information",
      }],
    });
  });

  it("rejects content belonging to another city or place", () => {
    expect(projectVerifiedMarketingEvidence([
      { ...fact, cityId: 8 },
      { ...fact, placeId: 22 },
    ], scope).verifiedFacts).toEqual([]);
  });

  it("rejects unpublished, inactive, wrong-locale, expired or future-sourced records", () => {
    const invalid: MarketingTrustedChunkRow[] = [
      { ...fact, publicationStatus: "draft" },
      { ...fact, isActive: false },
      { ...fact, locale: "de" },
      { ...fact, verifiedAt: "2026-10-10" },
      { ...fact, validUntil: "2026-10-08" },
      { ...fact, validUntil: "invalid" },
      { ...fact, verifiedAt: "invalid" },
    ];
    expect(projectVerifiedMarketingEvidence(invalid, scope).verifiedFacts).toEqual([]);
  });

  it("accepts validity through today and sources without an expiry", () => {
    expect(projectVerifiedMarketingEvidence([
      { ...fact, validUntil: "2026-10-09" },
      { ...fact, id: "123e4567-e89b-42d3-a456-426614174001", validUntil: null },
    ], scope).verifiedFacts).toHaveLength(2);
  });

  it("rejects oversized or blank facts rather than truncating unverifiable statements", () => {
    expect(projectVerifiedMarketingEvidence([
      { ...fact, text: "x".repeat(701) },
      { ...fact, text: "   " },
      { ...fact, publisher: " " },
      { ...fact, sourceTitle: "" },
    ], scope).verifiedFacts).toEqual([]);
  });

  it("deduplicates facts and sources and caps the package to six facts", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({
      ...fact,
      id: "123e4567-e89b-42d3-a456-42661417400" + i,
    }));
    const result = projectVerifiedMarketingEvidence([rows[0], ...rows], scope);
    expect(result.verifiedFacts).toHaveLength(6);
    expect(result.allowedFactIds).toHaveLength(6);
    expect(result.sourceReferences).toHaveLength(1);
  });

  it("preserves no-certification when there are no trusted facts", () => {
    const result = projectVerifiedMarketingEvidence([], scope);
    expect(result).toEqual({
      allowedFactIds: [],
      verifiedFacts: [],
      sourceReferences: [],
    });
  });
});
