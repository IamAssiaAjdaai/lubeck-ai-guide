import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createMediaUploadRecord,
  attachMedia,
  cancelMediaUpload,
  deleteMediaAssetRights,
  detachMedia,
  finalizeMediaAsset,
  getCmsPlace,
  getMediaAsset,
  getMediaAttachment,
  requireAdminCapability,
  requireCityCapability,
  markMediaObjectDeleted,
  promotePlaceAudioCandidate,
  saveMediaAssetRights,
  setMediaLifecycle,
  verifyMediaAssetRights,
} = vi.hoisted(() => ({
  requireCityCapability: vi.fn(),
  requireAdminCapability: vi.fn(),
  createMediaUploadRecord: vi.fn(),
  attachMedia: vi.fn(),
  cancelMediaUpload: vi.fn(),
  deleteMediaAssetRights: vi.fn(),
  detachMedia: vi.fn(),
  getCmsPlace: vi.fn(),
  getMediaAsset: vi.fn(),
  getMediaAttachment: vi.fn(),
  finalizeMediaAsset: vi.fn(),
  markMediaObjectDeleted: vi.fn(),
  promotePlaceAudioCandidate: vi.fn(),
  saveMediaAssetRights: vi.fn(),
  setMediaLifecycle: vi.fn(),
  verifyMediaAssetRights: vi.fn(),
}));

vi.mock("@/lib/admin/authorization.server", () => ({
  requireCityCapability,
  requireAdminCapability,
}));
vi.mock("@/lib/admin/content/repository.server", () => ({
  getCmsCity: vi.fn(),
  getCmsPlace,
  getCmsTour: vi.fn(),
}));
vi.mock("@/lib/media/repository.server", () => ({
  attachMedia,
  cancelMediaUpload,
  createExternalVideoRecord: vi.fn(),
  createMediaUploadRecord,
  detachMedia,
  finalizeMediaAsset,
  getMediaAsset,
  getMediaAssetWithUsages: vi.fn(),
  getMediaAttachment,
  listEntityMedia: vi.fn(),
  listMediaAssets: vi.fn(),
  listStaleUploadingAssets: vi.fn(),
  markStaleUploadArchived: vi.fn(),
  markMediaObjectDeleted,
  prepareMediaObjectDeletion: vi.fn(),
  promotePlaceAudioCandidate,
  setMediaLifecycle,
}));
vi.mock("@/lib/media/rightsRepository.server", () => ({
  deleteMediaAssetRights,
  getMediaAssetRights: vi.fn(),
  saveMediaAssetRights,
  verifyMediaAssetRights,
}));

import {
  attachAuthorizedMedia,
  cancelAuthorizedMediaUpload,
  createAuthorizedUploadIntent,
  deleteAuthorizedMediaRights,
  detachAuthorizedMedia,
  finalizeAuthorizedUpload,
  makeAuthorizedPlaceAudioLive,
  reviewAuthorizedMediaAsset,
  retryAuthorizedUploadFinalize,
  saveAuthorizedMediaRights,
  verifyAuthorizedMediaRights,
} from "@/lib/media/service.server";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

const context = {
  user: { id: "actor-1", email: "editor@example.com", name: "Editor" },
  staff: { membershipId: 1, userId: "actor-1", role: "content_editor", active: true, globalAccess: false, cityIds: [7] },
};

const reviewerContext = {
  user: { id: "reviewer-1", email: "reviewer@example.com", name: "Reviewer" },
  staff: { membershipId: 2, userId: "reviewer-1", role: "reviewer_publisher", active: true, globalAccess: false, cityIds: [7] },
};

const adminContext = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin" },
  staff: { membershipId: 3, userId: "admin-1", role: "admin", active: true, globalAccess: true, cityIds: [] },
};

const superAdminContext = {
  user: { id: "super-1", email: "super@example.com", name: "Super Admin" },
  staff: { membershipId: 4, userId: "super-1", role: "super_admin", active: true, globalAccess: false, cityIds: [] },
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

  it("retries finalize through the verified upload path", async () => {
    const store = new FakeMediaObjectStore();
    store.seedObject("media/id/original.jpg", {
      bytes: Uint8Array.from([0xff, 0xd8, 0xff]),
      contentType: "image/jpeg",
      checksumSha256: "checksum",
    });
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      kind: "image",
      sourceType: "upload",
      objectKey: "media/id/original.jpg",
      mimeType: "image/jpeg",
      expectedSizeBytes: 3,
      approvalStatus: "uploading",
    });
    finalizeMediaAsset.mockResolvedValue({
      id: 19,
      approvalStatus: "pending_review",
    });

    await expect(retryAuthorizedUploadFinalize(19, store)).resolves.toEqual({
      assetId: 19,
      status: "pending_review",
    });
    expect(finalizeMediaAsset).toHaveBeenCalledWith(
      19,
      expect.objectContaining({ sizeBytes: 3, checksumSha256: "checksum" }),
      "actor-1",
    );
  });

  it("returns a recoverable retry error when the uploaded object is missing", async () => {
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      kind: "image",
      sourceType: "upload",
      objectKey: "media/id/missing.jpg",
      mimeType: "image/jpeg",
      expectedSizeBytes: 3,
      approvalStatus: "uploading",
    });

    await expect(
      retryAuthorizedUploadFinalize(19, new FakeMediaObjectStore()),
    ).rejects.toThrow(/Cancel this upload and upload the file again/);
    expect(finalizeMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects retry finalize outside the uploading state", async () => {
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      sourceType: "upload",
      approvalStatus: "pending_review",
    });

    await expect(
      retryAuthorizedUploadFinalize(19, new FakeMediaObjectStore()),
    ).rejects.toThrow(/Only incomplete uploads/);
  });

  it("cancels an upload and deletes its stored object", async () => {
    const store = new FakeMediaObjectStore();
    store.seedObject("media/id/original.jpg", {
      bytes: Uint8Array.from([0xff, 0xd8, 0xff]),
      contentType: "image/jpeg",
    });
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      sourceType: "upload",
      approvalStatus: "uploading",
    });
    cancelMediaUpload.mockResolvedValue({
      id: 19,
      objectKey: "media/id/original.jpg",
      approvalStatus: "archived",
    });
    markMediaObjectDeleted.mockResolvedValue({
      id: 19,
      objectKey: null,
      approvalStatus: "archived",
    });

    await expect(cancelAuthorizedMediaUpload(19, store)).resolves.toEqual({
      assetId: 19,
      status: "archived",
    });
    expect(store.deletedKeys).toEqual(["media/id/original.jpg"]);
    expect(markMediaObjectDeleted).toHaveBeenCalledWith(
      19,
      "media/id/original.jpg",
      "actor-1",
    );
  });

  it("cancels safely when the stored object is already absent", async () => {
    const store = new FakeMediaObjectStore();
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      sourceType: "upload",
      approvalStatus: "uploading",
    });
    cancelMediaUpload.mockResolvedValue({
      id: 19,
      objectKey: "media/id/missing.jpg",
      approvalStatus: "archived",
    });
    markMediaObjectDeleted.mockResolvedValue({
      id: 19,
      objectKey: null,
      approvalStatus: "archived",
    });

    await expect(cancelAuthorizedMediaUpload(19, store)).resolves.toEqual({
      assetId: 19,
      status: "archived",
    });
    expect(store.deletedKeys).toEqual([]);
    expect(markMediaObjectDeleted).toHaveBeenCalledWith(
      19,
      "media/id/missing.jpg",
      "actor-1",
    );
  });

  it("checks city-scoped media management before cancelling", async () => {
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 99,
      sourceType: "upload",
      approvalStatus: "uploading",
    });
    requireCityCapability.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(
      cancelAuthorizedMediaUpload(19, new FakeMediaObjectStore()),
    ).rejects.toThrow("FORBIDDEN");
    expect(cancelMediaUpload).not.toHaveBeenCalled();
    expect(markMediaObjectDeleted).not.toHaveBeenCalled();
  });

  it("persists actual audio duration derived from the uploaded object", async () => {
    const store = new FakeMediaObjectStore();
    const bytes = new Uint8Array(
      await readFile(resolve(process.cwd(), "public/audio/holstentor-de.mp3")),
    );
    store.seedObject("media/id/story-en.mp3", {
      bytes,
      contentType: "audio/mpeg",
      checksumSha256: "checksum",
    });
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      kind: "audio",
      sourceType: "upload",
      objectKey: "media/id/story-en.mp3",
      mimeType: "audio/mpeg",
      expectedSizeBytes: bytes.byteLength,
      approvalStatus: "uploading",
    });
    finalizeMediaAsset.mockResolvedValue({ id: 19, approvalStatus: "pending_review" });

    await finalizeAuthorizedUpload(19, store);

    expect(finalizeMediaAsset).toHaveBeenCalledWith(
      19,
      expect.objectContaining({ durationSeconds: expect.any(Number) }),
      "actor-1",
    );
    expect(finalizeMediaAsset.mock.calls[0]?.[1]?.durationSeconds).toBeCloseTo(
      72.744,
      3,
    );
  });

  it("finalizes safely without fabricated duration when extraction fails", async () => {
    const store = new FakeMediaObjectStore();
    const bytes = Uint8Array.from([0x49, 0x44, 0x33]);
    store.seedObject("media/id/story-en.mp3", {
      bytes,
      contentType: "audio/mpeg",
    });
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      kind: "audio",
      sourceType: "upload",
      objectKey: "media/id/story-en.mp3",
      mimeType: "audio/mpeg",
      expectedSizeBytes: bytes.byteLength,
      approvalStatus: "uploading",
    });
    finalizeMediaAsset.mockResolvedValue({ id: 19, approvalStatus: "pending_review" });

    await expect(
      finalizeAuthorizedUpload(
        19,
        store,
        vi.fn().mockRejectedValue(new Error("unsupported audio")),
      ),
    ).resolves.toEqual({ assetId: 19, status: "pending_review" });
    expect(finalizeMediaAsset).toHaveBeenCalledWith(
      19,
      expect.not.objectContaining({ durationSeconds: expect.anything() }),
      "actor-1",
    );
  });

  it("does not inspect duration for non-audio uploads", async () => {
    const store = new FakeMediaObjectStore();
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff]);
    store.seedObject("media/id/original.jpg", {
      bytes,
      contentType: "image/jpeg",
    });
    getMediaAsset.mockResolvedValue({
      id: 19,
      cityId: 7,
      kind: "image",
      sourceType: "upload",
      objectKey: "media/id/original.jpg",
      mimeType: "image/jpeg",
      expectedSizeBytes: bytes.byteLength,
      approvalStatus: "uploading",
    });
    finalizeMediaAsset.mockResolvedValue({ id: 19, approvalStatus: "pending_review" });
    const extractDuration = vi.fn();

    await finalizeAuthorizedUpload(19, store, extractDuration);

    expect(extractDuration).not.toHaveBeenCalled();
    expect(finalizeMediaAsset).toHaveBeenCalledWith(
      19,
      expect.not.objectContaining({ durationSeconds: expect.anything() }),
      "actor-1",
    );
  });

  it("lets a reviewer approve and reject without granting media management", async () => {
    requireAdminCapability.mockResolvedValue(reviewerContext);
    requireCityCapability.mockResolvedValue(reviewerContext);
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, approvalStatus: "pending_review" });
    setMediaLifecycle.mockResolvedValue({ id: 19, approvalStatus: "approved" });
    await reviewAuthorizedMediaAsset(19, "approved");
    expect(requireAdminCapability).toHaveBeenCalledWith("media:view");
    expect(requireCityCapability).toHaveBeenCalledWith(7, "publishing:publish");
    expect(setMediaLifecycle).toHaveBeenCalledWith(19, "approved", "reviewer-1");

    await reviewAuthorizedMediaAsset(19, "rejected");
    expect(requireCityCapability).toHaveBeenLastCalledWith(7, "publishing:review");

    requireCityCapability.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(createAuthorizedUploadIntent({ cityId: 7, kind: "image", originalFilename: "gate.jpg", mimeType: "image/jpeg", sizeBytes: 3 }, new FakeMediaObjectStore())).rejects.toThrow("FORBIDDEN");
    expect(requireCityCapability).toHaveBeenLastCalledWith(7, "media:manage");
  });

  it("lets editors prepare rights metadata without accepting reviewer identity", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7 });
    saveMediaAssetRights.mockResolvedValue({ mediaAssetId: 19 });

    await saveAuthorizedMediaRights(19, {
      rightsBasis: "licensed",
      creator: "Photographer",
      attributionRequired: true,
      attributionText: "Photo: Photographer",
      evidenceReference: "License agreement 42",
      verifiedByUserId: "attacker-controlled",
    } as unknown as Parameters<typeof saveAuthorizedMediaRights>[1]);

    expect(requireCityCapability).toHaveBeenCalledWith(7, "media:manage");
    expect(saveMediaAssetRights).toHaveBeenCalledWith(
      19,
      expect.not.objectContaining({ verifiedByUserId: expect.anything() }),
      "actor-1",
    );
  });

  it("fails closed when the caller cannot edit rights for the asset city", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 99 });
    requireCityCapability.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(saveAuthorizedMediaRights(19, {
      rightsBasis: "owned",
      creator: "CITYWALK",
      attributionRequired: false,
      evidenceReference: "Internal asset register 42",
    })).rejects.toThrow("FORBIDDEN");
    expect(saveMediaAssetRights).not.toHaveBeenCalled();
  });

  it("deletes only rights metadata through city-scoped media management", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7 });
    deleteMediaAssetRights.mockResolvedValue(true);

    await expect(deleteAuthorizedMediaRights(19)).resolves.toBe(true);
    expect(requireCityCapability).toHaveBeenCalledWith(7, "media:manage");
    expect(deleteMediaAssetRights).toHaveBeenCalledWith(19);

    vi.clearAllMocks();
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 99 });
    requireCityCapability.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(deleteAuthorizedMediaRights(19)).rejects.toThrow("FORBIDDEN");
    expect(deleteMediaAssetRights).not.toHaveBeenCalled();
  });

  it("derives the rights reviewer from a city-scoped publisher session", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7 });
    requireCityCapability.mockResolvedValue(reviewerContext);
    verifyMediaAssetRights.mockResolvedValue({
      mediaAssetId: 19,
      verifiedByUserId: "reviewer-1",
    });

    await verifyAuthorizedMediaRights(19);

    expect(requireCityCapability).toHaveBeenCalledWith(
      7,
      "publishing:publish",
    );
    expect(verifyMediaAssetRights).toHaveBeenCalledWith(19, "reviewer-1");
  });

  it("fails closed when the caller cannot verify rights for the asset city", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 99 });
    requireCityCapability.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(verifyAuthorizedMediaRights(19)).rejects.toThrow("FORBIDDEN");
    expect(verifyMediaAssetRights).not.toHaveBeenCalled();
  });

  it("passes a fail-closed public mutation decision for editors and publishers", async () => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, approvalStatus: "approved" });
    getCmsPlace.mockResolvedValue({ id: 31, cityId: 7 });
    attachMedia.mockResolvedValue({ id: 41 });

    await attachAuthorizedMedia({ entityType: "place", entityId: 31, mediaAssetId: 19, purpose: "hero" });
    expect(attachMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityId: 31, mediaAssetId: 19 }),
      "actor-1",
      { allowPublicMutation: false },
    );

    requireCityCapability.mockResolvedValue(adminContext);
    await attachAuthorizedMedia({ entityType: "place", entityId: 31, mediaAssetId: 19, purpose: "hero" });
    expect(attachMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityId: 31, mediaAssetId: 19 }),
      "admin-1",
      { allowPublicMutation: true },
    );

    getMediaAttachment.mockResolvedValue({ id: 41, placeId: 31 });
    detachMedia.mockResolvedValue({ id: 41 });
    requireCityCapability.mockResolvedValue(context);
    await detachAuthorizedMedia("place", 41);
    expect(detachMedia).toHaveBeenLastCalledWith("place", 41, {
      allowPublicMutation: false,
    });
  });

  it("requires city-scoped publishing authority to make exact-locale audio live", async () => {
    getCmsPlace.mockResolvedValue({ id: 31, cityId: 7 });
    promotePlaceAudioCandidate.mockResolvedValue({ mediaAssetId: 19 });
    requireCityCapability.mockResolvedValue(reviewerContext);

    await expect(makeAuthorizedPlaceAudioLive(31, "de")).resolves.toEqual({
      mediaAssetId: 19,
    });
    expect(requireCityCapability).toHaveBeenCalledWith(7, "publishing:publish");
    expect(promotePlaceAudioCandidate).toHaveBeenCalledWith(31, "de", "reviewer-1");

    await expect(makeAuthorizedPlaceAudioLive(31, "xx")).rejects.toThrow(/not supported/);
  });

  it.each([
    ["admin", adminContext],
    ["super_admin", superAdminContext],
  ])("lets %s manage media with publication authority", async (_role, privilegedContext) => {
    getMediaAsset.mockResolvedValue({ id: 19, cityId: 7, approvalStatus: "approved" });
    getCmsPlace.mockResolvedValue({ id: 31, cityId: 7 });
    attachMedia.mockResolvedValue({ id: 41 });
    requireCityCapability.mockResolvedValue(privilegedContext);

    await attachAuthorizedMedia({ entityType: "place", entityId: 31, mediaAssetId: 19, purpose: "hero" });

    expect(attachMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({ mediaAssetId: 19 }),
      privilegedContext.user.id,
      { allowPublicMutation: true },
    );
  });
});
