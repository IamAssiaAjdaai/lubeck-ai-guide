import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlace: vi.fn(),
  getTour: vi.fn(),
  requireStaff: vi.fn(),
  review: vi.fn(),
  loadEvidence: vi.fn(),
}));
vi.mock("@/lib/admin/content/service.server", () => ({
  getAuthorizedPlace: mocks.getPlace,
  getAuthorizedTour: mocks.getTour,
}));
vi.mock("@/lib/admin/authorization.server", () => ({
  AdminAuthorizationError: class extends Error {
    constructor() { super("FORBIDDEN"); }
  },
  requireStaff: mocks.requireStaff,
}));
vi.mock("@/lib/admin/marketing/qaEvidence.server", () => ({
  loadMarketingVerifiedPlaceEvidence: mocks.loadEvidence,
}));
vi.mock("@/lib/contentQa/groqReview.server", () => ({
  reviewContentWithGroq: mocks.review,
}));

import { runCmsContentQaAction } from "./content-qa-actions";

const staff = (role = "content_editor", cityIds = [7]) => ({
  user: { id: "staff-session", email: "staff@example.test", name: "Staff" },
  staff: {
    role,
    active: true,
    globalAccess: false,
    cityIds,
    membershipId: 1,
    userId: "staff-session",
  },
});
const place = {
  id: 21,
  cityId: 7,
  publicationStatus: "draft",
  localizations: [{
    locale: "en",
    name: "Historical gate",
    shortDescription: "Visit the old city.",
    description: "Discover history.",
    story: null,
    visitNotes: null,
    facts: [{ label: "Opened", value: "1891" }],
  }],
  sourceLinks: [],
};
const tour = {
  id: 50,
  cityId: 7,
  publicationStatus: "in_review",
  estimatedDurationMinutes: 60,
  localizations: [{
    locale: "en",
    title: "Historic walk",
    shortDescription: null,
    description: "An easy walk around the city.",
  }],
  stops: [
    { placeId: 21, position: 1, visitDurationMinutes: 40 },
    { placeId: 22, position: 2, visitDurationMinutes: 30 },
  ],
};
const evidence = {
  allowedFactIds: ["123e4567-e89b-42d3-a456-426614174000"],
  verifiedFacts: [{
    id: "123e4567-e89b-42d3-a456-426614174000",
    statement: "The gate closes at 17:00.",
    sourceReferenceIds: ["source:3"],
  }],
  sourceReferences: [{ id: "source:3", label: "Municipal website" }],
};

describe("CMS Place and Tour Run QA server action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getPlace.mockResolvedValue(place);
    mocks.getTour.mockResolvedValue(tour);
    mocks.requireStaff.mockResolvedValue(staff());
    mocks.loadEvidence.mockResolvedValue(evidence);
    mocks.review.mockResolvedValue({
      aiStatus: "skipped",
      factualCertification: "not_certified",
      findings: [],
    });
  });

  it("reviews saved place draft as advisory without treating linked CMS facts as trusted", async () => {
    const report = await runCmsContentQaAction("place", 21, "en");
    expect(mocks.getPlace).toHaveBeenCalledWith(21);
    expect(mocks.review).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "cms_place",
      requireEvidence: true,
      fields: expect.arrayContaining([expect.objectContaining({ key: "name", value: "Historical gate" })]),
    }), "staff-session");
    expect(mocks.loadEvidence).not.toHaveBeenCalled();
    expect(report.findings).toContainEqual(expect.objectContaining({ checkId: "sources.missing" }));
    expect(report.factualCertification).toBe("not_certified");
  });

  it("runs reviewer-scoped in_review tour QA and flags an impossible duration estimate", async () => {
    mocks.requireStaff.mockResolvedValue(staff("reviewer_publisher"));
    const report = await runCmsContentQaAction("tour", 50, "en");
    expect(report.findings).toContainEqual(expect.objectContaining({ checkId: "tour.duration_conflict" }));
    expect(mocks.review).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "cms_tour",
    }), "staff-session");
  });

  it("rejects a viewer or cross-city staff member before AI/evidence reads", async () => {
    mocks.requireStaff.mockResolvedValue(staff("content_editor", [99]));
    await expect(runCmsContentQaAction("place", 21, "en")).rejects.toThrow("FORBIDDEN");
    mocks.requireStaff.mockResolvedValue(staff("viewer"));
    await expect(runCmsContentQaAction("tour", 50, "en")).rejects.toThrow("FORBIDDEN");
    expect(mocks.review).not.toHaveBeenCalled();
    expect(mocks.loadEvidence).not.toHaveBeenCalled();
  });

  it("blocks post-approval content", async () => {
    mocks.getPlace.mockResolvedValue({ ...place, publicationStatus: "approved" });
    await expect(runCmsContentQaAction("place", 21, "en")).rejects.toThrow(/before approval/);
    mocks.getTour.mockResolvedValue({ ...tour, publicationStatus: "published" });
    await expect(runCmsContentQaAction("tour", 50, "en")).rejects.toThrow(/before approval/);
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs and locales without querying CMS", async () => {
    await expect(runCmsContentQaAction("place", -1, "en")).rejects.toThrow(/Invalid/);
    await expect(runCmsContentQaAction("tour", 50, "unsupported-locale")).rejects.toThrow(/Invalid/);
    await expect(runCmsContentQaAction("other" as "tour", 50, "en")).rejects.toThrow(/Invalid/);
    await expect(runCmsContentQaAction("tour", 50, "en", Number.NaN)).rejects.toThrow(/Invalid/);
    expect(mocks.getPlace).not.toHaveBeenCalled();
    expect(mocks.getTour).not.toHaveBeenCalled();
  });

  it("allows a verified source only for an actual tour stop in the English locale", async () => {
    const report = await runCmsContentQaAction("tour", 50, "en", 21);
    expect(mocks.loadEvidence).toHaveBeenCalledWith(7, 21);
    expect(mocks.review).toHaveBeenCalledWith(expect.objectContaining(evidence), "staff-session");
    expect(report.findings).toContainEqual(expect.objectContaining({ checkId: "facts.scope_limited" }));
    expect(report.factualCertification).toBe("not_certified");
  });

  it("rejects forged stop, non-English evidence, or evidence for a place draft", async () => {
    await expect(runCmsContentQaAction("tour", 50, "en", 42)).rejects.toThrow(/not available/);
    await expect(runCmsContentQaAction("tour", 50, "de", 21)).rejects.toThrow(/not available/);
    await expect(runCmsContentQaAction("place", 21, "en", 21)).rejects.toThrow(/Invalid place/);
    expect(mocks.loadEvidence).not.toHaveBeenCalled();
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("fails closed on expired or missing verified stop evidence", async () => {
    mocks.loadEvidence.mockRejectedValue(new Error("No verified source is available for this place."));
    await expect(runCmsContentQaAction("tour", 50, "en", 21)).rejects.toThrow(/No verified source/);
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("always reloads saved content and cannot change publication state", async () => {
    mocks.getPlace.mockResolvedValueOnce(place)
      .mockResolvedValueOnce({ ...place, localizations: [
        { ...place.localizations[0], name: "Updated saved place name" },
      ]});
    await runCmsContentQaAction("place", 21, "en");
    await runCmsContentQaAction("place", 21, "en");
    expect(mocks.review).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        fields: expect.arrayContaining([expect.objectContaining({ key: "name", value: "Updated saved place name" })]),
      }),
      "staff-session",
    );
  });
});
