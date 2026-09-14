import { getPublicMediaDeliveryAsset } from "@/lib/media/publicMedia.server";
import {
  PUBLIC_MEDIA_CACHE_CONTROL,
  deliverPublicImageVariant,
  deliverPrivateMediaObject,
  mediaUnavailableResponse,
} from "@/lib/media/mediaDelivery.server";
import { isPublicImageVariant } from "@/lib/media/imageVariants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: Readonly<{ params: Promise<{ assetKey: string }> }>,
): Promise<Response> {
  const { assetKey } = await params;
  const asset = await getPublicMediaDeliveryAsset(assetKey);
  if (!asset) return mediaUnavailableResponse();
  const variant = new URL(request.url).searchParams.get("variant");
  if (variant !== null) {
    if (asset.kind !== "image" || !isPublicImageVariant(variant)) {
      return mediaUnavailableResponse();
    }
    return deliverPublicImageVariant(asset, variant);
  }
  return deliverPrivateMediaObject(
    request,
    asset,
    "Public media",
    PUBLIC_MEDIA_CACHE_CONTROL,
  );
}
