import type { PublicImageVariantUrls, PublicMedia, PublicPlace } from "./contracts";

export type NativeImageUse = keyof PublicImageVariantUrls;

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

export function selectImageUrl(
  media: PublicMedia | undefined,
  fallback: string | undefined,
  fallbackVariants: PublicPlace["imageVariants"],
  use: NativeImageUse,
): string | undefined {
  return media?.variants?.[use] ?? fallbackVariants?.[use] ?? media?.url ?? fallback;
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
