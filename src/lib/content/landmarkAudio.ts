import type { ContentSource } from "@/lib/content/source";
import {
  resolveExactLocalePublicAudio,
  type ResolvedPlaceAudio,
} from "@/lib/content/placeAudio";
import type { Locale } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

export type ResolvedLandmarkPageAudio = ResolvedPlaceAudio;

export function resolveLandmarkPageAudio(
  source: ContentSource,
  cmsMedia: readonly PublicMedia[] | undefined,
  locale: Locale,
  legacyAudio: string | undefined,
): ResolvedLandmarkPageAudio | undefined {
  if (source === "code") return legacyAudio ? { src: legacyAudio } : undefined;
  const cmsAudio = resolveExactLocalePublicAudio(cmsMedia, locale);
  if (cmsAudio) return cmsAudio;
  return legacyAudio ? { src: legacyAudio } : undefined;
}
