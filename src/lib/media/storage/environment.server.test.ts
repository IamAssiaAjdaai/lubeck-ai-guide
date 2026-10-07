import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getS3MediaEnvironment } from "@/lib/media/storage/environment.server";

const valid = {
  CITYWALK_MEDIA_STORAGE: "s3",
  CITYWALK_MEDIA_S3_ENDPOINT: "https://storage.example.com",
  CITYWALK_MEDIA_S3_REGION: "auto",
  CITYWALK_MEDIA_S3_BUCKET: "citywalk-preview",
  CITYWALK_MEDIA_S3_ACCESS_KEY_ID: "test-access",
  CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "test-secret",
};

describe("S3 media environment", () => {
  it("returns validated server-only configuration", () => {
    expect(getS3MediaEnvironment(valid)).toEqual({ endpoint: valid.CITYWALK_MEDIA_S3_ENDPOINT, region: "auto", bucket: "citywalk-preview", accessKeyId: "test-access", secretAccessKey: "test-secret" });
  });

  it("uses zero-config local object storage only in development", () => {
    expect(getS3MediaEnvironment({ NODE_ENV: "development" })).toEqual({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      bucket: "citywalk-local",
      accessKeyId: "citywalk-local",
      secretAccessKey: "citywalk-local-secret",
    });
    expect(getS3MediaEnvironment({
      NODE_ENV: "development",
      CITYWALK_MEDIA_STORAGE: "s3",
      CITYWALK_MEDIA_S3_ENDPOINT: "",
      CITYWALK_MEDIA_S3_REGION: "",
      CITYWALK_MEDIA_S3_BUCKET: "",
      CITYWALK_MEDIA_S3_ACCESS_KEY_ID: "",
      CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "",
    })).toEqual({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      bucket: "citywalk-local",
      accessKeyId: "citywalk-local",
      secretAccessKey: "citywalk-local-secret",
    });
  });

  it("keeps explicit development media configuration", () => {
    expect(getS3MediaEnvironment({ NODE_ENV: "development", ...valid })).toEqual({
      endpoint: valid.CITYWALK_MEDIA_S3_ENDPOINT,
      region: "auto",
      bucket: "citywalk-preview",
      accessKeyId: "test-access",
      secretAccessKey: "test-secret",
    });
  });

  it("fails clearly only when media configuration is requested outside development", () => {
    expect(() => getS3MediaEnvironment({})).toThrow(/not configured/);
    expect(() => getS3MediaEnvironment({ ...valid, CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "" })).toThrow(/SECRET_ACCESS_KEY/);
  });

  it("rejects insecure remote endpoints and credentials in URLs", () => {
    expect(() => getS3MediaEnvironment({ ...valid, CITYWALK_MEDIA_S3_ENDPOINT: "http://storage.example.com" })).toThrow(/HTTPS/);
    expect(() => getS3MediaEnvironment({ ...valid, CITYWALK_MEDIA_S3_ENDPOINT: "https://user:pass@storage.example.com" })).toThrow(/credentials/);
  });

  it("does not use any NEXT_PUBLIC credential fallback", () => {
    expect(() => getS3MediaEnvironment({ NEXT_PUBLIC_CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "leak" })).toThrow(/not configured/);
  });
});
