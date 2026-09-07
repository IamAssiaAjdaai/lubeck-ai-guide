import type { ContentSource } from "@/lib/content/source";
import type { Locale } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

export type ResolvedLandmarkPageAudio = Readonly<{
  src: string;
  durationSeconds?: number;
}>;

export function resolveLandmarkPageAudio(
  source: ContentSource,
  cmsMedia: readonly PublicMedia[] | undefined,
  locale: Locale,
  legacyAudio: string | undefined,
): ResolvedLandmarkPageAudio | undefined {
  if (source === "code") return legacyAudio ? { src: legacyAudio } : undefined;
  const cmsAudio = cmsMedia?.find(
      (media) =>
        media.kind === "audio" &&
        media.purpose === "audio" &&
        media.locale === locale,
    );
  if (cmsAudio) {
    return {
      src: cmsAudio.url,
      ...(isReliableDuration(cmsAudio.durationSeconds)
        ? { durationSeconds: cmsAudio.durationSeconds }
        : {}),
    };
  }
  return legacyAudio ? { src: legacyAudio } : undefined;
}

function isReliableDuration(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
