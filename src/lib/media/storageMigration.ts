import { createHash, randomUUID } from "node:crypto";

import type { MediaObjectStore } from "@/lib/media/storage/types";

export type StoredMediaInventoryItem = Readonly<{
  assetId: number;
  objectKey: string;
  mimeType: string;
  expectedSizeBytes?: number;
  checksumSha256?: string;
  lifecycleStatus: string;
  citySlug: string;
  attachmentCount: number;
  associations: readonly string[];
}>;

export type StorageMigrationResult = Readonly<{
  totalExpected: number;
  copied: number;
  verified: number;
  skipped: number;
  failed: number;
  blockedAssetIds: readonly number[];
}>;

type PresignedUpload = (
  url: string,
  bytes: Uint8Array,
  contentType: string,
) => Promise<void>;

export async function verifyObjectStoreConnectivity(
  store: MediaObjectStore,
  uploadViaPresignedUrl: PresignedUpload = uploadWithFetch,
): Promise<void> {
  const prefix = `migration-test/${randomUUID()}`;
  const directKey = `${prefix}/direct.txt`;
  const signedKey = `${prefix}/signed.txt`;
  const directBytes = new TextEncoder().encode("CITYWALK storage connectivity");
  const signedBytes = new TextEncoder().encode("CITYWALK presigned upload");
  const contentType = "text/plain";

  try {
    await store.writeObject(directKey, directBytes, contentType);
    await assertStoredObject(store, directKey, directBytes, contentType);

    const range = await store.readObjectRange(directKey, 0, 7);
    if (!equalBytes(range, directBytes.slice(0, 8))) {
      throw new Error("Destination range read returned unexpected bytes.");
    }

    const uploadUrl = await store.createUploadUrl({
      objectKey: signedKey,
      contentType,
      expiresInSeconds: 300,
    });
    await uploadViaPresignedUrl(uploadUrl, signedBytes, contentType);
    await assertStoredObject(store, signedKey, signedBytes, contentType);
  } finally {
    await Promise.allSettled([
      store.deleteObject(directKey),
      store.deleteObject(signedKey),
    ]);
  }
}

export async function migrateStoredMediaObjects(input: Readonly<{
  inventory: readonly StoredMediaInventoryItem[];
  source: MediaObjectStore;
  destination: MediaObjectStore;
}>): Promise<StorageMigrationResult> {
  let copied = 0;
  let verified = 0;
  let skipped = 0;
  let failed = 0;
  const blockedAssetIds: number[] = [];

  for (let index = 0; index < input.inventory.length; index += 1) {
    const item = input.inventory[index]!;
    let sourceBytes: Uint8Array;

    try {
      const sourceObject = await input.source.readObject(item.objectKey);
      if (!sourceObject) {
        failed += 1;
        continue;
      }
      sourceBytes = await readAllBytes(sourceObject.body);
      assertInventoryIntegrity(item, sourceBytes);
    } catch (error) {
      if (isStorageCapExceeded(error)) {
        const remaining = input.inventory.slice(index).map(({ assetId }) => assetId);
        blockedAssetIds.push(...remaining);
        failed += remaining.length;
        break;
      }
      failed += 1;
      continue;
    }

    try {
      if (await destinationAlreadyMatches(
        input.destination,
        item,
        sourceBytes,
      )) {
        skipped += 1;
        verified += 1;
        continue;
      }

      await input.destination.writeObject(
        item.objectKey,
        sourceBytes,
        item.mimeType,
      );
      copied += 1;
      await assertStoredObject(
        input.destination,
        item.objectKey,
        sourceBytes,
        item.mimeType,
      );
      verified += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    totalExpected: input.inventory.length,
    copied,
    verified,
    skipped,
    failed,
    blockedAssetIds,
  };
}

export function isStorageCapExceeded(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; message?: string };
  return candidate.name === "AccessDenied" &&
    /(?:cap exceeded|bandwidth|class\s*b|transaction)/i.test(
      candidate.message ?? "",
    );
}

export function getStorageErrorCategory(error: unknown): string {
  if (isStorageCapExceeded(error)) return "source_cap_exceeded";
  if (!error || typeof error !== "object") return "unknown_error";
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const knownNames: Readonly<Record<string, string>> = {
    AccessDenied: "access_denied",
    InvalidAccessKeyId: "invalid_access_key",
    SignatureDoesNotMatch: "signature_mismatch",
    NoSuchBucket: "bucket_not_found",
    NoSuchKey: "object_not_found",
    NotFound: "object_not_found",
    TimeoutError: "timeout",
  };
  return knownNames[candidate.name ?? ""] ??
    (candidate.$metadata?.httpStatusCode
      ? `http_${candidate.$metadata.httpStatusCode}`
      : "unknown_error");
}

async function destinationAlreadyMatches(
  destination: MediaObjectStore,
  item: StoredMediaInventoryItem,
  sourceBytes: Uint8Array,
): Promise<boolean> {
  const metadata = await destination.headObject(item.objectKey);
  if (!metadata || metadata.sizeBytes !== sourceBytes.byteLength) return false;
  if (metadata.contentType !== item.mimeType) return false;

  const stored = await destination.readObject(item.objectKey);
  if (!stored) return false;
  const destinationBytes = await readAllBytes(stored.body);
  return equalHashes(sourceBytes, destinationBytes);
}

async function assertStoredObject(
  store: MediaObjectStore,
  objectKey: string,
  expectedBytes: Uint8Array,
  expectedContentType: string,
): Promise<void> {
  const metadata = await store.headObject(objectKey);
  if (!metadata || metadata.sizeBytes !== expectedBytes.byteLength) {
    throw new Error("Destination object size verification failed.");
  }
  if (metadata.contentType !== expectedContentType) {
    throw new Error("Destination object content-type verification failed.");
  }

  const stored = await store.readObject(objectKey);
  if (!stored) throw new Error("Destination object could not be read.");
  const storedBytes = await readAllBytes(stored.body);
  if (!equalHashes(expectedBytes, storedBytes)) {
    throw new Error("Destination object checksum verification failed.");
  }
}

function assertInventoryIntegrity(
  item: StoredMediaInventoryItem,
  bytes: Uint8Array,
): void {
  if (
    item.expectedSizeBytes !== undefined &&
    bytes.byteLength !== item.expectedSizeBytes
  ) {
    throw new Error("Source object size does not match database metadata.");
  }
  if (
    item.checksumSha256 &&
    normalizeChecksum(item.checksumSha256) !== sha256Hex(bytes)
  ) {
    throw new Error("Source object checksum does not match database metadata.");
  }
}

async function readAllBytes(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function equalHashes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength &&
    sha256Hex(left) === sha256Hex(right);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength &&
    left.every((value, index) => value === right[index]);
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeChecksum(value: string): string {
  return value.trim().toLowerCase().replace(/^sha256:/, "");
}

async function uploadWithFetch(
  url: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: new Uint8Array(bytes).buffer,
  });
  if (!response.ok) {
    throw new Error("Presigned upload connectivity check failed.");
  }
}
