import "server-only";

import { parseWebStream } from "music-metadata";

import type { MediaObjectStore } from "@/lib/media/storage/types";

export type AudioDurationInput = Readonly<{
  store: MediaObjectStore;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
}>;

export type AudioDurationExtractor = (
  input: AudioDurationInput,
) => Promise<number | undefined>;

export const extractAudioDurationSeconds: AudioDurationExtractor = async ({
  store,
  objectKey,
  mimeType,
  sizeBytes,
}) => {
  let body: ReadableStream<Uint8Array> | undefined;

  try {
    const object = await store.readObject(objectKey);
    if (!object) return undefined;
    body = object.body;

    const metadata = await parseWebStream(
      body,
      { mimeType, size: sizeBytes },
      { duration: true, skipCovers: true },
    );
    const durationSeconds = metadata.format.duration;

    return isReliableDuration(durationSeconds) ? durationSeconds : undefined;
  } catch {
    return undefined;
  } finally {
    if (body && !body.locked) {
      await body.cancel().catch(() => undefined);
    }
  }
};

function isReliableDuration(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}
