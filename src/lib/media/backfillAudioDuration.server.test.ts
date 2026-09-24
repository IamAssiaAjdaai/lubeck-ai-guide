import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { backfillAudioDurations } from "@/lib/media/backfillAudioDuration.server";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

const baseAsset = {
  id: 1,
  kind: "audio",
  sourceType: "upload",
  objectKey: "media/1/story.mp3",
  mimeType: "audio/mpeg",
  durationSeconds: null,
} as const;

describe("audio duration backfill", () => {
  it("updates eligible uploads and isolates skips and failures", async () => {
    const store = new FakeMediaObjectStore();
    for (const id of [1, 7, 8, 9]) {
      store.seedObject(`media/${id}/story.mp3`, {
        bytes: Uint8Array.from([0x49, 0x44, 0x33]),
        contentType: "audio/mpeg",
      });
    }
    const assets = [
      baseAsset,
      { ...baseAsset, id: 2, kind: "image", objectKey: "media/2/image.jpg", mimeType: "image/jpeg" },
      { ...baseAsset, id: 3, durationSeconds: 42 },
      { ...baseAsset, id: 4, sourceType: "external", objectKey: null },
      { ...baseAsset, id: 5, objectKey: null },
      { ...baseAsset, id: 6, objectKey: "media/6/missing.mp3" },
      { ...baseAsset, id: 7, objectKey: "media/7/story.mp3" },
      { ...baseAsset, id: 8, objectKey: "media/8/story.mp3" },
      { ...baseAsset, id: 9, objectKey: "media/9/story.mp3" },
    ] as const;
    const extractDuration = vi.fn(async ({ objectKey }: { objectKey: string }) => {
      if (objectKey.includes("/7/")) return undefined;
      if (objectKey.includes("/8/")) throw new Error("unsupported");
      return 87;
    });
    const updateDuration = vi.fn(async (id: number) => id !== 9);

    await expect(
      backfillAudioDurations({
        listAssets: async () => assets,
        updateDuration,
        store,
        extractDuration,
      }),
    ).resolves.toEqual({ scanned: 9, updated: 1, skipped: 6, failed: 2 });

    expect(updateDuration).toHaveBeenCalledWith(1, 87);
    expect(updateDuration).toHaveBeenCalledWith(9, 87);
    expect(updateDuration).toHaveBeenCalledTimes(2);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    "never persists an invalid duration (%s)",
    async (durationSeconds) => {
      const store = new FakeMediaObjectStore();
      store.seedObject(baseAsset.objectKey, {
        bytes: Uint8Array.from([0x49, 0x44, 0x33]),
        contentType: "audio/mpeg",
      });
      const updateDuration = vi.fn();

      await expect(
        backfillAudioDurations({
          listAssets: async () => [baseAsset],
          updateDuration,
          store,
          extractDuration: async () => durationSeconds,
        }),
      ).resolves.toEqual({ scanned: 1, updated: 0, skipped: 0, failed: 1 });
      expect(updateDuration).not.toHaveBeenCalled();
    },
  );
});
