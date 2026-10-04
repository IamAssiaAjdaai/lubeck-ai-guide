import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  generateStoredImageVariants,
  storedImageVariantKey,
} from "@/lib/media/imageVariantGeneration.server";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

describe("stored image variant generation", () => {
  it("uses sibling immutable variant keys", () => {
    expect(storedImageVariantKey("media/id/original.jpg", "card"))
      .toBe("media/id/variants/card.webp");
  });

  it("writes every bounded WebP variant to object storage", async () => {
    const store = new FakeMediaObjectStore();
    const original = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: "#2563eb" },
    }).jpeg().toBuffer();
    store.seedObject("media/id/original.jpg", {
      bytes: original,
      contentType: "image/jpeg",
    });

    await generateStoredImageVariants(store, "media/id/original.jpg");

    for (const variant of ["thumbnail", "card", "detail", "hero"] as const) {
      const object = await store.readObject(`media/id/variants/${variant}.webp`);
      expect(object).toBeDefined();
      const bytes = await new Response(object!.body).arrayBuffer();
      const metadata = await sharp(bytes).metadata();
      expect(metadata.format).toBe("webp");
    }
    const card = await store.readObject("media/id/variants/card.webp");
    const cardBytes = await new Response(card!.body).arrayBuffer();
    expect((await sharp(cardBytes).metadata()).width).toBe(720);
  });
});
