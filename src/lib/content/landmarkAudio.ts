import type { ContentSource } from "@/lib/content/source";
import type { Locale } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

export function resolveLandmarkPageAudio(
  source: ContentSource,
  cmsMedia: readonly PublicMedia[] | undefined,
  locale: Locale,
  legacyAudio: string | undefined,
): string | undefined {
  if (source === "code") return legacyAudio;
  return (
    cmsMedia?.find(
      (media) =>
        media.kind === "audio" &&
        media.purpose === "audio" &&
        media.locale === locale,
    )?.url ?? legacyAudio
  );
}
