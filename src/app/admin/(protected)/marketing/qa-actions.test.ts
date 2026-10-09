import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPage: vi.fn(),
  getSocial: vi.fn(),
  requireCity: vi.fn(),
  review: vi.fn(),
  evidence: vi.fn(),
}));

vi.mock("@/lib/admin/marketing/service.server", () => ({
  getMarketingPage: mocks.getPage,
  getMarketingContentItem: mocks.getSocial,
}));
vi.mock("@/lib/admin/authorization.server", () => ({
  AdminAuthorizationError: class extends Error {
    constructor() { super("FORBIDDEN"); }
  },
  requireCityCapability: mocks.requireCity,
}));
vi.mock("@/lib/admin/marketing/qaEvidence.server", () => ({
  loadMarketingVerifiedPlaceEvidence: mocks.evidence,
}));
vi.mock("@/lib/contentQa/groqReview.server", () => ({
  reviewContentWithGroq: mocks.review,
}));
vi.mock("@/lib/admin/permissions", () => ({
  hasCityCapability: (
    staff: { role: string; cityIds: number[] },
    cityId: number,
    capability: string,
  ) => staff.cityIds.includes(cityId) && (
    (staff.role === "content_editor" && capability === "marketing:manage") ||
    (staff.role === "reviewer_publisher" && capability === "publishing:review")
  ),
}));

import { runMarketingQaAction } from "./qa-actions";

const page = {
  id: 17,
  cityId: 3,
  kind: "landing",
  publicationStatus: "draft",
  title: "Discover Lübeck",
  body: "Plan a walk",
  cta: "Build a walk",
  seoTitle: null,
  seoDescription: null,
};
const social = {
  id: 32,
  cityId: 3,
  status: "in_review",
  platform: "instagram",
  format: "post",
  hook: "Find your next walk",
  script: "A short script",
  caption: "Explore now",
  cta: "Start a walk",
};

const context = (role: string, cityIds = [3]) => ({
  user: { id: "trusted-staff-session-id" },
  staff: { role, cityIds },
});

describe("Marketing Run QA server action permissions and saved copy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getPage.mockResolvedValue(page);
    mocks.getSocial.mockResolvedValue(social);
    mocks.requireCity.mockResolvedValue(context("content_editor"));
    mocks.evidence.mockResolvedValue({
      allowedFactIds: ["123e4567-e89b-42d3-a456-426614174000"],
      verifiedFacts: [{
        id: "123e4567-e89b-42d3-a456-426614174000",
        statement: "The museum closes at 16:00.",
        sourceReferenceIds: ["source:3"],
      }],
      sourceReferences: [{ id: "source:3", label: "Official opening hours" }],
    });
    mocks.review.mockResolvedValue({
      findings: [],
      factualCertification: "not_certified",
      aiStatus: "skipped",
    });
  });

  it("loads the latest saved page and takes the actor ID from the server session", async () => {
    await runMarketingQaAction("page", 17);
    expect(mocks.getPage).toHaveBeenCalledWith(17);
    expect(mocks.requireCity).toHaveBeenCalledWith(3, "marketing:view");
    expect(mocks.review).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "marketing_landing",
        fields: expect.arrayContaining([
          expect.objectContaining({ key: "title", value: "Discover Lübeck" }),
        ]),
        requireEvidence: true,
      }),
      "trusted-staff-session-id",
    );
  });

  it("allows an authorized city reviewer on in_review social content", async () => {
    mocks.requireCity.mockResolvedValue(context("reviewer_publisher"));
    await runMarketingQaAction("social", 32);
    expect(mocks.review).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "marketing_social",
        fields: expect.arrayContaining([
          expect.objectContaining({ key: "hook", value: "Find your next walk" }),
        ]),
      }),
      "trusted-staff-session-id",
    );
  });

  it("denies staff with marketing:view only, even when they can load a page", async () => {
    mocks.requireCity.mockResolvedValue(context("viewer"));
    await expect(runMarketingQaAction("page", 17)).rejects.toThrow("FORBIDDEN");
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("denies an out-of-scope staff member before running any AI", async () => {
    mocks.requireCity.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(runMarketingQaAction("social", 32)).rejects.toThrow("FORBIDDEN");
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs and unknown entity types without querying", async () => {
    await expect(runMarketingQaAction("page", -1)).rejects.toThrow();
    await expect(runMarketingQaAction("social", Number.NaN)).rejects.toThrow();
    await expect(runMarketingQaAction("other" as "page", 9)).rejects.toThrow();
    expect(mocks.getPage).not.toHaveBeenCalled();
    expect(mocks.getSocial).not.toHaveBeenCalled();
  });

  it("never allows post-approval QA to change a published item", async () => {
    mocks.getPage.mockResolvedValue({ ...page, publicationStatus: "published" });
    await expect(runMarketingQaAction("page", 17)).rejects.toThrow(/before approval/);
    mocks.getSocial.mockResolvedValue({ ...social, status: "approved" });
    await expect(runMarketingQaAction("social", 32)).rejects.toThrow(/before approval/);
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("reloads saved content on rerun instead of accepting client-side drafts", async () => {
    mocks.getPage
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce({ ...page, title: "Corrected saved title" });
    await runMarketingQaAction("page", 17);
    await runMarketingQaAction("page", 17);
    expect(mocks.review).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({ key: "title", value: "Corrected saved title" }),
        ]),
      }),
      "trusted-staff-session-id",
    );
  });
  it("loads selected place evidence only after verifying role and record city", async () => {
    const report = await runMarketingQaAction("page", 17, 21);
    expect(mocks.evidence).toHaveBeenCalledWith(3, 21);
    expect(mocks.review).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedFactIds: ["123e4567-e89b-42d3-a456-426614174000"],
        verifiedFacts: expect.arrayContaining([
          expect.objectContaining({ statement: "The museum closes at 16:00." }),
        ]),
      }),
      "trusted-staff-session-id",
    );
    expect(report.findings).toContainEqual(expect.objectContaining({
      checkId: "facts.scope_limited",
      severity: "info",
    }));
    expect(report.factualCertification).toBe("not_certified");
  });

  it("does not fetch verified evidence for unauthorized or post-approval records", async () => {
    mocks.requireCity.mockResolvedValue(context("viewer"));
    await expect(runMarketingQaAction("page", 17, 21)).rejects.toThrow("FORBIDDEN");
    expect(mocks.evidence).not.toHaveBeenCalled();
    mocks.requireCity.mockResolvedValue(context("content_editor"));
    mocks.getPage.mockResolvedValue({ ...page, publicationStatus: "published" });
    await expect(runMarketingQaAction("page", 17, 21)).rejects.toThrow(/before approval/);
    expect(mocks.evidence).not.toHaveBeenCalled();
  });

  it("rejects invalid place identifiers before even fetching content", async () => {
    await expect(runMarketingQaAction("page", 17, -2)).rejects.toThrow(/Invalid verified place/);
    await expect(runMarketingQaAction("social", 32, Number.NaN)).rejects.toThrow(/Invalid verified place/);
    expect(mocks.getPage).not.toHaveBeenCalled();
    expect(mocks.getSocial).not.toHaveBeenCalled();
  });

  it("fails closed when selected place has no authorized verified source", async () => {
    mocks.evidence.mockRejectedValue(new Error("No verified source is available for this place."));
    await expect(runMarketingQaAction("social", 32, 21)).rejects.toThrow(/No verified source/);
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("shows human-readable evidence labels without trusting invented references", async () => {
    mocks.review.mockResolvedValue({
      aiStatus: "reviewed",
      factualCertification: "not_certified",
      findings: [{
        severity: "warning",
        checkId: "ai.factual_inconsistency",
        message: "The time conflicts with the official information.",
        origin: "ai_assisted",
        affectedField: "title",
        evidence: [
          { kind: "source_fact", id: "123e4567-e89b-42d3-a456-426614174000" },
          { kind: "source", id: "source:3" },
        ],
      }],
    });
    const report = await runMarketingQaAction("page", 17, 21);
    const findings = report.findings.filter((finding) => finding.checkId === "ai.factual_inconsistency");
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toEqual([
      expect.objectContaining({ label: "The museum closes at 16:00." }),
      expect.objectContaining({ label: "Official opening hours" }),
    ]);
  });

});
