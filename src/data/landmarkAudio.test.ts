import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  HISTORIC_TOUR_AUDIO_SLUGS,
  LANDMARK_AUDIO_REGISTRY,
  PRIORITY_AUDIO_LOCALES,
  getAvailableAudioLocales,
  getLandmarkAudio,
  getPriorityAudioCoverage,
  hasLandmarkAudio,
} from "@/data/landmarkAudio";

const expectedCoverage = {
  holstentor: {
    de: true,
    en: true,
    da: false,
    nl: false,
    sv: false,
    fr: true,
    tr: false,
  },

  marienkirche: {
    de: false,
    en: true,
    da: false,
    nl: false,
    sv: false,
    fr: false,
    tr: false,
  },

  rathaus: {
    de: false,
    en: true,
    da: false,
    nl: false,
    sv: false,
    fr: false,
    tr: false,
  },

  "heiligen-geist-hospital": {
    de: false,
    en: true,
    da: false,
    nl: false,
    sv: false,
    fr: false,
    tr: false,
  },

  buddenbrookhaus: {
    de: false,
    en: true,
    da: false,
    nl: false,
    sv: false,
    fr: false,
    tr: false,
  },
} as const;

describe("landmark audio registry", () => {
  it("resolves every known real audio asset", () => {
    expect(
      getLandmarkAudio("holstentor", "en"),
    ).toBe("/audio/holstentor-en.mp3");
    expect(
      getLandmarkAudio("holstentor", "de"),
    ).toBe("/audio/holstentor-de.mp3");
    expect(
      getLandmarkAudio("holstentor", "fr"),
    ).toBe("/audio/holstentor-fr.mp3");
    expect(
      getLandmarkAudio("marienkirche", "en"),
    ).toBe("/audio/marienkirche-en.mp3");
    expect(
      getLandmarkAudio("rathaus", "en"),
    ).toBe("/audio/rathaus-en.mp3");
    expect(
      getLandmarkAudio(
        "heiligen-geist-hospital",
        "en",
      ),
    ).toBe(
      "/audio/heiligen-geist-hospital-en.mp3",
    );
    expect(
      getLandmarkAudio("buddenbrookhaus", "en"),
    ).toBe("/audio/buddenbrookhaus-en.mp3");
  });

  it("does not substitute another locale when exact audio is missing", () => {
    expect(
      getLandmarkAudio("holstentor", "da"),
    ).toBeUndefined();
    expect(
      getLandmarkAudio("rathaus", "nl"),
    ).toBeUndefined();
    expect(
      getLandmarkAudio("buddenbrookhaus", "sv"),
    ).toBeUndefined();
    expect(
      getLandmarkAudio("missing-landmark", "en"),
    ).toBeUndefined();
    expect(
      hasLandmarkAudio("marienkirche", "da"),
    ).toBe(false);
  });

  it("reports the real priority-language coverage for every tour stop", () => {
    expect(PRIORITY_AUDIO_LOCALES).toEqual([
      "de",
      "en",
      "da",
      "nl",
      "sv",
      "fr",
      "tr",
    ]);

    expect(
      Object.fromEntries(
        HISTORIC_TOUR_AUDIO_SLUGS.map(
          (slug) => [
            slug,
            getPriorityAudioCoverage(slug),
          ],
        ),
      ),
    ).toEqual(expectedCoverage);

    expect(
      getAvailableAudioLocales("holstentor"),
    ).toEqual(["de", "en", "fr"]);
  });

  it("registers every MP3 on disk and only non-empty valid MP3 files", () => {
    const publicDirectory = resolve(
      process.cwd(),
      "public",
    );
    const audioDirectory = resolve(
      publicDirectory,
      "audio",
    );

    const registeredPaths = Object.values(
      LANDMARK_AUDIO_REGISTRY,
    ).flatMap((audioByLocale) =>
      Object.values(audioByLocale),
    );

    const diskPaths = readdirSync(
      audioDirectory,
    )
      .filter((fileName) =>
        fileName.endsWith(".mp3"),
      )
      .map((fileName) =>
        `/audio/${fileName}`,
      );

    expect(
      [...registeredPaths].sort(),
    ).toEqual(diskPaths.sort());

    for (const audioPath of registeredPaths) {
      const filePath = resolve(
        publicDirectory,
        audioPath.slice(1),
      );
      const contents = readFileSync(filePath);
      const hasId3Header =
        contents.subarray(0, 3).toString("ascii") ===
        "ID3";
      const hasMpegFrameHeader =
        contents[0] === 0xff &&
        (contents[1] & 0xe0) === 0xe0;

      expect(statSync(filePath).size).toBeGreaterThan(0);
      expect(
        hasId3Header || hasMpegFrameHeader,
      ).toBe(true);
    }
  });
});
