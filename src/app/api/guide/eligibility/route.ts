import { getGuideEligibility } from "@/lib/guideEligibility.server";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const citySlug = searchParams.get("citySlug")?.trim() ?? "";
  const placeSlug = searchParams.get("placeSlug")?.trim() ?? "";

  if (!SLUG_PATTERN.test(citySlug) || !SLUG_PATTERN.test(placeSlug)) {
    return Response.json(
      { error: "Valid city and place slugs are required." },
      { status: 400 },
    );
  }

  return Response.json(
    { eligible: await getGuideEligibility({ citySlug, placeSlug }) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
