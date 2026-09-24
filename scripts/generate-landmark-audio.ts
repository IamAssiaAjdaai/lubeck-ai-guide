import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import textToSpeech from "@google-cloud/text-to-speech";

import {
  AUDIO_MANIFEST_PROVIDER,
  getLandmarkAudio,
} from "../src/data/landmarkAudio";
import { createEdgeProvider } from "./edge-tts-provider";
import {
  buildAudioCoverage,
  buildAudioGenerationTargets,
  generateAudioFile,
  getMissingAudioTargets,
  readAudioGenerationManifest,
  selectDeterministicVoice,
  writeAudioGenerationManifest,
  type AudioGenerationManifest,
  type AudioGenerationTarget,
  type TextToSpeechProvider,
  type TtsVoice,
} from "./landmark-audio-generation";

type ProviderName = "google" | "edge";

const REPOSITORY_ROOT = process.cwd();
const AUDIO_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "public",
  "audio",
);
const MANIFEST_PATH = resolve(
  REPOSITORY_ROOT,
  "scripts",
  "audio-generation-manifest.json",
);

const LANDMARK_LABELS = {
  holstentor: "Holstentor",
  marienkirche: "Marienkirche",
  rathaus: "Rathaus",
  "heiligen-geist-hospital":
    "Heiligen-Geist-Hospital",
  buddenbrookhaus: "Buddenbrookhaus",
} as const;

type GoogleClient =
  InstanceType<
    typeof textToSpeech.TextToSpeechClient
  >;

function getOutputPath(
  target: AudioGenerationTarget,
): string {
  return resolve(
    AUDIO_DIRECTORY,
    target.file,
  );
}

function isTargetRegistered(
  target: AudioGenerationTarget,
): boolean {
  return (
    getLandmarkAudio(
      target.landmark,
      target.locale,
    ) === `/audio/${target.file}`
  );
}

function createGoogleProvider(
  client: GoogleClient,
): TextToSpeechProvider {
  const voiceCache = new Map<
    string,
    readonly TtsVoice[]
  >();

  return {
    manifestProvider:
      AUDIO_MANIFEST_PROVIDER,
    selectVoice:
      selectDeterministicVoice,

    async listVoices(providerLocale) {
      const cached =
        voiceCache.get(providerLocale);

      if (cached) {
        return cached;
      }

      const [response] =
        await client.listVoices({
          languageCode:
            providerLocale,
        });
      const voices =
        (response.voices ?? []).map(
          (voice) => ({
            name: voice.name,
            languageCodes:
              voice.languageCodes,
          }),
        );

      voiceCache.set(
        providerLocale,
        voices,
      );

      return voices;
    },

    async synthesizeSpeech(request) {
      const [response] =
        await client.synthesizeSpeech({
          input: {
            text: request.text,
          },
          voice: {
            languageCode:
              request.providerLocale,
            name: request.voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate:
              request.speakingRate,
            pitch: request.pitch,
          },
        });

      return response.audioContent;
    },
  };
}

function printCoverage(
  manifest: AudioGenerationManifest,
): void {
  const coverage = buildAudioCoverage({
    targets:
      buildAudioGenerationTargets(),
    manifest,
    isRegistered:
      isTargetRegistered,
    fileExists: (target) =>
      existsSync(getOutputPath(target)),
  });

  for (const landmark of Object.keys(
    LANDMARK_LABELS,
  ) as (keyof typeof LANDMARK_LABELS)[]) {
    console.log(
      LANDMARK_LABELS[landmark],
    );

    for (const item of coverage.filter(
      ({ target }) =>
        target.landmark === landmark,
    )) {
      console.log(
        `${item.target.locale.toUpperCase()} ${item.status}`,
      );
    }
  }

  const available = coverage.filter(
    ({ status }) => status === "existing",
  ).length;
  const missing = coverage.filter(
    ({ status }) => status === "missing",
  ).length;
  const stale = coverage.filter(
    ({ status }) => status === "stale",
  ).length;
  const unregistered = coverage.filter(
    ({ status }) =>
      status === "unregistered",
  ).length;

  console.log(
    `${available} / ${coverage.length} priority audio combinations available`,
  );
  console.log(
    `${missing} missing, ${stale} stale, ${unregistered} unregistered`,
  );
}

function assertSafeGenerationState(
  targets:
    readonly AudioGenerationTarget[],
  manifest: AudioGenerationManifest,
): void {
  const coverage = buildAudioCoverage({
    targets,
    manifest,
    isRegistered:
      isTargetRegistered,
    fileExists: (target) =>
      existsSync(getOutputPath(target)),
  });

  const invalid = coverage.find(
    ({ status }) =>
      status === "stale" ||
      status === "unregistered",
  );

  if (invalid) {
    throw new Error(
      `${invalid.target.file} is ${invalid.status}; resolve the registry or source-story mismatch before generating audio.`,
    );
  }

  const registeredMissing =
    targets.find(
      (target) =>
        isTargetRegistered(target) &&
        !existsSync(getOutputPath(target)),
    );

  if (registeredMissing) {
    throw new Error(
      `Registered audio file ${registeredMissing.file} is missing from public/audio.`,
    );
  }
}

async function verifyCredentials(
  client: GoogleClient,
): Promise<void> {
  try {
    await client.auth.getClient();
    await client.getProjectId();
  } catch {
    throw new Error(
      "Google Cloud Application Default Credentials are unavailable. Set GOOGLE_APPLICATION_CREDENTIALS to an approved service-account JSON file outside this repository.",
    );
  }
}

function sortManifest(
  manifest: AudioGenerationManifest,
  targets:
    readonly AudioGenerationTarget[],
): AudioGenerationManifest {
  const targetOrder = new Map(
    targets.map(
      (target, index) => [
        target.file,
        index,
      ],
    ),
  );

  return {
    version: 1,
    assets: [...manifest.assets].sort(
      (left, right) =>
        (targetOrder.get(left.file) ??
          Number.MAX_SAFE_INTEGER) -
        (targetOrder.get(right.file) ??
          Number.MAX_SAFE_INTEGER),
    ),
  };
}

async function generateAudio(
  dryRun: boolean,
  providerName: ProviderName,
): Promise<void> {
  const targets =
    buildAudioGenerationTargets();
  let manifest =
    await readAudioGenerationManifest(
      MANIFEST_PATH,
    );

  assertSafeGenerationState(
    targets,
    manifest,
  );

  const missingTargets =
    getMissingAudioTargets(
      targets,
      isTargetRegistered,
    );
  const skipped =
    targets.length - missingTargets.length;

  if (dryRun) {
    for (const target of targets) {
      console.log(
        `${target.file}: ${isTargetRegistered(target) ? "skip existing" : "would generate"}`,
      );
    }

    console.log(
      `Dry run: ${missingTargets.length} would generate, ${skipped} existing would be skipped.`,
    );

    return;
  }

  if (missingTargets.length === 0) {
    console.log(
      `No audio generation needed; ${skipped} existing files skipped.`,
    );

    return;
  }

  let client: GoogleClient | undefined;

  try {
    const provider =
      providerName === "edge"
        ? createEdgeProvider()
        : await (async () => {
            client =
              new textToSpeech.TextToSpeechClient();
            await verifyCredentials(client);

            return createGoogleProvider(client);
          })();
    let generated = 0;

    for (const target of missingTargets) {
      const entry =
        await generateAudioFile({
          target,
          provider,
          outputDirectory:
            AUDIO_DIRECTORY,
        });

      manifest = sortManifest(
        {
          version: 1,
          assets: [
            ...manifest.assets,
            entry,
          ],
        },
        targets,
      );

      await writeAudioGenerationManifest(
        MANIFEST_PATH,
        manifest,
      );

      generated += 1;
      console.log(
        `Generated ${entry.file} with ${entry.voice}.`,
      );
    }

    console.log(
      `Generation complete: ${generated} generated, ${skipped} existing skipped, 0 failed.`,
    );
  } finally {
    await client?.close();
  }
}

export function parseProvider(
  args: readonly string[],
): ProviderName {
  const providerArguments = args.filter(
    (argument) =>
      argument.startsWith("--provider="),
  );

  if (providerArguments.length > 1) {
    throw new Error(
      "Specify --provider only once.",
    );
  }

  const provider =
    providerArguments[0]?.slice(
      "--provider=".length,
    ) ?? "google";

  if (
    provider !== "google" &&
    provider !== "edge"
  ) {
    throw new Error(
      `Unsupported audio provider: ${provider}. Use google or edge.`,
    );
  }

  return provider;
}

export async function main(
  args = process.argv.slice(2),
): Promise<void> {
  const allowedArguments = new Set([
    "--coverage",
    "--dry-run",
  ]);
  const unknownArgument = args.find(
    (argument) =>
      !allowedArguments.has(argument) &&
      !argument.startsWith("--provider="),
  );

  if (unknownArgument) {
    throw new Error(
      `Unknown argument: ${unknownArgument}`,
    );
  }

  const coverageMode =
    args.includes("--coverage");
  const dryRun =
    args.includes("--dry-run");
  const provider = parseProvider(args);

  if (coverageMode && dryRun) {
    throw new Error(
      "Use either --coverage or --dry-run, not both.",
    );
  }

  if (coverageMode) {
    printCoverage(
      await readAudioGenerationManifest(
        MANIFEST_PATH,
      ),
    );

    return;
  }

  await generateAudio(dryRun, provider);
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
  import.meta.url ===
    pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown audio generation error.";

    console.error(message);
    process.exitCode = 1;
  });
}
