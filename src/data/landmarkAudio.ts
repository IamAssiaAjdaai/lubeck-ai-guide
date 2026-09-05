import {
  locales,
  type Locale,
} from "@/lib/i18n";

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

export const LANDMARK_AUDIO_REGISTRY = {
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
