import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  attachMedia: vi.fn(),
  createMediaUploadRecord: vi.fn(),
  finalizeMediaAsset: vi.fn(),
  saveAudioGenerationMetadata: vi.fn(),
  setMediaLifecycle: vi.fn(),
  getCmsPlace: vi.fn(),
  requireAdminCapability: vi.fn(),
  requireCityCapability: vi.fn(),
}));

vi.mock("@/lib/media/repository.server", () => ({
  attachMedia: mocks.attachMedia,
  createMediaUploadRecord: mocks.createMediaUploadRecord,
  finalizeMediaAsset: mocks.finalizeMediaAsset,
  setMediaLifecycle: mocks.setMediaLifecycle,
}));
vi.mock("@/lib/admin/operations/repository.server", () => ({
  saveAudioGenerationMetadata: mocks.saveAudioGenerationMetadata,
}));
vi.mock("@/lib/admin/authorization.server", () => ({
  requireAdminCapability: mocks.requireAdminCapability,
  requireCityCapability: mocks.requireCityCapability,
}));
vi.mock("@/lib/admin/content/repository.server", () => ({
  CmsContentIntegrityError: class extends Error {},
  CmsContentNotFoundError: class extends Error {},
  getCmsPlace: mocks.getCmsPlace,
}));

import { generateAudioCandidate, generateAuthorizedAudioCandidate } from "@/lib/admin/operations/audioGeneration.server";
import { hashNarrationSource } from "@/lib/admin/operations/audioOperations";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

describe("generated audio orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMediaUploadRecord.mockResolvedValue({ id: 91, approvalStatus: "uploading" });
    mocks.finalizeMediaAsset.mockResolvedValue({ id: 91, approvalStatus: "pending_review" });
    mocks.saveAudioGenerationMetadata.mockResolvedValue({ mediaAssetId: 91 });
    mocks.attachMedia.mockResolvedValue({ id: 101, position: 1 });
    mocks.setMediaLifecycle.mockResolvedValue({ id: 91, approvalStatus: "archived" });
    mocks.requireAdminCapability.mockResolvedValue({ user: { id: "editor-1" } });
    mocks.requireCityCapability.mockResolvedValue({ user: { id: "editor-1" } });
    mocks.getCmsPlace.mockResolvedValue({ id: 7, cityId: 2, slug: "gate", localizations: [{ locale: "de", story: "Story" }] });
  });

  it("stores exact-locale provenance and creates a private candidate", async () => {
    const store = new FakeMediaObjectStore();
    const provider = {
      id: "fake-tts",
      generate: vi.fn().mockResolvedValue({
        bytes: Uint8Array.from([0x49, 0x44, 0x33]),
        mimeType: "audio/mpeg" as const,
        filename: "story-de.mp3",
        durationSeconds: 12.5,
      }),
    };
    await generateAudioCandidate({
      place: { id: 7, cityId: 2, slug: "gate" },
      locale: "de",
      story: " Deutsche Geschichte ",
      actorId: "editor-1",
      provider,
      store,
    });

    expect(provider.generate).toHaveBeenCalledWith({ text: " Deutsche Geschichte ", locale: "de", voiceId: undefined });
    expect(mocks.saveAudioGenerationMetadata).toHaveBeenCalledWith({
      mediaAssetId: 91,
      provider: "fake-tts",
      voiceId: undefined,
      sourceLocale: "de",
      sourceTextHash: hashNarrationSource(" Deutsche Geschichte "),
    });
    expect(mocks.attachMedia).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 7, locale: "de", position: 1, purpose: "audio" }),
      "editor-1",
      { allowPublicMutation: false },
    );
    expect(mocks.finalizeMediaAsset).toHaveBeenCalledWith(91, expect.objectContaining({ durationSeconds: 12.5 }), "editor-1");
  });

  it("cleans up safely when candidate attachment fails", async () => {
    const store = new FakeMediaObjectStore();
    mocks.attachMedia.mockRejectedValue(new Error("candidate occupied"));
    const provider = {
      id: "fake-tts",
      generate: vi.fn().mockResolvedValue({ bytes: Uint8Array.from([0x49, 0x44, 0x33]), mimeType: "audio/mpeg" as const, filename: "story.mp3" }),
    };
    await expect(generateAudioCandidate({ place: { id: 7, cityId: 2, slug: "gate" }, locale: "de", story: "Story", actorId: "editor-1", provider, store })).rejects.toThrow("candidate occupied");
    expect(mocks.setMediaLifecycle).toHaveBeenCalledWith(91, "archived", "editor-1");
  });

  it("fails safely when production TTS is not configured", async () => {
    await expect(generateAuthorizedAudioCandidate(7, "de")).rejects.toThrow("Audio generation is not configured.");
    expect(mocks.createMediaUploadRecord).not.toHaveBeenCalled();
  });
});
