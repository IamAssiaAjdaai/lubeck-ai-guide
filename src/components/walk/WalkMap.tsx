"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getDirection, getTranslations, type Locale } from "@/lib/i18n";
import { localizePlaceCategories } from "@/data/placeCategories";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Point } from "@/lib/walk/planner";
import { walkCopy } from "@/lib/walk/copy";
const CityMap = dynamic(() => import("@/components/map/CityMap"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-surface" />,
});
export default function WalkMap({
  places,
  locale,
  citySlug,
  start,
  finish,
}: {
  places: readonly DiscoveryPlace[];
  locale: Locale;
  citySlug: string;
  start: Point;
  finish?: Point;
}) {
  const t = getTranslations(locale);
  const center = useMemo(
    () => [start.lng, start.lat] as const,
    [start.lng, start.lat],
  );
  const { location, status, requestLocation } = useUserLocation();
  return (
    <div className="walk-map my-4 overflow-hidden rounded-2xl">
      <CityMap
        places={places}
        categories={localizePlaceCategories(t)}
        locale={locale}
        city={citySlug}
        direction={getDirection(locale)}
        labelledBy="walk-title"
        initialCenter={center}
        initialZoom={14}
        userLocation={location}
        userLocationLabel={t.location.use}
        locationStatus={status}
        locationControlLabel={t.location.use}
        onLocationControl={() => void requestLocation()}
        centerUserLocationRequest={location?.timestamp ?? 0}
        mapLabels={t.map}
        walkingTimeTemplate={t.distance.walkingMinutes}
        fallbackDescription={walkCopy(locale).mapFallbackHelp}
        fallbackContent={places.length ? (
          <ol aria-label={walkCopy(locale).itinerary} className="grid gap-3 p-4">
            {places.map((place, index) => (
              <li key={place.slug} className="flex items-start gap-3 text-sm">
                <span aria-hidden="true" className="text-primary">{index + 1}.</span>
                <Link href={place.detailHref ?? `/${locale}/${citySlug}/${place.slug}`}
                  lang={place.actualLocale} dir={place.contentDirection}
                  className="min-w-0 flex-1 break-words font-medium underline underline-offset-4">
                  {place.name}
                </Link>
                <span className="shrink-0 text-text-secondary">{place.duration}</span>
              </li>
            ))}
          </ol>
        ) : null}
        routePoints={[
          start,
          ...places.map((place) => place.coordinates),
          ...(finish ? [finish] : []),
        ]}
      />
    </div>
  );
}
