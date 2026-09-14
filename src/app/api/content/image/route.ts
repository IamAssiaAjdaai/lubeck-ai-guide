import { readFile } from "node:fs/promises";
import path from "node:path";

import { cities } from "@/data/cities";
import { lubeckPlaces } from "@/data/places";
import { isPublicImageVariant } from "@/lib/media/imageVariants";
import {
  publicImageResponse,
  transformPublicImage,
} from "@/lib/media/imageTransform.server";
import { mediaUnavailableResponse } from "@/lib/media/mediaDelivery.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const legacyImages = new Set([
  cities.lubeck.heroImage,
  ...lubeckPlaces.flatMap(({ image }) => image ? [image] : []),
]);

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const variant = searchParams.get("variant");
  if (!source || !legacyImages.has(source) || !isPublicImageVariant(variant)) {
    return mediaUnavailableResponse();
  }
  try {
    const relativePath = source.replace(/^\/+/, "");
    const bytes = await readFile(path.join(process.cwd(), "public", relativePath));
    return publicImageResponse(await transformPublicImage(bytes, variant));
  } catch {
    return mediaUnavailableResponse();
  }
}
