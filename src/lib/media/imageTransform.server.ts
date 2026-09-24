import "server-only";

import sharp from "sharp";

import { PUBLIC_IMAGE_VARIANT_SPECS } from "@/lib/media/imageVariants";
import type { PublicImageVariant } from "@/lib/media/types";

export const PUBLIC_IMAGE_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

export async function transformPublicImage(
  source: ArrayBuffer | Uint8Array,
  variant: PublicImageVariant,
): Promise<Uint8Array> {
  const spec = PUBLIC_IMAGE_VARIANT_SPECS[variant];
  return sharp(source, { failOn: "warning" })
    .rotate()
    .resize({ width: spec.width, withoutEnlargement: true })
    .webp({ quality: spec.quality, effort: 4 })
    .toBuffer();
}

export function publicImageResponse(body: Uint8Array): Response {
  return new Response(Uint8Array.from(body).buffer, {
    headers: {
      "Cache-Control": PUBLIC_IMAGE_CACHE_CONTROL,
      "Content-Length": String(body.byteLength),
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
