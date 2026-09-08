import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  listCmsCities: vi.fn(),
  listOperationsPlaces: vi.fn(),
  requireAdminCapability: vi.fn(),
}));

vi.mock("@/lib/admin/authorization.server", () => ({ requireAdminCapability: mocks.requireAdminCapability }));
vi.mock("@/lib/admin/content/repository.server", () => ({ listCmsCities: mocks.listCmsCities }));
vi.mock("@/lib/admin/operations/repository.server", () => ({ listOperationsPlaces: mocks.listOperationsPlaces }));
vi.mock("@/lib/admin/operations/ttsProvider.server", () => ({ getConfiguredTtsProvider: () => undefined }));

import { getAuthorizedContentOperations } from "@/lib/admin/operations/service.server";

describe("content operations authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCmsCities.mockResolvedValue([{ id: 1, name: "One" }, { id: 2, name: "Two" }]);
    mocks.listOperationsPlaces.mockResolvedValue([]);
  });

  it("loads only cities in a scoped staff membership", async () => {
    mocks.requireAdminCapability.mockResolvedValue({ staff: { role: "content_editor", active: true, globalAccess: false, cityIds: [2] } });
    const result = await getAuthorizedContentOperations();
    expect(result.cities).toEqual([{ id: 2, name: "Two" }]);
    expect(mocks.listOperationsPlaces).toHaveBeenCalledWith([2]);
    expect(result.capabilities.canManageTranslations).toBe(true);
  });

  it("lets reviewers view scoped operations without granting edit powers", async () => {
    mocks.requireAdminCapability.mockResolvedValue({ staff: { role: "reviewer_publisher", active: true, globalAccess: false, cityIds: [1] } });
    const result = await getAuthorizedContentOperations();
    expect(result.cities).toHaveLength(1);
    expect(result.capabilities).toMatchObject({ canManageTranslations: false, canManageMedia: false, canReview: true, canPublish: true });
  });
});
