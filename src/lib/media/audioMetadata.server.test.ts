import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractAudioDurationSeconds } from "@/lib/media/audioMetadata.server";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

describe("audio metadata extraction", () => {
  it("extracts the known duration from an uploaded MP3 stream", async () => {
    const bytes = new Uint8Array(
      await readFile(resolve(process.cwd(), "public/audio/holstentor-de.mp3")),
    );
    const store = new FakeMediaObjectStore();
    store.seedObject("media/test/story-de.mp3", {
      bytes,
      contentType: "audio/mpeg",
    });

    const durationSeconds = await extractAudioDurationSeconds({
      store,
      objectKey: "media/test/story-de.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: bytes.byteLength,
    });

    expect(durationSeconds).toBeCloseTo(72.744, 3);
  });

  it("returns undefined when duration extraction fails", async () => {
    const store = new FakeMediaObjectStore();
    store.seedObject("media/test/broken.mp3", {
      bytes: Uint8Array.from([0x49, 0x44, 0x33]),
      contentType: "audio/mpeg",
    });

    await expect(
      extractAudioDurationSeconds({
        store,
        objectKey: "media/test/broken.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 3,
      }),
    ).resolves.toBeUndefined();
  });
});
