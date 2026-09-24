import { MapPin } from "lucide-react";

import {
  localizePlaceDistance,
  type PlaceDistance,
} from "@/lib/distance";

type PlaceDistanceLabelProps = Readonly<{
  distance: PlaceDistance;
  locale: string;
  walkingTimeTemplate: string;
  className?: string;
}>;

export default function PlaceDistanceLabel({
  distance,
  locale,
  walkingTimeTemplate,
  className = "",
}: PlaceDistanceLabelProps) {
  const localizedDistance = localizePlaceDistance(
    distance,
    locale,
    walkingTimeTemplate,
  );

  if (!localizedDistance) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <MapPin aria-hidden="true" size={14} strokeWidth={1.8} />
      <span>{localizedDistance.distanceLabel}</span>
      <span aria-hidden="true">·</span>
      <span>{localizedDistance.walkingTimeLabel}</span>
    </span>
  );
}
