import "server-only";

import { getS3MediaEnvironment } from "@/lib/media/storage/environment.server";
import { S3MediaObjectStore } from "@/lib/media/storage/s3ObjectStore.server";
import type { MediaObjectStore } from "@/lib/media/storage/types";

let objectStore: MediaObjectStore | undefined;

export function getMediaObjectStore(): MediaObjectStore {
  objectStore ??= new S3MediaObjectStore(getS3MediaEnvironment());
  return objectStore;
}

export function setMediaObjectStoreForTesting(store: MediaObjectStore | undefined): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Media object store overrides are test-only.");
  }
  objectStore = store;
}
