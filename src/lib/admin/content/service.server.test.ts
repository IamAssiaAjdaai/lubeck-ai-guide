import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCmsPlace: vi.fn(),
  getCmsPlace: vi.fn(),
  setCmsPublicationStatus: vi.fn(),
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
    getCmsPlace: mocks.getCmsPlace,
    setCmsPublicationStatus: mocks.setCmsPublicationStatus,
  };
});

import {
  changeAuthorizedPublicationStatus,
  createAuthorizedPlace,
  updateAuthorizedPlace,
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

  it("does not allow a content editor to publish through create", async () => {
    mocks.requireCityCapability.mockImplementation(
      async (_cityId: number, capability: string) => {
        if (capability === "publishing:publish") throw new Error("FORBIDDEN");
        return editorContext;
      },
    );

    await expect(createAuthorizedPlace({
      ...placeInput,
      publicationStatus: "published",
    })).rejects.toThrow("FORBIDDEN");
    expect(mocks.createCmsPlace).not.toHaveBeenCalled();
  });

  it("authenticates before loading an entity for update", async () => {
    mocks.requireAdminCapability.mockRejectedValue(new Error("UNAUTHENTICATED"));

    await expect(
      updateAuthorizedPlace(11, placeInput, new Date().toISOString()),
    ).rejects.toThrow("UNAUTHENTICATED");
    expect(mocks.getCmsPlace).not.toHaveBeenCalled();
  });

  it("lets an authorized publisher perform a valid server-checked transition", async () => {
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
      publicationStatus: "draft",
      localizations: [{ locale: "en" }],
    });

    await changeAuthorizedPublicationStatus("place", 11, "published");

    expect(mocks.setCmsPublicationStatus).toHaveBeenCalledWith(
      "place",
      11,
      "published",
      "publisher-1",
    );
  });
});
