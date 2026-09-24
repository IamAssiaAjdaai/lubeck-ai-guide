import { describe, expect, it } from "vitest";

import { resolveExactLocalePublicAudio } from "@/lib/content/placeAudio";
import type { PublicMedia } from "@/lib/media/types";

const englishAudio: PublicMedia = {
  assetKey: "english-audio",
  kind: "audio",
  purpose: "audio",
  url: "/api/media/english-audio",
  mimeType: "audio/mpeg",
  locale: "en",
  durationSeconds: 87,
};

describe("exact-locale public place audio", () => {
  it("selects only audio for the exact requested locale", () => {
    expect(resolveExactLocalePublicAudio([englishAudio], "en")).toEqual({
      src: "/api/media/english-audio",
      durationSeconds: 87,
    });
    expect(resolveExactLocalePublicAudio([englishAudio], "de")).toBeUndefined();
    expect(resolveExactLocalePublicAudio([englishAudio], "ar")).toBeUndefined();
  });

  it("does not accept locale-neutral audio", () => {
    expect(resolveExactLocalePublicAudio([{
      ...englishAudio,
      assetKey: "neutral-audio",
      locale: undefined,
    }], "en")).toBeUndefined();
  });

  it("omits unreliable duration metadata instead of fabricating it", () => {
    expect(resolveExactLocalePublicAudio([{
      ...englishAudio,
      durationSeconds: 0,
    }], "en")).toEqual({ src: "/api/media/english-audio" });
  });
});
