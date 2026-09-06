import { describe, expect, it } from "vitest";

import { resolvePlaceImage } from "@/lib/content/placeMedia";
import type { PublicMedia } from "@/lib/media/types";

const media = (
  purpose: "card" | "hero",
  locale?: "de" | "en",
): PublicMedia => ({
  assetKey: `${purpose}-${locale ?? "neutral"}`,
  kind: "image",
  purpose,
  url: `/api/media/${purpose}-${locale ?? "neutral"}`,
  mimeType: "image/jpeg",
  ...(locale ? { locale } : {}),
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
});
