import { describe, expect, it } from "vitest";

import {
  selectExactLocaleAudio,
  selectPrimaryImage,
  selectPrimaryImageMedia,
} from "../src/lib/api/media";

describe("native public media selection", () => {
  it("uses approved public API card/hero media before legacy fallback", () => {
    const media = [
      { assetKey: "hero", kind: "image", purpose: "hero", url: "/api/media/hero", mimeType: "image/jpeg" },
      { assetKey: "card", kind: "image", purpose: "card", url: "/api/media/card", mimeType: "image/jpeg" },
    ] as const;
    expect(selectPrimaryImage(media, "/legacy.jpg")).toBe("/api/media/card");
    expect(selectPrimaryImage(media.slice(0, 1), "/legacy.jpg")).toBe("/api/media/hero");
    expect(selectPrimaryImage([], "/legacy.jpg")).toBe("/legacy.jpg");
    expect(selectPrimaryImageMedia(media)?.assetKey).toBe("card");
  });

  it("selects audio only for the exact active locale", () => {
    const media = [
      { assetKey: "en", kind: "audio", purpose: "audio", locale: "en", url: "/api/media/en", mimeType: "audio/mpeg" },
      { assetKey: "neutral", kind: "audio", purpose: "audio", url: "/api/media/neutral", mimeType: "audio/mpeg" },
      { assetKey: "direct", kind: "audio", purpose: "audio", locale: "de", url: "https://storage.example/private.mp3", mimeType: "audio/mpeg" },
    ] as const;

    expect(selectExactLocaleAudio(media, "en")?.assetKey).toBe("en");
    expect(selectExactLocaleAudio(media, "de")).toBeUndefined();
    expect(selectExactLocaleAudio(media, "ar")).toBeUndefined();
  });

  it("retains only public-safe attribution fields on selected imagery", () => {
    const media = [{
      assetKey: "hero", kind: "image", purpose: "hero", url: "/api/media/hero",
      mimeType: "image/jpeg", attribution: { text: "Photo: Creator · CC BY", creator: "Creator" },
    }] as const;
    expect(selectPrimaryImageMedia(media)?.attribution).toEqual({
      text: "Photo: Creator · CC BY",
      creator: "Creator",
    });
  });
});
