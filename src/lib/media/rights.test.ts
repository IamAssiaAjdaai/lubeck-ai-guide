import { describe, expect, it } from "vitest";

import {
  assertMediaRightsCanBeVerified,
  getMediaRightsStatus,
  isMediaRightsCleared,
  parseMediaRightsInput,
} from "@/lib/media/rights";

const completeRights = {
  rightsBasis: "licensed" as const,
  creator: "Example Photographer",
  rightsHolder: "Example Archive",
  attributionRequired: true,
  attributionText: "Photo: Example Photographer / Example Archive",
  evidenceReference: "Contract CMS-2026-14",
};

describe("media rights provenance", () => {
  it("does not clear an asset without a rights record", () => {
    expect(getMediaRightsStatus(undefined)).toBe("unverified");
    expect(isMediaRightsCleared(undefined)).toBe(false);
  });

  it("keeps incomplete metadata uncleared", () => {
    const incomplete = {
      ...completeRights,
      creator: undefined,
      rightsHolder: undefined,
      evidenceReference: undefined,
    };

    expect(getMediaRightsStatus(incomplete)).toBe("incomplete");
    expect(isMediaRightsCleared(incomplete)).toBe(false);
    expect(() => assertMediaRightsCanBeVerified(incomplete)).toThrow(
      /rights_evidence_missing.*creator_or_rights_holder_missing/,
    );
  });

  it("clears complete evidence only after server verification", () => {
    expect(getMediaRightsStatus(completeRights)).toBe("unverified");
    expect(isMediaRightsCleared({
      ...completeRights,
      verifiedAt: new Date("2026-09-11T12:00:00.000Z"),
      verifiedByUserId: "reviewer-1",
    })).toBe(true);
  });

  it("does not allow required attribution to be empty", () => {
    const rights = { ...completeRights, attributionText: undefined };
    expect(getMediaRightsStatus(rights)).toBe("incomplete");
    expect(() => assertMediaRightsCanBeVerified(rights)).toThrow(
      /required_attribution_missing/,
    );
  });

  it("requires explanatory notes for the other basis", () => {
    expect(() => assertMediaRightsCanBeVerified({
      ...completeRights,
      rightsBasis: "other",
      rightsNotes: undefined,
    })).toThrow(/other_rights_basis_notes_missing/);
  });

  it("normalizes editor input without accepting a clearance assertion", () => {
    expect(parseMediaRightsInput({
      rightsBasis: "owned",
      creator: "  CITYWALK  ",
      attributionRequired: false,
      evidenceReference: "  Internal asset register 42  ",
    })).toEqual({
      rightsBasis: "owned",
      creator: "CITYWALK",
      rightsHolder: undefined,
      attributionRequired: false,
      attributionText: undefined,
      evidenceReference: "Internal asset register 42",
      rightsNotes: undefined,
    });
  });

  it("accepts internal evidence references but rejects malformed or unsafe URLs", () => {
    expect(parseMediaRightsInput({
      rightsBasis: "licensed",
      creator: "CITYWALK",
      attributionRequired: false,
      evidenceReference: "Contract CMS-2026-14",
    }).evidenceReference).toBe("Contract CMS-2026-14");

    expect(() => parseMediaRightsInput({
      rightsBasis: "licensed",
      creator: "CITYWALK",
      attributionRequired: false,
      evidenceReference: "https://",
    })).toThrow(/valid HTTP or HTTPS URL/);
    expect(() => parseMediaRightsInput({
      rightsBasis: "licensed",
      creator: "CITYWALK",
      attributionRequired: false,
      evidenceReference: "ftp://example.com/license",
    })).toThrow(/valid HTTP or HTTPS URL/);
  });
});
