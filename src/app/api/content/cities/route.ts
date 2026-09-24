import {
  getPublicCitySummaries,
  toLocalizedPublicCityIndexResponse,
} from "@/lib/content/publicRepository.server";
import { isLocale } from "@/lib/i18n";
import {
  publicContentErrorResponse,
  publicContentJsonResponse,
} from "@/lib/content/publicHttp";

export async function GET(request: Request) {
  const requestedLocale =
    new URL(request.url).searchParams.get("locale") ?? "en";
  if (!isLocale(requestedLocale)) {
    return publicContentErrorResponse("Unsupported locale.", 400);
  }

  try {
    const startedAt = performance.now();
    const summaries = await getPublicCitySummaries();
    return publicContentJsonResponse(
      request,
      toLocalizedPublicCityIndexResponse(summaries, requestedLocale),
      performance.now() - startedAt,
    );
  } catch {
    return publicContentErrorResponse("City discovery is temporarily unavailable.", 503);
  }
}
