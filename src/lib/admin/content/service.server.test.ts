import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCmsPlace: vi.fn(),
  createOrReuseCmsSourceForCity: vi.fn(),
  createOrReuseCmsSourceForPlace: vi.fn(),
  approveAndPublishCmsContent: vi.fn(),
  getCmsCity: vi.fn(),
  updateCmsPlace: vi.fn(),
  getCmsPlace: vi.fn(),
  setCmsPublicationStatus: vi.fn(),
  withdrawCmsPublishedPlaceRevision: vi.fn(),
  requireAdminCapability: vi.fn(),
  requireCityCapability: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/authorization.server", () => ({
  requireAdminCapability: mocks.requireAdminCapability,
  requireCityCapability: mocks.requireCityCapability,
}));
vi.mock("@/lib/admin/content/repository.server", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/content/repository.server")>();
  return {
    ...original,
    createCmsPlace: mocks.createCmsPlace,
    createOrReuseCmsSourceForCity: mocks.createOrReuseCmsSourceForCity,
    createOrReuseCmsSourceForPlace: mocks.createOrReuseCmsSourceForPlace,
    approveAndPublishCmsContent: mocks.approveAndPublishCmsContent,
    getCmsCity: mocks.getCmsCity,
    getCmsPlace: mocks.getCmsPlace,
    setCmsPublicationStatus: mocks.setCmsPublicationStatus,
    withdrawCmsPublishedPlaceRevision: mocks.withdrawCmsPublishedPlaceRevision,
    updateCmsPlace: mocks.updateCmsPlace,
  };
});

import {
  addAuthorizedCitySource,
  changeAuthorizedPublicationStatus,
  approveAndPublishAuthorizedContent,
  addAuthorizedPlaceSource,
  createAuthorizedPlace,
  updateAuthorizedPlace,
  withdrawAuthorizedPublishedPlaceRevision,
} from "@/lib/admin/content/service.server";

const editorContext = {
  user: { id: "editor-1", email: "editor@example.com", name: "Editor" },
  staff: {
    membershipId: 1,
    userId: "editor-1",
    role: "content_editor" as const,
    active: true,
    globalAccess: false,
    cityIds: [7],
  },
};

const placeInput = {
  cityId: 7,
  slug: "test-place",
  category: "see" as const,
  latitude: 53.86,
  longitude: 10.68,
  durationMinutes: 20,
  environment: "outdoor" as const,
  pricing: "unknown" as const,
  tagSlugs: ["history"],
  publicationStatus: "draft" as const,
  localizations: [{
    locale: "en" as const,
    name: "Test place",
    shortDescription: "Authored English content.",
    facts: [],
  }],
};

describe("CMS content service authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminCapability.mockResolvedValue(editorContext);
    mocks.requireCityCapability.mockResolvedValue(editorContext);
    mocks.createCmsPlace.mockResolvedValue({ id: 11 });
  });

  it("derives the mutation actor from the authenticated server context", async () => {
    const untrusted = {
      ...placeInput,
      actorId: "client-actor",
      role: "super_admin",
    };

    await createAuthorizedPlace(untrusted);

    expect(mocks.createCmsPlace).toHaveBeenCalledWith(
      expect.not.objectContaining({ actorId: "client-actor", role: "super_admin" }),
      "editor-1",
    );
  });

  it("requires newly created content to start as draft", async () => {
    await expect(createAuthorizedPlace({
      ...placeInput,
      publicationStatus: "published",
    })).rejects.toThrow("New content must start as a draft");
    expect(mocks.createCmsPlace).not.toHaveBeenCalled();
  });

  it("authenticates before loading an entity for update", async () => {
    mocks.requireAdminCapability.mockRejectedValue(new Error("UNAUTHENTICATED"));

    await expect(
      updateAuthorizedPlace(11, placeInput, new Date().toISOString()),
    ).rejects.toThrow("UNAUTHENTICATED");
    expect(mocks.getCmsPlace).not.toHaveBeenCalled();
  });

  it("lets an editor submit a draft for review", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "draft",
      localizations: [{ locale: "en" }],
    });

    await changeAuthorizedPublicationStatus("place", 11, "in_review");

    expect(mocks.requireCityCapability).toHaveBeenCalledWith(7, "places:manage");
    expect(mocks.setCmsPublicationStatus).toHaveBeenCalledWith(
      "place",
      11,
      "in_review",
      "editor-1",
    );
  });

  it("lets a reviewer approve reviewed content", async () => {
    const publisherContext = {
      ...editorContext,
      user: { ...editorContext.user, id: "publisher-1" },
      staff: {
        ...editorContext.staff,
        userId: "publisher-1",
        role: "reviewer_publisher" as const,
      },
    };
    mocks.requireAdminCapability.mockResolvedValue(publisherContext);
    mocks.requireCityCapability.mockResolvedValue(publisherContext);
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "in_review",
      localizations: [{ locale: "en" }],
    });

    await changeAuthorizedPublicationStatus("place", 11, "approved");

    expect(mocks.requireCityCapability).toHaveBeenCalledWith(7, "publishing:review");
    expect(mocks.setCmsPublicationStatus).toHaveBeenCalledWith(
      "place",
      11,
      "approved",
      "publisher-1",
    );
  });

  it("does not let an editor approve or publish", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "in_review",
      localizations: [{ locale: "en" }],
    });
    mocks.requireCityCapability.mockImplementation(
      async (_cityId: number, capability: string) => {
        if (capability.startsWith("publishing:")) throw new Error("FORBIDDEN");
        return editorContext;
      },
    );

    await expect(
      changeAuthorizedPublicationStatus("place", 11, "approved"),
    ).rejects.toThrow("FORBIDDEN");
    expect(mocks.setCmsPublicationStatus).not.toHaveBeenCalled();
  });

  it("enforces city scope on review transitions", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 99,
      publicationStatus: "in_review",
      localizations: [{ locale: "en" }],
    });
    mocks.requireCityCapability.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(
      changeAuthorizedPublicationStatus("place", 11, "approved"),
    ).rejects.toThrow("FORBIDDEN");
    expect(mocks.requireCityCapability).toHaveBeenCalledWith(99, "publishing:review");
  });

  it("requires publish capability to publish approved content", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "approved",
      localizations: [{ locale: "en" }],
    });

    await changeAuthorizedPublicationStatus("place", 11, "published");

    expect(mocks.requireCityCapability).toHaveBeenCalledWith(7, "publishing:publish");
  });

  it("requires city-scoped publish capability to withdraw a live revision", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "draft",
      publishedRevision: { id: 4 },
    });
    mocks.withdrawCmsPublishedPlaceRevision.mockResolvedValue({
      placeId: 11,
      revisionId: 4,
    });

    await withdrawAuthorizedPublishedPlaceRevision(11);

    expect(mocks.requireCityCapability).toHaveBeenCalledWith(
      7,
      "publishing:publish",
    );
    expect(mocks.withdrawCmsPublishedPlaceRevision).toHaveBeenCalledWith(
      11,
      "editor-1",
    );
  });

  it("rejects workflow shortcuts before mutation", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "draft",
      localizations: [{ locale: "en" }],
    });

    await expect(
      changeAuthorizedPublicationStatus("place", 11, "published"),
    ).rejects.toThrow("Cannot transition draft to published");
    expect(mocks.setCmsPublicationStatus).not.toHaveBeenCalled();
  });

  it("normalizes and scopes canonical sources before repository mutation", async () => {
    mocks.getCmsPlace.mockResolvedValue({ id: 11, cityId: 7 });
    mocks.createOrReuseCmsSourceForPlace.mockResolvedValue({ id: 12 });

    await addAuthorizedPlaceSource(11, {
      publisher: "Official source",
      title: "Place page",
      canonicalUrl: "https://EXAMPLE.com/place/",
      verifiedAt: "2026-09-01",
    });

    expect(mocks.requireAdminCapability).toHaveBeenCalledWith("sources:manage");
    expect(mocks.requireCityCapability).toHaveBeenCalledWith(7, "sources:manage");
    expect(mocks.createOrReuseCmsSourceForPlace).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ canonicalUrl: "https://example.com/place" }),
      "editor-1",
    );
  });

  it("normalizes city sources and enforces the existing city scope", async () => {
    mocks.getCmsCity.mockResolvedValue({ id: 7, publicationStatus: "draft" });
    mocks.createOrReuseCmsSourceForCity.mockResolvedValue({ id: 13 });

    await addAuthorizedCitySource(7, {
      publisher: "Official source",
      title: "City page",
      canonicalUrl: "https://EXAMPLE.com/city/",
      verifiedAt: "2026-09-01",
    });

    expect(mocks.requireAdminCapability).toHaveBeenCalledWith("sources:manage");
    expect(mocks.requireCityCapability).toHaveBeenCalledWith(7, "sources:manage");
    expect(mocks.createOrReuseCmsSourceForCity).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ canonicalUrl: "https://example.com/city" }),
      "editor-1",
    );
  });

  it("allows an editor to create a working draft from a published place revision", async () => {
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "published",
      publishedRevision: { id: 4 },
    });
    mocks.updateCmsPlace.mockResolvedValue({ id: 11, publicationStatus: "draft" });

    await updateAuthorizedPlace(
      11,
      { ...placeInput, publicationStatus: "published" },
      new Date().toISOString(),
    );

    expect(mocks.updateCmsPlace).toHaveBeenCalled();
  });

  it("requires review and publish capabilities for the combined action", async () => {
    const publisherContext = {
      ...editorContext,
      user: { ...editorContext.user, id: "publisher-1" },
      staff: { ...editorContext.staff, role: "reviewer_publisher" as const },
    };
    mocks.requireAdminCapability.mockResolvedValue(publisherContext);
    mocks.requireCityCapability.mockResolvedValue(publisherContext);
    mocks.getCmsPlace.mockResolvedValue({
      id: 11,
      cityId: 7,
      publicationStatus: "in_review",
    });

    await approveAndPublishAuthorizedContent("place", 11);

    expect(mocks.requireCityCapability).toHaveBeenNthCalledWith(1, 7, "publishing:review");
    expect(mocks.requireCityCapability).toHaveBeenNthCalledWith(2, 7, "publishing:publish");
    expect(mocks.approveAndPublishCmsContent).toHaveBeenCalledWith("place", 11, "publisher-1");
  });
});
