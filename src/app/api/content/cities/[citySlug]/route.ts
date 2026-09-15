import { getPublicCitySnapshot, toLocalizedPublicCityResponse } from "@/lib/content/publicRepository.server";
import { isLocale } from "@/lib/i18n";
import {
  publicContentErrorResponse,
  publicContentJsonResponse,
} from "@/lib/content/publicHttp";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ citySlug: string }> },
) {
  const { citySlug } = await params;
  const requestedLocale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (!isLocale(requestedLocale)) {
    return publicContentErrorResponse("Unsupported locale.", 400);
  }
  try {
    const startedAt = performance.now();
    const snapshot = await getPublicCitySnapshot(citySlug);
    return publicContentJsonResponse(
      request,
      toLocalizedPublicCityResponse(snapshot, requestedLocale),
      performance.now() - startedAt,
    );
  } catch {
    return publicContentErrorResponse("Published city not found.", 404);
  }
}
