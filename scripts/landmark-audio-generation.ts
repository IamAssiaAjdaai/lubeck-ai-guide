import { createHash, randomUUID } from "node:crypto";
import {
  access,
  link,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import { landmarks } from "../src/data/landmarks";
import {
  HISTORIC_TOUR_AUDIO_SLUGS,
  PRIORITY_AUDIO_LOCALES,
  isGeneratedAudioManifestEntry,
  type AudioManifestProvider,
  type GeneratedAudioManifestEntry,
  type HistoricTourAudioSlug,
  type PriorityAudioLocale,
} from "../src/data/landmarkAudio";

export const TTS_PROVIDER_LOCALES = {
  de: "de-DE",
  en: "en-GB",
  da: "da-DK",
  nl: "nl-NL",
  sv: "sv-SE",
  fr: "fr-FR",
  tr: "tr-TR",
} as const satisfies Readonly<
  Record<PriorityAudioLocale, string>
>;

export const AUDIO_SPEAKING_RATE = 0.97;
export const AUDIO_PITCH = 0;

export type AudioGenerationTarget =
  Readonly<{
    landmark: HistoricTourAudioSlug;
    locale: PriorityAudioLocale;
    providerLocale: string;
    file: string;
    story: string;
    sourceHash: string;
  }>;

export type AudioGenerationManifest =
  Readonly<{
    version: 1;
    assets: readonly GeneratedAudioManifestEntry[];
  }>;

export type TtsVoice = Readonly<{
  name?: string | null;
  languageCodes?:
    | readonly (string | null)[]
    | null;
  gender?: "female" | "male" | "neutral" | null;
  status?: string | null;
}>;

export type SynthesisRequest =
  Readonly<{
    text: string;
    providerLocale: string;
    voiceName: string;
    speakingRate: number;
    pitch: number;
  }>;

export type TextToSpeechProvider =
  Readonly<{
    manifestProvider: AudioManifestProvider;
    listVoices: (
      providerLocale: string,
    ) => Promise<readonly TtsVoice[]>;
    selectVoice: (
      voices: readonly TtsVoice[],
      providerLocale: string,
    ) => string;
    synthesizeSpeech: (
      request: SynthesisRequest,
    ) => Promise<
      | Uint8Array
      | string
      | null
      | undefined
    >;
  }>;

export type AudioCoverageStatus =
  | "existing"
  | "missing"
  | "stale"
  | "unregistered";

export type AudioCoverageItem =
  Readonly<{
    target: AudioGenerationTarget;
    status: AudioCoverageStatus;
  }>;

const VOICE_FAMILY_PRIORITY = [
  "chirp3-hd",
  "studio",
  "neural2",
  "wavenet",
  "standard",
] as const;

export function buildAudioFileName(
  landmark: HistoricTourAudioSlug,
  locale: PriorityAudioLocale,
): string {
  return `${landmark}-${locale}.mp3`;
}

export function hashAudioSource(
  story: string,
): string {
  return createHash("sha256")
    .update(story, "utf8")
    .digest("hex");
}

export function buildAudioGenerationTargets():
  readonly AudioGenerationTarget[] {
  return HISTORIC_TOUR_AUDIO_SLUGS.flatMap(
    (landmarkSlug) => {
      const landmark = landmarks.find(
        ({ slug }) => slug === landmarkSlug,
      );

      if (!landmark) {
        throw new Error(
          `Missing historic-tour landmark ${landmarkSlug}.`,
        );
      }

      return PRIORITY_AUDIO_LOCALES.map(
        (locale) => {
          const story =
            landmark.content[locale]?.story;

          if (!story?.trim()) {
            throw new Error(
              `Missing localized story for ${landmarkSlug}/${locale}.`,
            );
          }

          return {
            landmark: landmarkSlug,
            locale,
            providerLocale:
              TTS_PROVIDER_LOCALES[locale],
            file: buildAudioFileName(
              landmarkSlug,
              locale,
            ),
            story,
            sourceHash:
              hashAudioSource(story),
          };
        },
      );
    },
  );
}

export function getMissingAudioTargets(
  targets:
    readonly AudioGenerationTarget[],
  isRegistered: (
    target: AudioGenerationTarget,
  ) => boolean,
): readonly AudioGenerationTarget[] {
  return targets.filter(
    (target) => !isRegistered(target),
  );
}

function getVoiceFamilyRank(
  voiceName: string,
): number {
  const normalizedName =
    voiceName.toLowerCase();
  const rank =
    VOICE_FAMILY_PRIORITY.findIndex(
      (family) =>
        normalizedName.includes(family),
    );

  return rank === -1
    ? VOICE_FAMILY_PRIORITY.length
    : rank;
}

export function selectDeterministicVoice(
  voices: readonly TtsVoice[],
  providerLocale: string,
): string {
  const matchingVoices = voices
    .filter(
      (
        voice,
      ): voice is TtsVoice & {
        name: string;
      } =>
        Boolean(voice.name) &&
        Boolean(
          voice.languageCodes?.includes(
            providerLocale,
          ),
        ),
    )
    .sort((left, right) => {
      const familyDifference =
        getVoiceFamilyRank(left.name) -
        getVoiceFamilyRank(right.name);

      return familyDifference !== 0
        ? familyDifference
        : left.name.localeCompare(
            right.name,
            "en",
          );
    });

  const selectedVoice =
    matchingVoices[0]?.name;

  if (!selectedVoice) {
    throw new Error(
      `No supported Google TTS voice is available for ${providerLocale}.`,
    );
  }

  return selectedVoice;
}

export function selectDeterministicEdgeVoice(
  voices: readonly TtsVoice[],
  providerLocale: string,
): string {
  const exactLocaleNeuralVoices = voices.filter(
    (
      voice,
    ): voice is TtsVoice & { name: string } =>
      Boolean(voice.name) &&
      Boolean(
        voice.languageCodes?.includes(
          providerLocale,
        ),
      ) &&
      voice.name
        ?.toLowerCase()
        .includes("neural") === true &&
      voice.status?.toLowerCase() !==
        "deprecated",
  );
  const preferredVoices =
    exactLocaleNeuralVoices.filter(
      ({ gender }) =>
        gender === "female" ||
        gender === "neutral",
    );
  const candidates =
    preferredVoices.length > 0
      ? preferredVoices
      : exactLocaleNeuralVoices;
  const selectedVoice = [...candidates].sort(
    (left, right) =>
      left.name.localeCompare(
        right.name,
        "en",
      ),
  )[0]?.name;

  if (!selectedVoice) {
    throw new Error(
      `No exact-locale Edge neural voice is available for ${providerLocale}.`,
    );
  }

  return selectedVoice;
}

export function isPlausibleMp3(
  audio: Uint8Array,
): boolean {
  if (audio.byteLength < 128) {
    return false;
  }

  const hasId3Header =
    audio[0] === 0x49 &&
    audio[1] === 0x44 &&
    audio[2] === 0x33;
  const hasMpegFrameHeader =
    audio[0] === 0xff &&
    (audio[1] & 0xe0) === 0xe0;

  return hasId3Header || hasMpegFrameHeader;
}

function toAudioBuffer(
  audio:
    | Uint8Array
    | string
    | null
    | undefined,
): Buffer {
  if (!audio) {
    return Buffer.alloc(0);
  }

  return typeof audio === "string"
    ? Buffer.from(audio, "base64")
    : Buffer.from(audio);
}

async function pathExists(
  filePath: string,
): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

export async function generateAudioFile({
  target,
  provider,
  outputDirectory,
}: {
  target: AudioGenerationTarget;
  provider: TextToSpeechProvider;
  outputDirectory: string;
}): Promise<GeneratedAudioManifestEntry> {
  const outputPath = resolve(
    outputDirectory,
    target.file,
  );

  if (await pathExists(outputPath)) {
    throw new Error(
      `Refusing to overwrite existing audio file ${target.file}.`,
    );
  }

  const voices =
    await provider.listVoices(
      target.providerLocale,
    );
  const voice = provider.selectVoice(
    voices,
    target.providerLocale,
  );
  const audio = toAudioBuffer(
    await provider.synthesizeSpeech({
      text: target.story,
      providerLocale:
        target.providerLocale,
      voiceName: voice,
      speakingRate:
        AUDIO_SPEAKING_RATE,
      pitch: AUDIO_PITCH,
    }),
  );

  if (!isPlausibleMp3(audio)) {
    throw new Error(
      `Text-to-speech provider returned invalid MP3 content for ${target.landmark}/${target.locale}.`,
    );
  }

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const temporaryPath = resolve(
    outputDirectory,
    `.${target.file}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, audio, {
      flag: "wx",
    });

    const writtenAudio =
      await readFile(temporaryPath);

    if (!isPlausibleMp3(writtenAudio)) {
      throw new Error(
        `Temporary MP3 validation failed for ${target.landmark}/${target.locale}.`,
      );
    }

    /*
     * Publishing with an exclusive
     * hard link is atomic and fails
     * if another process created the
     * destination in the meantime.
     */
    await link(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, {
      force: true,
    });
  }

  return {
    file: target.file,
    landmark: target.landmark,
    locale: target.locale,
    provider: provider.manifestProvider,
    providerLocale:
      target.providerLocale,
    voice,
    source: "landmark.story",
    sourceHash: target.sourceHash,
  };
}

export function parseAudioGenerationManifest(
  value: unknown,
): AudioGenerationManifest {
  if (
    typeof value !== "object" ||
    value === null ||
    JSON.stringify(
      Object.keys(value).sort(),
    ) !==
      JSON.stringify(["assets", "version"]) ||
    !("version" in value) ||
    value.version !== 1 ||
    !("assets" in value) ||
    !Array.isArray(value.assets) ||
    !value.assets.every(
      isGeneratedAudioManifestEntry,
    )
  ) {
    throw new Error(
      "Invalid audio generation manifest.",
    );
  }

  const files = value.assets.map(
    (entry) => entry.file,
  );

  if (new Set(files).size !== files.length) {
    throw new Error(
      "Audio generation manifest contains duplicate files.",
    );
  }

  return value as AudioGenerationManifest;
}

export async function readAudioGenerationManifest(
  manifestPath: string,
): Promise<AudioGenerationManifest> {
  const contents = await readFile(
    manifestPath,
    "utf8",
  );

  return parseAudioGenerationManifest(
    JSON.parse(contents) as unknown,
  );
}

export async function writeAudioGenerationManifest(
  manifestPath: string,
  manifest: AudioGenerationManifest,
): Promise<void> {
  const validatedManifest =
    parseAudioGenerationManifest(manifest);
  const temporaryPath =
    `${manifestPath}.${randomUUID()}.tmp`;

  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(validatedManifest, null, 2)}\n`,
      {
        flag: "wx",
      },
    );
    await rename(
      temporaryPath,
      manifestPath,
    );
  } finally {
    await rm(temporaryPath, {
      force: true,
    });
  }
}

export function isGeneratedAudioStale(
  entry: GeneratedAudioManifestEntry,
  target: AudioGenerationTarget,
): boolean {
  return (
    entry.file !== target.file ||
    entry.landmark !== target.landmark ||
    entry.locale !== target.locale ||
    entry.providerLocale !==
      target.providerLocale ||
    entry.sourceHash !== target.sourceHash
  );
}

export function buildAudioCoverage({
  targets,
  manifest,
  isRegistered,
  fileExists,
}: {
  targets:
    readonly AudioGenerationTarget[];
  manifest: AudioGenerationManifest;
  isRegistered: (
    target: AudioGenerationTarget,
  ) => boolean;
  fileExists: (
    target: AudioGenerationTarget,
  ) => boolean;
}): readonly AudioCoverageItem[] {
  const manifestByFile = new Map(
    manifest.assets.map(
      (entry) => [entry.file, entry],
    ),
  );

  return targets.map((target) => {
    const manifestEntry =
      manifestByFile.get(target.file);

    if (
      manifestEntry &&
      isGeneratedAudioStale(
        manifestEntry,
        target,
      )
    ) {
      return {
        target,
        status: "stale" as const,
      };
    }

    const registered =
      isRegistered(target);
    const exists = fileExists(target);

    if (registered && exists) {
      return {
        target,
        status: "existing" as const,
      };
    }

    if (!registered && exists) {
      return {
        target,
        status: "unregistered" as const,
      };
    }

    return {
      target,
      status: "missing" as const,
    };
  });
}
