import { getWalkVerifiedSources } from "@/lib/walk/verifiedSources.server";
import { getContentSource } from "@/lib/content/source";
import { PublicContentNotFoundError } from "@/lib/content/errors";
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
    // Resolve publication first; source verification never grants publication.
    const detail = toLocalizedPublicPlaceResponse(snapshot, placeSlug, requestedLocale);
    const verifiedSources = await getWalkVerifiedSources(citySlug, placeSlug, getContentSource());
    return publicContentJsonResponse(
      request,
      { ...detail, verifiedSources },
      performance.now() - startedAt,
    );
  } catch (error) {
    if (!(error instanceof PublicContentNotFoundError)) {
      return publicContentErrorResponse("Content is temporarily unavailable.", 503);
    }
    return publicContentErrorResponse("Published place not found.", 404);
  }
}
