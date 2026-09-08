import { assertTrustedMutationOrigin, mediaErrorResponse } from "@/lib/media/http.server";
import { finalizeAuthorizedUpload } from "@/lib/media/service.server";
import { attachAuthorizedMedia } from "@/lib/media/service.server";
import { isLocale } from "@/lib/i18n";
import { MediaValidationError } from "@/lib/media/types";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
): Promise<Response> {
  try {
    assertTrustedMutationOrigin(request);
    const { id } = await params;
    const result = await finalizeAuthorizedUpload(Number(id));
    const body = (await request.json().catch(() => undefined)) as
      | { candidatePlaceId?: unknown; locale?: unknown }
      | undefined;
    if (body?.candidatePlaceId !== undefined) {
      if (!isLocale(body.locale)) {
        throw new MediaValidationError("Audio candidate locale is invalid.");
      }
      await attachAuthorizedMedia({
        entityType: "place",
        entityId: Number(body.candidatePlaceId),
        mediaAssetId: Number(id),
        purpose: "audio",
        position: 1,
        locale: body.locale,
      });
    }
    return Response.json(result);
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
