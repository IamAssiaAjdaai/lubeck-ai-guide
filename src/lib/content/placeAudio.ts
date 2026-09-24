import type { Locale } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

export type ResolvedPlaceAudio = Readonly<{
  src: string;
  durationSeconds?: number;
}>;

export function resolveExactLocalePublicAudio(
  media: readonly PublicMedia[] | undefined,
  locale: Locale,
): ResolvedPlaceAudio | undefined {
  const audio = media?.find(
    (item) =>
      item.kind === "audio" &&
      item.purpose === "audio" &&
      item.locale === locale,
  );

  if (!audio) return undefined;

  return {
    src: audio.url,
    ...(isReliableDuration(audio.durationSeconds)
      ? { durationSeconds: audio.durationSeconds }
      : {}),
  };
}

function isReliableDuration(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
