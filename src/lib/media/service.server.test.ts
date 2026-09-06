import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createMediaUploadRecord,
  finalizeMediaAsset,
  getMediaAsset,
  requireAdminCapability,
  requireCityCapability,
  setMediaLifecycle,
} = vi.hoisted(() => ({
  requireCityCapability: vi.fn(),
  requireAdminCapability: vi.fn(),
  createMediaUploadRecord: vi.fn(),
  getMediaAsset: vi.fn(),
  finalizeMediaAsset: vi.fn(),
  setMediaLifecycle: vi.fn(),
}));

vi.mock("@/lib/admin/authorization.server", () => ({
  requireCityCapability,
  requireAdminCapability,
}));
vi.mock("@/lib/admin/content/repository.server", () => ({
  getCmsCity: vi.fn(),
  getCmsPlace: vi.fn(),
  getCmsTour: vi.fn(),
}));
vi.mock("@/lib/media/repository.server", () => ({
  attachMedia: vi.fn(),
  createExternalVideoRecord: vi.fn(),
  createMediaUploadRecord,
  detachMedia: vi.fn(),
  finalizeMediaAsset,
  getMediaAsset,
  getMediaAssetWithUsages: vi.fn(),
  getMediaAttachment: vi.fn(),
  listEntityMedia: vi.fn(),
  listMediaAssets: vi.fn(),
  listStaleUploadingAssets: vi.fn(),
  markStaleUploadArchived: vi.fn(),
  markMediaObjectDeleted: vi.fn(),
  prepareMediaObjectDeletion: vi.fn(),
  setMediaLifecycle,
}));

import { createAuthorizedUploadIntent, finalizeAuthorizedUpload, reviewAuthorizedMediaAsset } from "@/lib/media/service.server";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

const context = {
  user: { id: "actor-1", email: "editor@example.com", name: "Editor" },
  staff: { membershipId: 1, userId: "actor-1", role: "content_editor", active: true, globalAccess: false, cityIds: [7] },
};

describe("media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCityCapability.mockResolvedValue(context);
    requireAdminCapability.mockResolvedValue(context);
    createMediaUploadRecord.mockImplementation(async (input) => ({ ...input, id: 19, approvalStatus: "uploading" }));
  });

  it("creates a server-owned immutable key without an API key", async () => {
    const store = new FakeMediaObjectStore();
    const result = await createAuthorizedUploadIntent({ cityId: 7, kind: "image", originalFilename: "../../gate.jpg", mimeType: "image/jpeg", sizeBytes: 3 }, store);
    expect(result.assetId).toBe(19);
    expect(store.uploadRequests).toHaveLength(1);
    expect(store.uploadRequests[0]?.objectKey).toMatch(/^media\/[0-9a-f-]{36}\/original\.jpg$/);
    expect(store.uploadRequests[0]?.objectKey).not.toContain("..");
    expect(requireCityCapability).toHaveBeenCalledWith(7, "media:manage");
    expect(createMediaUploadRecord.mock.calls[0]?.[1]).toBe("actor-1");
  });

  it("fails closed when city authorization is denied", async () => {
    requireCityCapability.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(createAuthorizedUploadIntent({ cityId: 99, kind: "image", originalFilename: "gate.jpg", mimeType: "image/jpeg", sizeBytes: 3 }, new FakeMediaObjectStore())).rejects.toThrow("FORBIDDEN");
    expect(createMediaUploadRecord).not.toHaveBeenCalled();
  });

  it("rejects finalize when the object was never uploaded", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, kind: "image", sourceType: "upload", objectKey: "media/id/original.jpg", mimeType: "image/jpeg", expectedSizeBytes: 3, approvalStatus: "uploading" });
    await expect(finalizeAuthorizedUpload(19, new FakeMediaObjectStore())).rejects.toThrow(/not found/);
    expect(finalizeMediaAsset).not.toHaveBeenCalled();
  });

  it("validates bytes before finalizing and keeps duplicate finalize idempotent", async () => {
    const store = new FakeMediaObjectStore();
    store.seedObject("media/id/original.jpg", { bytes: Uint8Array.from([0xff, 0xd8, 0xff]), contentType: "image/jpeg", checksumSha256: "checksum" });
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, kind: "image", sourceType: "upload", objectKey: "media/id/original.jpg", mimeType: "image/jpeg", expectedSizeBytes: 3, approvalStatus: "uploading" });
    finalizeMediaAsset.mockResolvedValue({ id: 19, approvalStatus: "pending_review" });
    await expect(finalizeAuthorizedUpload(19, store)).resolves.toEqual({ assetId: 19, status: "pending_review" });
    expect(finalizeMediaAsset).toHaveBeenCalledWith(19, expect.objectContaining({ sizeBytes: 3, checksumSha256: "checksum" }), "actor-1");
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, approvalStatus: "pending_review" });
    await expect(finalizeAuthorizedUpload(19, store)).resolves.toEqual({ assetId: 19, status: "pending_review" });
    expect(finalizeMediaAsset).toHaveBeenCalledTimes(1);
  });

  it("uses existing publishing authority for approval without granting edit rights", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, approvalStatus: "pending_review" });
    setMediaLifecycle.mockResolvedValue({ id: 19, approvalStatus: "approved" });
    await reviewAuthorizedMediaAsset(19, "approved");
    expect(requireAdminCapability).toHaveBeenCalledWith("media:view");
    expect(requireCityCapability).toHaveBeenCalledWith(7, "publishing:publish");
    expect(setMediaLifecycle).toHaveBeenCalledWith(19, "approved", "actor-1");
  });
});
