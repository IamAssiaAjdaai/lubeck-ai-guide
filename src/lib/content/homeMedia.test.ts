import { describe, expect, it } from "vitest";

import {
  resolveCityHeroImage,
  resolveCityHeroMedia,
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
    expect(resolveCityHeroMedia("code", media, "en")).toBeUndefined();
  });

  it("uses bounded delivery variants when public media provides them", () => {
    const variantMedia: readonly PublicMedia[] = media.map((item) => ({
      ...item,
      variants: {
        thumbnail: `${item.url}?variant=thumbnail`,
        card: `${item.url}?variant=card`,
        detail: `${item.url}?variant=detail`,
        hero: `${item.url}?variant=hero`,
      },
    }));

    expect(resolveFeaturedCityImage("database", variantMedia, "en"))
      .toBe("/api/media/card?variant=card");
    expect(resolveCityHeroImage("database", variantMedia, "en"))
      .toBe("/api/media/hero?variant=hero");
  });

  it("retains public attribution on the selected database hero", () => {
    const attributedHero: PublicMedia = {
      ...media[1]!,
      attribution: {
        text: "Photo: Example · CC BY 4.0 · https://creativecommons.org/licenses/by/4.0/",
        creator: "Example",
      },
    };

    expect(resolveCityHeroMedia("database", [media[0]!, attributedHero], "en"))
      .toEqual(attributedHero);
  });
});
