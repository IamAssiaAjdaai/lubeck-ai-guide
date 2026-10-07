import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createMediaObjectStore,
  shouldUseLocalFilesystemMediaStorage,
} from "@/lib/media/storage/storage.server";

const s3Environment = {
  NODE_ENV: "development",
  CITYWALK_MEDIA_STORAGE: "s3",
  CITYWALK_MEDIA_S3_ENDPOINT: "https://storage.example.com",
  CITYWALK_MEDIA_S3_REGION: "auto",
  CITYWALK_MEDIA_S3_BUCKET: "citywalk-preview",
  CITYWALK_MEDIA_S3_ACCESS_KEY_ID: "test-access",
  CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "test-secret",
};

describe("media object store selection", () => {
  it("uses local filesystem storage in development when no S3 endpoint is configured", () => {
    expect(
      shouldUseLocalFilesystemMediaStorage({
        NODE_ENV: "development",
        CITYWALK_MEDIA_STORAGE: "s3",
        CITYWALK_MEDIA_S3_ENDPOINT: "",
      }),
    ).toBe(true);
    expect(
      createMediaObjectStore({
        NODE_ENV: "development",
        CITYWALK_MEDIA_STORAGE: "s3",
        CITYWALK_MEDIA_S3_ENDPOINT: "",
      }).providerId,
    ).toBe("local-filesystem");
  });

  it("keeps explicitly configured S3 available during development", () => {
    expect(shouldUseLocalFilesystemMediaStorage(s3Environment)).toBe(false);
    expect(createMediaObjectStore(s3Environment).providerId).toBe("s3");
  });

  it("never silently falls back to filesystem storage outside development", () => {
    expect(
      shouldUseLocalFilesystemMediaStorage({
        NODE_ENV: "production",
        CITYWALK_MEDIA_STORAGE: "s3",
        CITYWALK_MEDIA_S3_ENDPOINT: "",
      }),
    ).toBe(false);
    expect(() =>
      createMediaObjectStore({
        NODE_ENV: "production",
        CITYWALK_MEDIA_STORAGE: "s3",
        CITYWALK_MEDIA_S3_ENDPOINT: "",
      }),
    ).toThrow(/S3_ENDPOINT/);
  });
});
