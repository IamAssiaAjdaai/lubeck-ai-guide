import { PublicContentNotFoundError } from "@/lib/content/errors";
import {
  getPublicCitySnapshot,
  toLocalizedPublicCitySummaryResponse,
} from "@/lib/content/publicRepository.server";
import {
  publicContentErrorResponse,
  publicContentJsonResponse,
} from "@/lib/content/publicHttp";
import { isLocale } from "@/lib/i18n";

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
      toLocalizedPublicCitySummaryResponse(snapshot, requestedLocale),
      performance.now() - startedAt,
    );
  } catch (error) {
    if (!(error instanceof PublicContentNotFoundError)) {
      return publicContentErrorResponse("Content is temporarily unavailable.", 503);
    }
    return publicContentErrorResponse("Published city not found.", 404);
  }
}
