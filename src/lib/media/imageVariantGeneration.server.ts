import "server-only";

import { dirname } from "node:path";

import sharp from "sharp";

import { PUBLIC_IMAGE_VARIANT_SPECS } from "@/lib/media/imageVariants";
import type { MediaObjectStore } from "@/lib/media/storage/types";
import type { PublicImageVariant } from "@/lib/media/types";

export function storedImageVariantKey(
  originalObjectKey: string,
  variant: PublicImageVariant,
): string {
  return `${dirname(originalObjectKey)}/variants/${variant}.webp`;
}

export async function generateStoredImageVariants(
  store: MediaObjectStore,
  originalObjectKey: string,
): Promise<void> {
  const object = await store.readObject(originalObjectKey);
  if (!object) throw new Error("Uploaded image object was not found.");
  const source = await new Response(object.body).arrayBuffer();

  for (const [variant, spec] of Object.entries(PUBLIC_IMAGE_VARIANT_SPECS) as [
    PublicImageVariant,
    (typeof PUBLIC_IMAGE_VARIANT_SPECS)[PublicImageVariant],
  ][]) {
    const bytes = await sharp(source, { failOn: "warning" })
      .rotate()
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality, effort: 4 })
      .toBuffer();
    await store.writeObject(
      storedImageVariantKey(originalObjectKey, variant),
      bytes,
      "image/webp",
    );
  }
}
