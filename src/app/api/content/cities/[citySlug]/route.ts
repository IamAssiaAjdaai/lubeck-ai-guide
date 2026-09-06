import { getPublicCitySnapshot, toLocalizedPublicCityResponse } from "@/lib/content/publicRepository.server";
import { isLocale } from "@/lib/i18n";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ citySlug: string }> },
) {
  const { citySlug } = await params;
  const requestedLocale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (!isLocale(requestedLocale)) {
    return Response.json({ error: "Unsupported locale." }, { status: 400 });
  }
  try {
    const snapshot = await getPublicCitySnapshot(citySlug);
    return Response.json(
      toLocalizedPublicCityResponse(snapshot, requestedLocale),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Published city not found." }, { status: 404 });
  }
}
