import { cities } from "@/data/cities";
import { lubeckPlaces } from "@/data/places";
import { isPublicImageVariant } from "@/lib/media/imageVariants";
import { mediaUnavailableResponse } from "@/lib/media/mediaDelivery.server";

export const dynamic = "force-dynamic";

const LEGACY_IMAGE_REDIRECT_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

const legacyImages = new Set([
  cities.lubeck.heroImage,
  ...lubeckPlaces.flatMap(({ image }) => image ? [image] : []),
]);

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get("source");
  const variant = requestUrl.searchParams.get("variant");

  if (!source || !legacyImages.has(source) || !isPublicImageVariant(variant)) {
    return mediaUnavailableResponse();
  }

  // Legacy images already live in the app's public asset tree. Redirecting to
  // that immutable source keeps the existing variant URL contract while
  // avoiding runtime filesystem access and native image-processing add-ons.
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": LEGACY_IMAGE_REDIRECT_CACHE_CONTROL,
      Location: new URL(source, requestUrl.origin).toString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
