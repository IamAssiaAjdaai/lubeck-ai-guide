import type {
  PublicImageVariant,
  PublicImageVariantUrls,
} from "@/lib/media/types";

export const PUBLIC_IMAGE_VARIANT_SPECS = {
  thumbnail: { width: 320, quality: 70 },
  card: { width: 720, quality: 76 },
  detail: { width: 1280, quality: 80 },
  hero: { width: 1600, quality: 82 },
} as const satisfies Readonly<
  Record<PublicImageVariant, Readonly<{ width: number; quality: number }>>
>;

export function isPublicImageVariant(value: unknown): value is PublicImageVariant {
  return typeof value === "string" && value in PUBLIC_IMAGE_VARIANT_SPECS;
}

export function publicMediaImageVariants(assetKey: string): PublicImageVariantUrls {
  const base = `/api/media/${encodeURIComponent(assetKey)}`;
  return {
    thumbnail: `${base}?variant=thumbnail`,
    card: `${base}?variant=card`,
    detail: `${base}?variant=detail`,
    hero: `${base}?variant=hero`,
  };
}

export function publicLegacyImageVariants(path: string): PublicImageVariantUrls {
  const query = `source=${encodeURIComponent(path)}`;
  return {
    thumbnail: `/api/content/image?${query}&variant=thumbnail`,
    card: `/api/content/image?${query}&variant=card`,
    detail: `/api/content/image?${query}&variant=detail`,
    hero: `/api/content/image?${query}&variant=hero`,
  };
}
