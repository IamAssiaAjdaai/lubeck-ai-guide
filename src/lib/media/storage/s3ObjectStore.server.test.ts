import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientConfig: undefined as unknown,
  send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@aws-sdk/client-s3", () => {
  class Command {
    constructor(readonly input: unknown) {}
  }
  return {
    S3Client: class {
      constructor(config: unknown) {
        mocks.clientConfig = config;
      }
      send = mocks.send;
    },
    PutObjectCommand: Command,
    HeadObjectCommand: Command,
    GetObjectCommand: Command,
    DeleteObjectCommand: Command,
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

import { S3MediaObjectStore } from "@/lib/media/storage/s3ObjectStore.server";

const config = {
  endpoint: "https://example-account.r2.cloudflarestorage.com",
  region: "auto",
  bucket: "citywalk-preview",
  accessKeyId: "test-access",
  secretAccessKey: "test-secret",
};

describe("S3MediaObjectStore", () => {
  beforeEach(() => {
    mocks.send.mockReset();
    mocks.getSignedUrl.mockReset();
    mocks.clientConfig = undefined;
  });

  it("uses the generic S3 configuration required by Cloudflare R2", () => {
    new S3MediaObjectStore(config);

    expect(mocks.clientConfig).toEqual({
      endpoint: config.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: "test-access",
        secretAccessKey: "test-secret",
      },
      forcePathStyle: true,
    });
  });

  it("supports put, head, get, range get and delete with an unchanged key", async () => {
    const store = new S3MediaObjectStore(config);
    const body = {
      transformToByteArray: vi.fn().mockResolvedValue(new Uint8Array([1, 2])),
      transformToWebStream: vi.fn().mockReturnValue(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2]));
            controller.close();
          },
        }),
      ),
    };
    mocks.send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ ContentLength: 2, ContentType: "image/jpeg" })
      .mockResolvedValueOnce({ Body: body })
      .mockResolvedValueOnce({
        Body: body,
        ContentLength: 2,
        ContentRange: "bytes 0-1/2",
      })
      .mockResolvedValueOnce({});

    await store.writeObject("same/key.jpg", new Uint8Array([1, 2]), "image/jpeg");
    await expect(store.headObject("same/key.jpg")).resolves.toEqual({
      sizeBytes: 2,
      contentType: "image/jpeg",
    });
    await expect(store.readObjectRange("same/key.jpg", 0, 1)).resolves.toEqual(
      new Uint8Array([1, 2]),
    );
    await expect(store.readObject("same/key.jpg", "bytes=0-1")).resolves.toMatchObject({
      contentLength: 2,
      contentRange: "bytes 0-1/2",
    });
    await store.deleteObject("same/key.jpg");

    expect(mocks.send.mock.calls.map(([command]) => command.input)).toEqual([
      expect.objectContaining({ Key: "same/key.jpg", ContentType: "image/jpeg" }),
      expect.objectContaining({ Key: "same/key.jpg" }),
      expect.objectContaining({ Key: "same/key.jpg", Range: "bytes=0-1" }),
      expect.objectContaining({ Key: "same/key.jpg", Range: "bytes=0-1" }),
      expect.objectContaining({ Key: "same/key.jpg" }),
    ]);
  });

  it("creates signed upload and private preview URLs without exposing credentials", async () => {
    const store = new S3MediaObjectStore(config);
    mocks.getSignedUrl
      .mockResolvedValueOnce("https://signed.example/upload")
      .mockResolvedValueOnce("https://signed.example/preview");

    await expect(
      store.createUploadUrl({
        objectKey: "same/key.jpg",
        contentType: "image/jpeg",
        expiresInSeconds: 300,
      }),
    ).resolves.toBe("https://signed.example/upload");
    await expect(store.getAdminPreviewUrl("same/key.jpg")).resolves.toBe(
      "https://signed.example/preview",
    );
    expect(JSON.stringify(mocks.getSignedUrl.mock.calls)).not.toContain(
      "test-secret",
    );
  });
});
