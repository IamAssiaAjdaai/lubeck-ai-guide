import {
  getPublicCitySummaries,
  toLocalizedPublicCityIndexResponse,
} from "@/lib/content/publicRepository.server";
import { isLocale } from "@/lib/i18n";

export async function GET(request: Request) {
  const requestedLocale =
    new URL(request.url).searchParams.get("locale") ?? "en";
  if (!isLocale(requestedLocale)) {
    return Response.json({ error: "Unsupported locale." }, { status: 400 });
  }

  try {
    const summaries = await getPublicCitySummaries();
    return Response.json(
      toLocalizedPublicCityIndexResponse(summaries, requestedLocale),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "City discovery is temporarily unavailable." },
      { status: 503 },
    );
  }
}
