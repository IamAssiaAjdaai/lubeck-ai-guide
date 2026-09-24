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

export type ReadableStoredObject = Readonly<{
  body: ReadableStream<Uint8Array>;
  contentLength?: number;
  contentRange?: string;
}>;

export interface MediaObjectStore {
  readonly providerId: string;
  createUploadUrl(input: CreateUploadUrlInput): Promise<string>;
  writeObject(
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void>;
  headObject(objectKey: string): Promise<StoredObjectMetadata | undefined>;
  readObjectRange(objectKey: string, start: number, end: number): Promise<Uint8Array>;
  readObject(objectKey: string, range?: string): Promise<ReadableStoredObject | undefined>;
  deleteObject(objectKey: string): Promise<void>;
  getAdminPreviewUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
}

