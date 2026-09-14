import { describe, expect, it } from "vitest";

import {
  PUBLIC_IMAGE_VARIANT_SPECS,
  isPublicImageVariant,
  publicLegacyImageVariants,
  publicMediaImageVariants,
} from "@/lib/media/imageVariants";

describe("public image variants", () => {
  it("defines bounded card, detail, hero and thumbnail delivery sizes", () => {
    expect(PUBLIC_IMAGE_VARIANT_SPECS).toEqual({
      thumbnail: { width: 320, quality: 70 },
      card: { width: 720, quality: 76 },
      detail: { width: 1280, quality: 80 },
      hero: { width: 1600, quality: 82 },
    });
    expect(isPublicImageVariant("card")).toBe(true);
    expect(isPublicImageVariant("original")).toBe(false);
  });

  it("keeps storage keys private and preserves encoded legacy paths", () => {
    expect(publicMediaImageVariants("asset/key").card)
      .toBe("/api/media/asset%2Fkey?variant=card");
    expect(publicLegacyImageVariants("/places/a b.jpg").detail)
      .toBe("/api/content/image?source=%2Fplaces%2Fa%20b.jpg&variant=detail");
  });
});
