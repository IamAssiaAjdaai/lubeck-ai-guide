import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PUBLIC_IMAGE_CACHE_CONTROL,
  publicImageResponse,
  transformPublicImage,
} from "@/lib/media/imageTransform.server";

describe("public image transformation", () => {
  it("creates a bounded WebP card variant without enlarging the original", async () => {
    const original = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: "#2563eb" },
    }).jpeg().toBuffer();

    const transformed = await transformPublicImage(original, "card");
    const metadata = await sharp(transformed).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(720);
    expect(metadata.height).toBe(480);
    expect(transformed.byteLength).toBeLessThan(original.byteLength);
  });

  it("returns immutable-format metadata with a long shared cache window", async () => {
    const body = Uint8Array.from([1, 2, 3]);
    const response = publicImageResponse(body);

    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Length")).toBe("3");
    expect(response.headers.get("Cache-Control")).toBe(PUBLIC_IMAGE_CACHE_CONTROL);
  });
});
