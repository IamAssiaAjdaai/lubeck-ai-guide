import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertDistinctStorageMigrationEnvironments,
  getStorageMigrationDestinationEnvironment,
  getStorageMigrationSourceEnvironment,
} from "@/lib/media/storageMigration.server";

const source = {
  CITYWALK_MEDIA_MIGRATION_SOURCE_S3_ENDPOINT:
    "https://s3.eu-central-003.backblazeb2.com",
  CITYWALK_MEDIA_MIGRATION_SOURCE_S3_REGION: "eu-central-003",
  CITYWALK_MEDIA_MIGRATION_SOURCE_S3_BUCKET: "citywalk-source",
  CITYWALK_MEDIA_MIGRATION_SOURCE_S3_ACCESS_KEY_ID: "source-access",
  CITYWALK_MEDIA_MIGRATION_SOURCE_S3_SECRET_ACCESS_KEY: "source-secret",
};

const destination = {
  CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_ENDPOINT:
    "https://example-account.r2.cloudflarestorage.com",
  CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_REGION: "auto",
  CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_BUCKET: "citywalk-destination",
  CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_ACCESS_KEY_ID: "destination-access",
  CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_SECRET_ACCESS_KEY:
    "destination-secret",
};

describe("storage migration environments", () => {
  it("keeps explicit source and destination profiles isolated", () => {
    const environment = { ...source, ...destination };

    expect(getStorageMigrationSourceEnvironment(environment)).toEqual({
      endpoint: source.CITYWALK_MEDIA_MIGRATION_SOURCE_S3_ENDPOINT,
      region: "eu-central-003",
      bucket: "citywalk-source",
      accessKeyId: "source-access",
      secretAccessKey: "source-secret",
    });
    expect(getStorageMigrationDestinationEnvironment(environment)).toEqual({
      endpoint:
        destination.CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_ENDPOINT,
      region: "auto",
      bucket: "citywalk-destination",
      accessKeyId: "destination-access",
      secretAccessKey: "destination-secret",
    });
  });

  it("does not fall back to the normal runtime storage profile", () => {
    expect(() =>
      getStorageMigrationSourceEnvironment({
        CITYWALK_MEDIA_STORAGE: "s3",
        CITYWALK_MEDIA_S3_ENDPOINT: "https://runtime.example.com",
        CITYWALK_MEDIA_S3_REGION: "auto",
        CITYWALK_MEDIA_S3_BUCKET: "runtime",
        CITYWALK_MEDIA_S3_ACCESS_KEY_ID: "runtime-access",
        CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "runtime-secret",
      }),
    ).toThrow(/ENDPOINT/);
  });

  it("rejects an accidental source-to-source copy", () => {
    const profile = getStorageMigrationSourceEnvironment(source);
    expect(() =>
      assertDistinctStorageMigrationEnvironments(profile, profile),
    ).toThrow(/must be distinct/);
    expect(() =>
      assertDistinctStorageMigrationEnvironments(profile, {
        ...profile,
        bucket: "different-bucket",
      }),
    ).not.toThrow();
  });
});
