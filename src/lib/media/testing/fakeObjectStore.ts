import type {
  CreateUploadUrlInput,
  MediaObjectStore,
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

  async deleteObject(objectKey: string): Promise<void> {
    this.deletedKeys.push(objectKey);
    this.objects.delete(objectKey);
  }

  async getAdminPreviewUrl(objectKey: string): Promise<string> {
    return `https://admin-preview.test.invalid/${encodeURIComponent(objectKey)}`;
  }

  getPublicUrl(objectKey: string): string {
    return `https://cdn.test.invalid/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  }

  seedObject(objectKey: string, object: FakeObject): void {
    this.objects.set(objectKey, object);
  }
}
