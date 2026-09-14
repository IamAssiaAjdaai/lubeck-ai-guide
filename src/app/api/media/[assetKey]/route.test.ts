import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getMediaObjectStore, getPublicMediaDeliveryAsset, transformPublicImage } = vi.hoisted(() => ({
  getMediaObjectStore: vi.fn(),
  getPublicMediaDeliveryAsset: vi.fn(),
  transformPublicImage: vi.fn(),
}));

vi.mock("@/lib/media/publicMedia.server", () => ({
  getPublicMediaDeliveryAsset,
}));
vi.mock("@/lib/media/storage/storage.server", () => ({
  getMediaObjectStore,
}));
vi.mock("@/lib/media/imageTransform.server", () => ({
  PUBLIC_IMAGE_CACHE_CONTROL: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
  transformPublicImage,
  publicImageResponse: (body: Uint8Array) => new Response(Uint8Array.from(body).buffer, {
    headers: { "Content-Type": "image/webp", "Content-Length": String(body.byteLength) },
  }),
}));

import { GET } from "@/app/api/media/[assetKey]/route";

const params = Promise.resolve({ assetKey: "0193c9be-62d1-7f9d-8ff2-08fc48fcb771" });

describe("public media delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams eligible private media without exposing storage details", async () => {
    getPublicMediaDeliveryAsset.mockResolvedValue({
      objectKey: "private/secret-object-key.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 3,
    });
    getMediaObjectStore.mockReturnValue({
      readObject: vi.fn().mockResolvedValue({
        body: byteStream([1, 2, 3]),
        contentLength: 3,
      }),
    });

    const response = await GET(new Request("https://citywalk.test/api/media/key"), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    const publicResponse = `${JSON.stringify(Object.fromEntries(response.headers))} ${await response.text()}`;
    expect(publicResponse).not.toContain("secret-object-key");
    expect(publicResponse).not.toContain("access-key");
    expect(publicResponse).not.toContain("bucket");
  });

  it("returns the same not-found response for every ineligible lifecycle or attachment state", async () => {
    getPublicMediaDeliveryAsset.mockResolvedValue(undefined);
    const response = await GET(new Request("https://citywalk.test/api/media/key"), { params });
    expect(response.status).toBe(404);
    expect(getMediaObjectStore).not.toHaveBeenCalled();
  });

  it("supports a single byte range for private audio and video", async () => {
    const readObject = vi.fn().mockResolvedValue({
      body: byteStream([2, 3]),
      contentLength: 2,
      contentRange: "bytes 1-2/3",
    });
    getPublicMediaDeliveryAsset.mockResolvedValue({
      objectKey: "private/media.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 3,
    });
    getMediaObjectStore.mockReturnValue({ readObject });

    const response = await GET(new Request("https://citywalk.test/api/media/key", {
      headers: { Range: "bytes=1-2" },
    }), { params });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 1-2/3");
    expect(readObject).toHaveBeenCalledWith("private/media.mp3", "bytes=1-2");
  });

  it("rejects malformed or out-of-bounds ranges before storage access", async () => {
    getPublicMediaDeliveryAsset.mockResolvedValue({
      objectKey: "private/media.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 3,
    });
    const response = await GET(new Request("https://citywalk.test/api/media/key", {
      headers: { Range: "bytes=9-10" },
    }), { params });
    expect(response.status).toBe(416);
    expect(getMediaObjectStore).not.toHaveBeenCalled();
  });

  it("serves a bounded WebP variant without exposing the original storage key", async () => {
    getPublicMediaDeliveryAsset.mockResolvedValue({
      objectKey: "private/original-city-image.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 3,
      kind: "image",
    });
    getMediaObjectStore.mockReturnValue({
      readObject: vi.fn().mockResolvedValue({ body: byteStream([1, 2, 3]), contentLength: 3 }),
    });
    transformPublicImage.mockResolvedValue(Uint8Array.from([8, 9]));

    const response = await GET(
      new Request("https://citywalk.test/api/media/key?variant=card"),
      { params },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(transformPublicImage).toHaveBeenCalledWith(expect.any(ArrayBuffer), "card");
    expect((await response.arrayBuffer()).byteLength).toBe(2);
  });

  it("fails closed for invalid image variants and variants on non-images", async () => {
    getPublicMediaDeliveryAsset.mockResolvedValue({
      objectKey: "private/audio.mp3", mimeType: "audio/mpeg", sizeBytes: 3, kind: "audio",
    });
    const invalid = await GET(
      new Request("https://citywalk.test/api/media/key?variant=huge"),
      { params },
    );
    const audio = await GET(
      new Request("https://citywalk.test/api/media/key?variant=card"),
      { params },
    );

    expect(invalid.status).toBe(404);
    expect(audio.status).toBe(404);
    expect(getMediaObjectStore).not.toHaveBeenCalled();
  });
});

function byteStream(bytes: readonly number[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(Uint8Array.from(bytes));
      controller.close();
    },
  });
}
