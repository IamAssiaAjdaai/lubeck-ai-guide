import {
  locales,
  type Locale,
} from "@/lib/i18n";
import generatedAudioManifest from "../../scripts/audio-generation-manifest.json";

export const PRIORITY_AUDIO_LOCALES = [
  "de",
  "en",
  "da",
  "nl",
  "sv",
  "fr",
  "tr",
] as const satisfies readonly Locale[];

export const HISTORIC_TOUR_AUDIO_SLUGS = [
  "holstentor",
  "marienkirche",
  "rathaus",
  "heiligen-geist-hospital",
  "buddenbrookhaus",
] as const;

export type PriorityAudioLocale =
  (typeof PRIORITY_AUDIO_LOCALES)[number];

export type HistoricTourAudioSlug =
  (typeof HISTORIC_TOUR_AUDIO_SLUGS)[number];

export type LandmarkAudioPath =
  `/audio/${string}.mp3`;

type LandmarkAudioRegistry = Readonly<
  Record<
    HistoricTourAudioSlug,
    Readonly<
      Partial<
        Record<
          Locale,
          LandmarkAudioPath
        >
      >
    >
  >
>;

export const AUDIO_MANIFEST_PROVIDER =
  "google-cloud-text-to-speech" as const;
export const EDGE_AUDIO_MANIFEST_PROVIDER =
  "edge-tts-test" as const;

export const AUDIO_MANIFEST_PROVIDERS = [
  AUDIO_MANIFEST_PROVIDER,
  EDGE_AUDIO_MANIFEST_PROVIDER,
] as const;

export type AudioManifestProvider =
  (typeof AUDIO_MANIFEST_PROVIDERS)[number];

export type GeneratedAudioManifestEntry =
  Readonly<{
    file: string;
    landmark: HistoricTourAudioSlug;
    locale: PriorityAudioLocale;
    provider: AudioManifestProvider;
    providerLocale: string;
    voice: string;
    source: "landmark.story";
    sourceHash: string;
  }>;

type AudioGenerationManifest = Readonly<{
  version: 1;
  assets: readonly GeneratedAudioManifestEntry[];
}>;

export const MANUAL_LANDMARK_AUDIO_REGISTRY = {
  holstentor: {
    de: "/audio/holstentor-de.mp3",
    en: "/audio/holstentor-en.mp3",
    fr: "/audio/holstentor-fr.mp3",
  },

  marienkirche: {
    en: "/audio/marienkirche-en.mp3",
  },

  rathaus: {
    en: "/audio/rathaus-en.mp3",
  },

  "heiligen-geist-hospital": {
    en: "/audio/heiligen-geist-hospital-en.mp3",
  },

  buddenbrookhaus: {
    en: "/audio/buddenbrookhaus-en.mp3",
  },
} as const satisfies LandmarkAudioRegistry;

function isHistoricTourAudioSlug(
  value: unknown,
): value is HistoricTourAudioSlug {
  return (
    typeof value === "string" &&
    HISTORIC_TOUR_AUDIO_SLUGS.some(
      (slug) => slug === value,
    )
  );
}

function isPriorityAudioLocale(
  value: unknown,
): value is PriorityAudioLocale {
  return (
    typeof value === "string" &&
    PRIORITY_AUDIO_LOCALES.some(
      (locale) => locale === value,
    )
  );
}

function isAudioManifestProvider(
  value: unknown,
): value is AudioManifestProvider {
  return AUDIO_MANIFEST_PROVIDERS.some(
    (provider) => provider === value,
  );
}

export function isGeneratedAudioManifestEntry(
  value: unknown,
): value is GeneratedAudioManifestEntry {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const entry = value as Record<
    string,
    unknown
  >;
  const expectedKeys = [
    "file",
    "landmark",
    "locale",
    "provider",
    "providerLocale",
    "source",
    "sourceHash",
    "voice",
  ];

  if (
    JSON.stringify(Object.keys(entry).sort()) !==
    JSON.stringify(expectedKeys)
  ) {
    return false;
  }

  return (
    typeof entry.file === "string" &&
    isHistoricTourAudioSlug(entry.landmark) &&
    isPriorityAudioLocale(entry.locale) &&
    entry.file ===
      `${entry.landmark}-${entry.locale}.mp3` &&
    isAudioManifestProvider(entry.provider) &&
    typeof entry.providerLocale === "string" &&
    Boolean(entry.providerLocale) &&
    typeof entry.voice === "string" &&
    Boolean(entry.voice) &&
    entry.source === "landmark.story" &&
    typeof entry.sourceHash === "string" &&
    /^[a-f0-9]{64}$/.test(entry.sourceHash)
  );
}

function buildAudioRegistry(): LandmarkAudioRegistry {
  const rawManifest: unknown =
    generatedAudioManifest;

  if (
    typeof rawManifest !== "object" ||
    rawManifest === null ||
    !("version" in rawManifest) ||
    rawManifest.version !== 1 ||
    !("assets" in rawManifest) ||
    !Array.isArray(rawManifest.assets) ||
    !rawManifest.assets.every(
      isGeneratedAudioManifestEntry,
    )
  ) {
    throw new Error(
      "Invalid landmark audio generation manifest.",
    );
  }

  const manifest =
    rawManifest as AudioGenerationManifest;
  const registry = Object.fromEntries(
    HISTORIC_TOUR_AUDIO_SLUGS.map(
      (slug) => [
        slug,
        {
          ...MANUAL_LANDMARK_AUDIO_REGISTRY[
            slug
          ],
        },
      ],
    ),
  ) as unknown as Record<
    HistoricTourAudioSlug,
    Partial<
      Record<Locale, LandmarkAudioPath>
    >
  >;

  for (const entry of manifest.assets) {
    if (registry[entry.landmark][entry.locale]) {
      throw new Error(
        `Duplicate landmark audio registration for ${entry.landmark}/${entry.locale}.`,
      );
    }

    registry[entry.landmark][entry.locale] =
      `/audio/${entry.file}` as LandmarkAudioPath;
  }

  return registry;
}

export const LANDMARK_AUDIO_REGISTRY =
  buildAudioRegistry();

export function getLandmarkAudioMap(
  slug: string,
): Readonly<
  Partial<Record<Locale, LandmarkAudioPath>>
> | undefined {
  if (
    !Object.prototype.hasOwnProperty.call(
      LANDMARK_AUDIO_REGISTRY,
      slug,
    )
  ) {
    return undefined;
  }

  return LANDMARK_AUDIO_REGISTRY[
    slug as HistoricTourAudioSlug
  ];
}

export function getLandmarkAudio(
  slug: string,
  locale: Locale,
): LandmarkAudioPath | undefined {
  return getLandmarkAudioMap(slug)?.[
    locale
  ];
}

export function hasLandmarkAudio(
  slug: string,
  locale: Locale,
): boolean {
  return Boolean(
    getLandmarkAudio(slug, locale),
  );
}

export function getAvailableAudioLocales(
  slug: string,
): readonly Locale[] {
  const audioByLocale =
    getLandmarkAudioMap(slug);

  if (!audioByLocale) {
    return [];
  }

  return locales.filter(
    (locale) => Boolean(audioByLocale[locale]),
  );
}

export function getPriorityAudioCoverage(
  slug: string,
): Readonly<
  Record<PriorityAudioLocale, boolean>
> {
  return Object.fromEntries(
    PRIORITY_AUDIO_LOCALES.map(
      (locale) => [
        locale,
        hasLandmarkAudio(slug, locale),
      ],
    ),
  ) as Record<
    PriorityAudioLocale,
    boolean
  >;
}
