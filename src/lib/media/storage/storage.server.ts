import "server-only";

import { getS3MediaEnvironment } from "@/lib/media/storage/environment.server";
import { LocalFilesystemMediaObjectStore } from "@/lib/media/storage/localFilesystemObjectStore.server";
import { S3MediaObjectStore } from "@/lib/media/storage/s3ObjectStore.server";
import type { MediaObjectStore } from "@/lib/media/storage/types";

let objectStore: MediaObjectStore | undefined;

export function getMediaObjectStore(): MediaObjectStore {
  objectStore ??= createMediaObjectStore();
  return objectStore;
}

export function createMediaObjectStore(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MediaObjectStore {
  if (shouldUseLocalFilesystemMediaStorage(environment)) {
    return new LocalFilesystemMediaObjectStore();
  }
  return new S3MediaObjectStore(getS3MediaEnvironment(environment));
}

export function shouldUseLocalFilesystemMediaStorage(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  if (environment.NODE_ENV !== "development") return false;
  const endpoint = environment.CITYWALK_MEDIA_S3_ENDPOINT?.trim();
  return !endpoint;
}

export function setMediaObjectStoreForTesting(store: MediaObjectStore | undefined): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Media object store overrides are test-only.");
  }
  objectStore = store;
}
