import type {
  CreateUploadUrlInput,
  MediaObjectStore,
  ReadableStoredObject,
  StoredObjectMetadata,
} from "@/lib/media/storage/types";

type FakeObject = Readonly<{
  bytes: Uint8Array;
  contentType: string;
  checksumSha256?: string;
}>;

export class FakeMediaObjectStore implements MediaObjectStore {
  readonly providerId = "s3-test";
  readonly uploadRequests: CreateUploadUrlInput[] = [];
  readonly deletedKeys: string[] = [];
  private readonly objects = new Map<string, FakeObject>();

  async createUploadUrl(input: CreateUploadUrlInput): Promise<string> {
    this.uploadRequests.push(input);
    return `https://upload.test.invalid/${encodeURIComponent(input.objectKey)}`;
  }

  async headObject(objectKey: string): Promise<StoredObjectMetadata | undefined> {
    const object = this.objects.get(objectKey);
    if (!object) return undefined;
    return {
      sizeBytes: object.bytes.byteLength,
      contentType: object.contentType,
      ...(object.checksumSha256 ? { checksumSha256: object.checksumSha256 } : {}),
    };
  }

  async readObjectRange(objectKey: string, start: number, end: number): Promise<Uint8Array> {
    const object = this.objects.get(objectKey);
    if (!object) throw new Error("Object not found.");
    return object.bytes.slice(start, end + 1);
  }

  async readObject(
    objectKey: string,
    range?: string,
  ): Promise<ReadableStoredObject | undefined> {
    const object = this.objects.get(objectKey);
    if (!object) return undefined;
    const bounds = range ? parseRange(range, object.bytes.byteLength) : undefined;
    const bytes = bounds
      ? object.bytes.slice(bounds.start, bounds.end + 1)
      : object.bytes;
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      contentLength: bytes.byteLength,
      ...(bounds
        ? { contentRange: `bytes ${bounds.start}-${bounds.end}/${object.bytes.byteLength}` }
        : {}),
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    this.deletedKeys.push(objectKey);
    this.objects.delete(objectKey);
  }

  async getAdminPreviewUrl(objectKey: string): Promise<string> {
    return `https://admin-preview.test.invalid/${encodeURIComponent(objectKey)}`;
  }

  seedObject(objectKey: string, object: FakeObject): void {
    this.objects.set(objectKey, object);
  }
}

function parseRange(
  range: string,
  size: number,
): { start: number; end: number } | undefined {
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (start < 0 || start >= size || end < start) return undefined;
  return { start, end: Math.min(end, size - 1) };
}
