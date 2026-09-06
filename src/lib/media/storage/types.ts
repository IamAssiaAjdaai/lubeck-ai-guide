export type CreateUploadUrlInput = Readonly<{
  objectKey: string;
  contentType: string;
  expiresInSeconds: number;
}>;

export type StoredObjectMetadata = Readonly<{
  sizeBytes: number;
  contentType?: string;
  checksumSha256?: string;
}>;

export interface MediaObjectStore {
  readonly providerId: string;
  createUploadUrl(input: CreateUploadUrlInput): Promise<string>;
  headObject(objectKey: string): Promise<StoredObjectMetadata | undefined>;
  readObjectRange(objectKey: string, start: number, end: number): Promise<Uint8Array>;
  deleteObject(objectKey: string): Promise<void>;
  getAdminPreviewUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
  getPublicUrl(objectKey: string): string;
}

