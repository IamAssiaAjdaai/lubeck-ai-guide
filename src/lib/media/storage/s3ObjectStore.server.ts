import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { S3MediaEnvironment } from "@/lib/media/storage/environment.server";
import type {
  CreateUploadUrlInput,
  MediaObjectStore,
  ReadableStoredObject,
  StoredObjectMetadata,
} from "@/lib/media/storage/types";

export class S3MediaObjectStore implements MediaObjectStore {
  readonly providerId = "s3";
  private readonly client: S3Client;

  constructor(private readonly config: S3MediaEnvironment) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  createUploadUrl(input: CreateUploadUrlInput): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresInSeconds },
    );
  }

  async writeObject(
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async headObject(objectKey: string): Promise<StoredObjectMetadata | undefined> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: objectKey }),
      );
      if (result.ContentLength === undefined) return undefined;
      return {
        sizeBytes: result.ContentLength,
        ...(result.ContentType ? { contentType: result.ContentType } : {}),
        ...(result.ChecksumSHA256 ? { checksumSha256: result.ChecksumSHA256 } : {}),
      };
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async readObjectRange(objectKey: string, start: number, end: number): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        Range: `bytes=${start}-${end}`,
      }),
    );
    if (!result.Body) throw new Error("Stored media object has no readable body.");
    return result.Body.transformToByteArray();
  }

  async readObject(
    objectKey: string,
    range?: string,
  ): Promise<ReadableStoredObject | undefined> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
          ...(range ? { Range: range } : {}),
        }),
      );
      if (!result.Body) return undefined;
      return {
        body: result.Body.transformToWebStream(),
        ...(result.ContentLength !== undefined
          ? { contentLength: result.ContentLength }
          : {}),
        ...(result.ContentRange ? { contentRange: result.ContentRange } : {}),
      };
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: objectKey }),
    );
  }

  getAdminPreviewUrl(objectKey: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: objectKey }),
      { expiresIn: expiresInSeconds },
    );
  }

}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404;
}

