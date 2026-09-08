import { describe, expect, it } from "vitest";

import {
  resolveCityHeroImage,
  resolveFeaturedCityImage,
} from "@/lib/content/homeMedia";
import type { PublicMedia } from "@/lib/media/types";

const media: readonly PublicMedia[] = [
  {
    assetKey: "card",
    kind: "image",
    purpose: "card",
    url: "/api/media/card",
    mimeType: "image/jpeg",
  },
  {
    assetKey: "hero",
    kind: "image",
    purpose: "hero",
    url: "/api/media/hero",
    mimeType: "image/jpeg",
  },
];

describe("public city image resolution", () => {
  it("prefers hero media in a city experience and card media on Home", () => {
    expect(resolveCityHeroImage("database", media, "en", "/legacy.jpg"))
      .toBe("/api/media/hero");
    expect(resolveFeaturedCityImage("database", media, "en", "/legacy.jpg"))
      .toBe("/api/media/card");
  });

  it("keeps code mode on its trusted legacy image", () => {
    expect(resolveCityHeroImage("code", media, "en", "/legacy.jpg"))
      .toBe("/legacy.jpg");
  });
});
