import { cities } from "@/data/cities";
import { lubeckPlaces } from "@/data/places";
import {
  isPublicImageVariant,
  legacyImageVariantPath,
} from "@/lib/media/imageVariants";
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

  return Response.redirect(
    new URL(legacyImageVariantPath(source, variant), request.url),
    307,
  );
}
