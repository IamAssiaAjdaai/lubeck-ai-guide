import { auth } from "@/lib/auth/server";
import { requireCityPass } from "@/lib/commerce/cityPassAccess.server";
import { getPremiumMediaDeliveryAsset } from "@/lib/commerce/premiumMedia.server";
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
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return mediaUnavailableResponse();

  const { assetKey } = await params;
  const asset = await getPremiumMediaDeliveryAsset(assetKey);
  if (!asset) return mediaUnavailableResponse();

  try {
    await requireCityPass({
      userId: session.user.id,
      citySlug: asset.requiredEntitlement.scopeKey,
    });
  } catch {
    return mediaUnavailableResponse();
  }

  return deliverPrivateMediaObject(request, asset, "Premium media");
}
