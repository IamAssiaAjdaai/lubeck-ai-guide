import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PHOTON_ORIGIN = "https://photon.komoot.io";

type PhotonFeature = Readonly<{
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
}>;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = request.nextUrl.searchParams.get("city")?.trim() ?? "";
  const country = request.nextUrl.searchParams.get("country")?.trim().toUpperCase() ?? "";

  if (q.length < 3 || !city || !/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    q: `${q}, ${city}, ${country}`,
    limit: "6",
    lang: "en",
  });

  try {
    const response = await fetch(`${PHOTON_ORIGIN}/api?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return NextResponse.json({ suggestions: [] }, { status: 502 });

    const body = await response.json() as { features?: PhotonFeature[] };
    const suggestions = (body.features ?? [])
      .map(toSuggestion)
      .filter((value): value is NonNullable<ReturnType<typeof toSuggestion>> => Boolean(value))
      .filter((value) => !value.countryCode || value.countryCode === country.toLowerCase())
      .slice(0, 5)
      .map(({ countryCode: _countryCode, ...value }) => value);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}

function toSuggestion(feature: PhotonFeature) {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!coordinates || coordinates.length < 2 || !properties?.name) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const address = [
    [properties.street, properties.housenumber].filter(Boolean).join(" "),
    properties.postcode,
    properties.city ?? properties.district,
    properties.country,
  ].filter(Boolean);

  return {
    id: `${properties.osm_type ?? "osm"}-${properties.osm_id ?? `${latitude}-${longitude}`}`,
    name: properties.name,
    label: address.join(", ") || properties.name,
    latitude,
    longitude,
    countryCode: properties.countrycode?.toLowerCase(),
  };
}
