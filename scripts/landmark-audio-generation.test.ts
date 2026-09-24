import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { landmarks } from "../src/data/landmarks";
import {
  MANUAL_LANDMARK_AUDIO_REGISTRY,
  type GeneratedAudioManifestEntry,
} from "../src/data/landmarkAudio";
import {
  createEdgeProvider,
  type EdgeVoice,
} from "./edge-tts-provider";
import { parseProvider } from "./generate-landmark-audio";
import {
  TTS_PROVIDER_LOCALES,
  buildAudioFileName,
  buildAudioGenerationTargets,
  generateAudioFile,
  getMissingAudioTargets,
  hashAudioSource,
  isGeneratedAudioStale,
  readAudioGenerationManifest,
  selectDeterministicEdgeVoice,
  selectDeterministicVoice,
  writeAudioGenerationManifest,
  type TextToSpeechProvider,
} from "./landmark-audio-generation";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory():
  Promise<string> {
  const directory = await mkdtemp(
    resolve(tmpdir(), "citywalk-audio-"),
  );

  temporaryDirectories.push(directory);

  return directory;
}

function createPlausibleMp3(): Buffer {
  return Buffer.concat([
    Buffer.from("ID3", "ascii"),
    Buffer.alloc(256, 1),
  ]);
}

function createProvider(
  audio: Uint8Array =
    createPlausibleMp3(),
): TextToSpeechProvider & {
  listVoices: ReturnType<typeof vi.fn>;
  synthesizeSpeech:
    ReturnType<typeof vi.fn>;
} {
  return {
    manifestProvider:
      "google-cloud-text-to-speech",
    selectVoice:
      selectDeterministicVoice,
    listVoices: vi.fn().mockResolvedValue([
      {
        name: "de-DE-Standard-B",
        languageCodes: ["de-DE"],
      },
      {
        name: "de-DE-Chirp3-HD-Z",
        languageCodes: ["de-DE"],
      },
      {
        name: "de-DE-Chirp3-HD-A",
        languageCodes: ["de-DE"],
      },
    ]),
    synthesizeSpeech:
      vi.fn().mockResolvedValue(audio),
  };
}

function createEdgeVoice({
  shortName,
  locale,
  gender = "Female",
  status = "GA",
}: {
  shortName: string;
  locale: string;
  gender?: EdgeVoice["Gender"];
  status?: EdgeVoice["Status"];
}): EdgeVoice {
  return {
    ShortName: shortName,
    Gender: gender,
    Locale: locale,
    Status: status,
  };
}

describe("landmark audio generation", () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map(
        (directory) =>
          rm(directory, {
            recursive: true,
            force: true,
          }),
      ),
    );
  });

  it("builds exactly five landmarks by seven priority locales", () => {
    const targets =
      buildAudioGenerationTargets();

    expect(targets).toHaveLength(35);
    expect(
      new Set(
        targets.map(
          ({ landmark }) => landmark,
        ),
      ).size,
    ).toBe(5);
    expect(
      new Set(
        targets.map(({ locale }) => locale),
      ).size,
    ).toBe(7);
  });

  it("keeps Google as default and accepts the explicit Edge provider", () => {
    expect(parseProvider([])).toBe("google");
    expect(
      parseProvider(["--provider=edge"]),
    ).toBe("edge");
    expect(() =>
      parseProvider(["--provider=unknown"]),
    ).toThrow("Use google or edge");
  });

  it("skips the seven manual assets and reports 28 pre-generation targets", () => {
    const targets =
      buildAudioGenerationTargets();
    const missing = getMissingAudioTargets(
      targets,
      (target) =>
        Object.prototype.hasOwnProperty.call(
          MANUAL_LANDMARK_AUDIO_REGISTRY[
            target.landmark
          ],
          target.locale,
        ),
    );

    expect(missing).toHaveLength(28);
    expect(
      targets.length - missing.length,
    ).toBe(7);
    expect(
      missing.some(
        ({ file }) =>
          file === "holstentor-en.mp3",
      ),
    ).toBe(false);
    expect(
      missing.some(
        ({ file }) =>
          file === "holstentor-da.mp3",
      ),
    ).toBe(true);
  });

  it("uses the required filenames and shared Google/Edge locale mapping", () => {
    expect(
      buildAudioFileName(
        "heiligen-geist-hospital",
        "tr",
      ),
    ).toBe(
      "heiligen-geist-hospital-tr.mp3",
    );
    expect(TTS_PROVIDER_LOCALES).toEqual({
      de: "de-DE",
      en: "en-GB",
      da: "da-DK",
      nl: "nl-NL",
      sv: "sv-SE",
      fr: "fr-FR",
      tr: "tr-TR",
    });
  });

  it("sources exact localized stories from application landmark data", () => {
    const targets =
      buildAudioGenerationTargets();

    for (const target of targets) {
      const landmark = landmarks.find(
        ({ slug }) =>
          slug === target.landmark,
      );

      expect(target.story).toBe(
        landmark?.content[target.locale].story,
      );
      expect(target.sourceHash).toBe(
        hashAudioSource(target.story),
      );
    }
  });

  it("selects voices deterministically by quality family then name", () => {
    expect(
      selectDeterministicVoice(
        [
          {
            name: "de-DE-Standard-B",
            languageCodes: ["de-DE"],
          },
          {
            name: "de-DE-Chirp3-HD-Z",
            languageCodes: ["de-DE"],
          },
          {
            name: "de-DE-Chirp3-HD-A",
            languageCodes: ["de-DE"],
          },
          {
            name: "fr-FR-Chirp3-HD-A",
            languageCodes: ["fr-FR"],
          },
        ],
        "de-DE",
      ),
    ).toBe("de-DE-Chirp3-HD-A");
  });

  it("selects an exact-locale Edge neural voice deterministically with declared female preference", () => {
    expect(
      selectDeterministicEdgeVoice(
        [
          {
            name: "de-DE-ZetaNeural",
            languageCodes: ["de-DE"],
            gender: "female",
            status: "GA",
          },
          {
            name: "de-DE-AlphaNeural",
            languageCodes: ["de-DE"],
            gender: "female",
            status: "GA",
          },
          {
            name: "de-DE-AaronNeural",
            languageCodes: ["de-DE"],
            gender: "male",
            status: "GA",
          },
          {
            name: "en-GB-AlphaNeural",
            languageCodes: ["en-GB"],
            gender: "female",
            status: "GA",
          },
          {
            name: "de-DE-Legacy",
            languageCodes: ["de-DE"],
            gender: "female",
            status: "GA",
          },
        ],
        "de-DE",
      ),
    ).toBe("de-DE-AlphaNeural");
  });

  it("rejects Edge voices that do not match the exact requested locale", () => {
    expect(() =>
      selectDeterministicEdgeVoice(
        [
          {
            name: "en-US-AlphaNeural",
            languageCodes: ["en-US"],
            gender: "female",
            status: "GA",
          },
        ],
        "en-GB",
      ),
    ).toThrow("exact-locale Edge neural voice");
  });

  it("uses Edge without credentials and maps synthesis options", async () => {
    const getVoices = vi.fn().mockResolvedValue([
      createEdgeVoice({
        shortName: "de-DE-AlphaNeural",
        locale: "de-DE",
      }),
    ]);
    const generateSpeech = vi
      .fn()
      .mockResolvedValue(createPlausibleMp3());
    const provider = createEdgeProvider({
      getVoices,
      generateSpeech,
    });
    const voices = await provider.listVoices(
      "de-DE",
    );
    const voice = provider.selectVoice(
      voices,
      "de-DE",
    );

    await provider.synthesizeSpeech({
      text: "Test",
      providerLocale: "de-DE",
      voiceName: voice,
      speakingRate: 0.97,
      pitch: 0,
    });

    expect(getVoices).toHaveBeenCalledWith();
    expect(generateSpeech).toHaveBeenCalledWith({
      text: "Test",
      voice: "de-DE-AlphaNeural",
      rate: "-3%",
      pitch: "+0Hz",
    });
    expect(
      generateSpeech.mock.calls[0][0],
    ).not.toHaveProperty("apiKey");
  });

  it("never overwrites an existing target by default", async () => {
    const outputDirectory =
      await createTemporaryDirectory();
    const target =
      buildAudioGenerationTargets()[0];
    const outputPath = resolve(
      outputDirectory,
      target.file,
    );
    const original = Buffer.from(
      "original recording",
    );
    const provider = createProvider();

    await writeFile(outputPath, original);

    await expect(
      generateAudioFile({
        target,
        provider,
        outputDirectory,
      }),
    ).rejects.toThrow(
      "Refusing to overwrite",
    );

    expect(
      await readFile(outputPath),
    ).toEqual(original);
    expect(
      provider.listVoices,
    ).not.toHaveBeenCalled();
    expect(
      provider.synthesizeSpeech,
    ).not.toHaveBeenCalled();
  });

  it("leaves no output or partial file when generation fails", async () => {
    const outputDirectory =
      await createTemporaryDirectory();
    const target =
      buildAudioGenerationTargets()[0];
    const provider = createProvider(
      Buffer.from("not an mp3"),
    );

    await expect(
      generateAudioFile({
        target,
        provider,
        outputDirectory,
      }),
    ).rejects.toThrow("invalid MP3");

    expect(
      await readdir(outputDirectory),
    ).toEqual([]);
  });

  it("cleans up when Edge synthesis rejects", async () => {
    const outputDirectory =
      await createTemporaryDirectory();
    const target =
      buildAudioGenerationTargets()[0];
    const provider = createProvider();

    provider.synthesizeSpeech.mockRejectedValue(
      new Error("Edge synthesis failed"),
    );

    await expect(
      generateAudioFile({
        target,
        provider: {
          ...provider,
          manifestProvider: "edge-tts-test",
        },
        outputDirectory,
      }),
    ).rejects.toThrow("Edge synthesis failed");

    expect(
      await readdir(outputDirectory),
    ).toEqual([]);
  });

  it("publishes valid audio and returns non-secret provenance", async () => {
    const outputDirectory =
      await createTemporaryDirectory();
    const target =
      buildAudioGenerationTargets()[0];
    const provider = createProvider();
    const entry = await generateAudioFile({
      target,
      provider,
      outputDirectory,
    });

    expect(
      await readFile(
        resolve(
          outputDirectory,
          target.file,
        ),
      ),
    ).toEqual(createPlausibleMp3());
    expect(entry).toEqual({
      file: target.file,
      landmark: target.landmark,
      locale: target.locale,
      provider:
        "google-cloud-text-to-speech",
      providerLocale: "de-DE",
      voice: "de-DE-Chirp3-HD-A",
      source: "landmark.story",
      sourceHash: target.sourceHash,
    });
    expect(
      JSON.stringify(entry),
    ).not.toMatch(
      /credential|private.?key|token|project.?id|client.?email/i,
    );
  });

  it("marks generated Edge audio as test-only provenance", async () => {
    const outputDirectory =
      await createTemporaryDirectory();
    const target =
      buildAudioGenerationTargets()[0];
    const provider = createProvider();
    const entry = await generateAudioFile({
      target,
      provider: {
        ...provider,
        manifestProvider: "edge-tts-test",
      },
      outputDirectory,
    });

    expect(entry.provider).toBe(
      "edge-tts-test",
    );
  });

  it("atomically replaces the manifest with validated provenance", async () => {
    const directory =
      await createTemporaryDirectory();
    const manifestPath = resolve(
      directory,
      "audio-generation-manifest.json",
    );
    const target =
      buildAudioGenerationTargets()[0];
    const entry = {
      file: target.file,
      landmark: target.landmark,
      locale: target.locale,
      provider:
        "google-cloud-text-to-speech",
      providerLocale:
        target.providerLocale,
      voice: "de-DE-Chirp3-HD-A",
      source: "landmark.story",
      sourceHash: target.sourceHash,
    } as const satisfies GeneratedAudioManifestEntry;

    await writeFile(
      manifestPath,
      '{"version":1,"assets":[]}',
    );
    await writeAudioGenerationManifest(
      manifestPath,
      {
        version: 1,
        assets: [entry],
      },
    );

    expect(
      await readAudioGenerationManifest(
        manifestPath,
      ),
    ).toEqual({
      version: 1,
      assets: [entry],
    });
    expect(
      (await readdir(directory)).filter(
        (file) => file.endsWith(".tmp"),
      ),
    ).toEqual([]);
  });

  it("produces deterministic hashes and detects stale generated audio", () => {
    const target =
      buildAudioGenerationTargets()[0];
    const currentEntry = {
      file: target.file,
      landmark: target.landmark,
      locale: target.locale,
      provider:
        "google-cloud-text-to-speech",
      providerLocale:
        target.providerLocale,
      voice: "de-DE-Chirp3-HD-A",
      source: "landmark.story",
      sourceHash: target.sourceHash,
    } as const satisfies GeneratedAudioManifestEntry;

    expect(
      hashAudioSource(target.story),
    ).toBe(hashAudioSource(target.story));
    expect(
      hashAudioSource(`${target.story} changed`),
    ).not.toBe(target.sourceHash);
    expect(
      isGeneratedAudioStale(
        currentEntry,
        target,
      ),
    ).toBe(false);
    expect(
      isGeneratedAudioStale(
        {
          ...currentEntry,
          sourceHash: "0".repeat(64),
        },
        target,
      ),
    ).toBe(true);
  });

  it("keeps credentials out of the checked-in manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "scripts",
      "audio-generation-manifest.json",
    );
    const manifest = await readFile(
      manifestPath,
      "utf8",
    );

    expect(manifest).not.toMatch(
      /credential|private.?key|token|project.?id|client.?email/i,
    );
  });

  it("keeps every checked-in generated recording current with its source story", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "scripts",
      "audio-generation-manifest.json",
    );
    const manifest =
      await readAudioGenerationManifest(
        manifestPath,
      );
    const targetByFile = new Map(
      buildAudioGenerationTargets().map(
        (target) => [target.file, target],
      ),
    );

    for (const entry of manifest.assets) {
      const target =
        targetByFile.get(entry.file);

      expect(target).toBeDefined();

      if (!target) {
        continue;
      }

      expect(
        isGeneratedAudioStale(
          entry,
          target,
        ),
      ).toBe(false);
    }
  });
});
