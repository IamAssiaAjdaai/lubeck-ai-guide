import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  transformPublicImage: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: mocks.readFile },
  readFile: mocks.readFile,
}));
vi.mock("@/lib/media/imageTransform.server", () => ({
  transformPublicImage: mocks.transformPublicImage,
  publicImageResponse: (body: Uint8Array) => new Response(Uint8Array.from(body).buffer, {
    headers: { "Content-Type": "image/webp", "Content-Length": String(body.byteLength) },
  }),
}));

import { cities } from "@/data/cities";
import { GET } from "@/app/api/content/image/route";

describe("legacy public image variants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readFile.mockResolvedValue(Uint8Array.from([1, 2, 3]));
    mocks.transformPublicImage.mockResolvedValue(Uint8Array.from([8, 9]));
  });

  it("transforms only allowlisted CITYWALK legacy images", async () => {
    const source = encodeURIComponent(cities.lubeck.heroImage);
    const response = await GET(new Request(
      `https://citywalk.example/api/content/image?source=${source}&variant=card`,
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(mocks.transformPublicImage).toHaveBeenCalledWith(expect.any(Uint8Array), "card");
  });

  it("fails closed for arbitrary paths and unsupported variants", async () => {
    const arbitrary = await GET(new Request(
      "https://citywalk.example/api/content/image?source=/.env.local&variant=card",
    ));
    const invalidVariant = await GET(new Request(
      `https://citywalk.example/api/content/image?source=${encodeURIComponent(cities.lubeck.heroImage)}&variant=original`,
    ));

    expect(arbitrary.status).toBe(404);
    expect(invalidVariant.status).toBe(404);
    expect(mocks.readFile).not.toHaveBeenCalled();
  });
});
