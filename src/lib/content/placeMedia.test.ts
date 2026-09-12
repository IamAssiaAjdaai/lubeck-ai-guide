import { describe, expect, it } from "vitest";

import { resolvePlaceImage, resolvePlaceImageMedia } from "@/lib/content/placeMedia";
import type { PublicMedia } from "@/lib/media/types";

const media = (
  purpose: "card" | "hero",
  locale?: "de" | "en",
  attribution?: PublicMedia["attribution"],
): PublicMedia => ({
  assetKey: `${purpose}-${locale ?? "neutral"}`,
  kind: "image",
  purpose,
  url: `/api/media/${purpose}-${locale ?? "neutral"}`,
  mimeType: "image/jpeg",
  ...(locale ? { locale } : {}),
  ...(attribution ? { attribution } : {}),
});

describe("place image resolution", () => {
  it("prefers card media for discovery and hero media for detail", () => {
    const cmsMedia = [media("hero", "en"), media("card", "en")];

    expect(
      resolvePlaceImage("database", cmsMedia, "en", "/legacy.jpg", "card"),
    ).toBe("/api/media/card-en");
    expect(
      resolvePlaceImage("database", cmsMedia, "en", "/legacy.jpg", "detail"),
    ).toBe("/api/media/hero-en");
  });

  it("uses exact-locale before locale-neutral media and rejects other locales", () => {
    const cmsMedia = [
      media("hero", "de"),
      media("hero"),
      media("hero", "en"),
    ];

    expect(
      resolvePlaceImage("auto", cmsMedia, "en", "/legacy.jpg", "detail"),
    ).toBe("/api/media/hero-en");
    expect(
      resolvePlaceImage("auto", [media("hero", "de")], "en", "/legacy.jpg", "detail"),
    ).toBe("/legacy.jpg");
  });

  it("keeps code source legacy-only", () => {
    expect(
      resolvePlaceImage(
        "code",
        [media("hero", "en")],
        "en",
        "/legacy.jpg",
        "detail",
      ),
    ).toBe("/legacy.jpg");
  });

  it("returns the selected public media attribution without exposing another locale", () => {
    const attribution = {
      text: "Photo: Example · https://creativecommons.org/licenses/by-sa/4.0/",
      creator: "Example",
    };
    const selected = resolvePlaceImageMedia(
      "database",
      [media("hero", "de"), media("hero", "en", attribution)],
      "en",
      "detail",
    );

    expect(selected?.url).toBe("/api/media/hero-en");
    expect(selected?.attribution).toEqual(attribution);
    expect(resolvePlaceImageMedia("code", [media("hero", "en", attribution)], "en", "detail")).toBeUndefined();
  });
});
