import type { PublicMedia } from "./contracts";

export function selectPrimaryImageMedia(
  media: readonly PublicMedia[],
): PublicMedia | undefined {
  return media.find(({ kind, purpose }) => kind === "image" && purpose === "card") ??
    media.find(({ kind, purpose }) => kind === "image" && purpose === "hero") ??
    media.find(({ kind, purpose }) => kind === "image" && purpose === "gallery");
}

export function selectPrimaryImage(
  media: readonly PublicMedia[],
  fallback?: string,
): string | undefined {
  return selectPrimaryImageMedia(media)?.url ?? fallback;
}

export function selectExactLocaleAudio(
  media: readonly PublicMedia[],
  locale: string,
): PublicMedia | undefined {
  return media.find((item) =>
    item.kind === "audio" &&
    item.purpose === "audio" &&
    item.locale === locale &&
    item.url.startsWith("/api/media/"),
  );
}
