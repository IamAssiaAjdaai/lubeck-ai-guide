import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";
import {
  getStorageErrorCategory,
  isStorageCapExceeded,
  migrateStoredMediaObjects,
  verifyObjectStoreConnectivity,
  type StoredMediaInventoryItem,
} from "@/lib/media/storageMigration";

const bytes = new TextEncoder().encode("verified media bytes");
const item = (
  assetId: number,
  objectKey = `media/${assetId}/original.jpg`,
): StoredMediaInventoryItem => ({
  assetId,
  objectKey,
  mimeType: "image/jpeg",
  expectedSizeBytes: bytes.byteLength,
  lifecycleStatus: "approved",
  citySlug: "test-city",
  attachmentCount: 1,
  associations: ["place:test-city/test-place"],
});

describe("storage migration", () => {
  it("copies the exact key and verifies size, content type and bytes", async () => {
    const source = new FakeMediaObjectStore();
    const destination = new FakeMediaObjectStore();
    source.seedObject(item(1).objectKey, { bytes, contentType: "image/jpeg" });

    const result = await migrateStoredMediaObjects({
      inventory: [item(1)],
      source,
      destination,
    });

    expect(result).toEqual({
      totalExpected: 1,
      copied: 1,
      verified: 1,
      skipped: 0,
      failed: 0,
      blockedAssetIds: [],
    });
    expect(await destination.readObject(item(1).objectKey)).toBeDefined();
    expect(source.deletedKeys).toEqual([]);
  });

  it("is idempotent when destination bytes already match", async () => {
    const source = new FakeMediaObjectStore();
    const destination = new FakeMediaObjectStore();
    source.seedObject(item(2).objectKey, { bytes, contentType: "image/jpeg" });
    destination.seedObject(item(2).objectKey, {
      bytes,
      contentType: "image/jpeg",
    });

    await expect(
      migrateStoredMediaObjects({
        inventory: [item(2)],
        source,
        destination,
      }),
    ).resolves.toEqual({
      totalExpected: 1,
      copied: 0,
      verified: 1,
      skipped: 1,
      failed: 0,
      blockedAssetIds: [],
    });
  });

  it("rejects source bytes that disagree with DB size or checksum", async () => {
    const source = new FakeMediaObjectStore();
    const destination = new FakeMediaObjectStore();
    source.seedObject(item(3).objectKey, { bytes, contentType: "image/jpeg" });
    source.seedObject(item(4).objectKey, { bytes, contentType: "image/jpeg" });

    const result = await migrateStoredMediaObjects({
      inventory: [
        { ...item(3), expectedSizeBytes: bytes.byteLength + 1 },
        {
          ...item(4),
          checksumSha256: createHash("sha256").update("different").digest("hex"),
        },
      ],
      source,
      destination,
    });

    expect(result.failed).toBe(2);
    expect(result.copied).toBe(0);
    expect(await destination.headObject(item(3).objectKey)).toBeUndefined();
  });

  it("stops after a source storage cap and reports every blocked asset", async () => {
    const source = new FakeMediaObjectStore();
    source.readObject = async () => {
      throw Object.assign(new Error("Class B transaction cap exceeded"), {
        name: "AccessDenied",
      });
    };

    const result = await migrateStoredMediaObjects({
      inventory: [item(10), item(11), item(12)],
      source,
      destination: new FakeMediaObjectStore(),
    });

    expect(result).toMatchObject({
      copied: 0,
      verified: 0,
      failed: 3,
      blockedAssetIds: [10, 11, 12],
    });
    expect(
      isStorageCapExceeded(
        Object.assign(new Error("download bandwidth cap exceeded"), {
          name: "AccessDenied",
        }),
      ),
    ).toBe(true);
    expect(
      getStorageErrorCategory({
        name: "SignatureDoesNotMatch",
        message: "must never be returned",
      }),
    ).toBe("signature_mismatch");
  });

  it("tests direct and presigned destination operations and cleans up", async () => {
    const destination = new FakeMediaObjectStore();
    await verifyObjectStoreConnectivity(
      destination,
      async (url, uploadBytes, contentType) => {
        const key = decodeURIComponent(url.split("/").at(-1)!);
        destination.seedObject(key, { bytes: uploadBytes, contentType });
      },
    );

    expect(destination.uploadRequests).toHaveLength(1);
    expect(destination.uploadRequests[0]?.contentType).toBe("text/plain");
    expect(destination.deletedKeys).toHaveLength(2);
    await expect(
      destination.headObject(destination.deletedKeys[0]!),
    ).resolves.toBeUndefined();
  });
});
