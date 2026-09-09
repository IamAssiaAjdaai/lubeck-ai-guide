import { getPublicMediaDeliveryAsset } from "@/lib/media/publicMedia.server";
import {
  deliverPrivateMediaObject,
  mediaUnavailableResponse,
} from "@/lib/media/mediaDelivery.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: Readonly<{ params: Promise<{ assetKey: string }> }>,
): Promise<Response> {
  const { assetKey } = await params;
  const asset = await getPublicMediaDeliveryAsset(assetKey);
  if (!asset) return mediaUnavailableResponse();
  return deliverPrivateMediaObject(request, asset, "Public media");
}
