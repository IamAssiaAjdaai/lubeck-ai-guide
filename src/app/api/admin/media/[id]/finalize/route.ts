import { assertTrustedMutationOrigin, mediaErrorResponse } from "@/lib/media/http.server";
import { finalizeAuthorizedUpload } from "@/lib/media/service.server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
): Promise<Response> {
  try {
    assertTrustedMutationOrigin(request);
    const { id } = await params;
    const result = await finalizeAuthorizedUpload(Number(id));
    return Response.json(result);
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
