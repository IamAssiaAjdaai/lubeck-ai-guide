import { describe, expect, it } from "vitest";

import { resolveLandmarkPageAudio } from "@/lib/content/landmarkAudio";
import type { PublicMedia } from "@/lib/media/types";

const englishCmsAudio: PublicMedia = {
  assetKey: "english-audio",
  kind: "audio",
  purpose: "audio",
  locale: "en",
  url: "/api/media/english-audio",
  mimeType: "audio/mpeg",
};

describe("landmark page audio resolution", () => {
  it("prefers eligible exact-locale CMS audio for database and auto sources", () => {
    for (const source of ["database", "auto"] as const) {
      expect(
        resolveLandmarkPageAudio(
          source,
          [englishCmsAudio],
          "en",
          "/audio/legacy-en.mp3",
        ),
      ).toBe(englishCmsAudio.url);
    }
  });

  it.each(["de", "ar"] as const)(
    "does not masquerade English CMS audio as %s",
    (locale) => {
      expect(
        resolveLandmarkPageAudio(
          "database",
          [englishCmsAudio],
          locale,
          `/audio/legacy-${locale}.mp3`,
        ),
      ).toBe(`/audio/legacy-${locale}.mp3`);
    },
  );

  it("ignores locale-neutral, wrong-purpose, and non-audio CMS media", () => {
    const localeNeutral: PublicMedia = {
      assetKey: "neutral-audio",
      kind: "audio",
      purpose: "audio",
      url: "/api/media/neutral-audio",
      mimeType: "audio/mpeg",
    };
    const ineligible: PublicMedia[] = [
      localeNeutral,
      { ...englishCmsAudio, purpose: "document" },
      {
        ...englishCmsAudio,
        kind: "video",
        purpose: "video",
        mimeType: "video/mp4",
      },
    ];
    expect(
      resolveLandmarkPageAudio(
        "database",
        ineligible,
        "en",
        "/audio/legacy-en.mp3",
      ),
    ).toBe("/audio/legacy-en.mp3");
  });

  it("uses exact-locale legacy fallback when CMS audio is missing", () => {
    expect(
      resolveLandmarkPageAudio(
        "database",
        [],
        "fr",
        "/audio/legacy-fr.mp3",
      ),
    ).toBe("/audio/legacy-fr.mp3");
  });

  it("keeps code source legacy-only", () => {
    expect(
      resolveLandmarkPageAudio(
        "code",
        [englishCmsAudio],
        "en",
        "/audio/legacy-en.mp3",
      ),
    ).toBe("/audio/legacy-en.mp3");
  });
});
