import type { ContentSource } from "@/lib/content/source";
import type { Locale } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

type PlaceImageContext = "card" | "detail";

export function resolvePlaceImage(
  source: ContentSource,
  media: readonly PublicMedia[] | undefined,
  locale: Locale,
  legacyImage: string | undefined,
  context: PlaceImageContext,
): string | undefined {
  if (source === "code") return legacyImage;

  const purposes = context === "card"
    ? (["card", "hero"] as const)
    : (["hero", "card"] as const);

  for (const purpose of purposes) {
    const candidates = media?.filter(
      (item) =>
        item.kind === "image" &&
        item.purpose === purpose &&
        (item.locale === undefined || item.locale === locale),
    );
    const image =
      candidates?.find((item) => item.locale === locale) ??
      candidates?.find((item) => item.locale === undefined);

    if (image) return image.url;
  }

  return legacyImage;
}
