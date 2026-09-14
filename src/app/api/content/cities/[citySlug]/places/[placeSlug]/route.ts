import {
  getPublicCitySnapshot,
  toLocalizedPublicPlaceResponse,
} from "@/lib/content/publicRepository.server";
import {
  publicContentErrorResponse,
  publicContentJsonResponse,
} from "@/lib/content/publicHttp";
import { isLocale } from "@/lib/i18n";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ citySlug: string; placeSlug: string }> },
) {
  const { citySlug, placeSlug } = await params;
  const requestedLocale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (!isLocale(requestedLocale)) {
    return publicContentErrorResponse("Unsupported locale.", 400);
  }
  try {
    const startedAt = performance.now();
    const snapshot = await getPublicCitySnapshot(citySlug);
    return publicContentJsonResponse(
      request,
      toLocalizedPublicPlaceResponse(snapshot, placeSlug, requestedLocale),
      performance.now() - startedAt,
    );
  } catch {
    return publicContentErrorResponse("Published place not found.", 404);
  }
}
