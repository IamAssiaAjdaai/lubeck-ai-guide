import { assertTrustedMutationOrigin, mediaErrorResponse } from "@/lib/media/http.server";
import { createAuthorizedUploadIntent } from "@/lib/media/service.server";
import type { UploadIntentInput } from "@/lib/media/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedMutationOrigin(request);
    const body = (await request.json()) as Partial<UploadIntentInput>;
    const result = await createAuthorizedUploadIntent({
      cityId: Number(body.cityId),
      kind: body.kind as UploadIntentInput["kind"],
      originalFilename: String(body.originalFilename ?? ""),
      mimeType: String(body.mimeType ?? ""),
      sizeBytes: Number(body.sizeBytes),
      ...(body.locale ? { locale: body.locale } : {}),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return mediaErrorResponse(error);
  }
}

