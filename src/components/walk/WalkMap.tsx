"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getDirection, getTranslations, type Locale } from "@/lib/i18n";
import { localizePlaceCategories } from "@/data/placeCategories";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Point } from "@/lib/walk/planner";
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
        routePoints={[
          start,
          ...places.map((place) => place.coordinates),
          ...(finish ? [finish] : []),
        ]}
      />
    </div>
  );
}
