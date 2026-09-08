import type { ContentSource } from "@/lib/content/source";
import type { Locale } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

export function resolveFeaturedCityImage(
  source: ContentSource,
  media: readonly PublicMedia[] | undefined,
  locale: Locale,
  legacyImage?: string,
): string | undefined {
  if (source === "code") return legacyImage;
  return (
    findImage(media, "card", locale)?.url ??
    findImage(media, "hero", locale)?.url ??
    legacyImage
  );
}

export function resolveCityHeroImage(
  source: ContentSource,
  media: readonly PublicMedia[] | undefined,
  locale: Locale,
  legacyImage?: string,
): string | undefined {
  if (source === "code") return legacyImage;
  return (
    findImage(media, "hero", locale)?.url ??
    findImage(media, "card", locale)?.url ??
    legacyImage
  );
}

function findImage(
  media: readonly PublicMedia[] | undefined,
  purpose: "card" | "hero",
  locale: Locale,
): PublicMedia | undefined {
  const candidates = media?.filter(
    (item) =>
      item.kind === "image" &&
      item.purpose === purpose &&
      (item.locale === undefined || item.locale === locale),
  );
  return (
    candidates?.find((item) => item.locale === locale) ??
    candidates?.find((item) => item.locale === undefined)
  );
}
