import Image from "next/image";
import { ChevronRight, Clock3, MapPin, Route } from "lucide-react";
import { getTranslations, formatMessage, type Locale } from "@/lib/i18n";
import { formatDistance } from "@/lib/distance";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { WalkRoute } from "@/lib/walk/planner";
import { walkCopy } from "@/lib/walk/copy";
import { isApplicationMediaPath } from "@/lib/media/imageDelivery";
export function RouteSummary({
  route,
  locale,
}: {
  route: WalkRoute<DiscoveryPlace>;
  locale: Locale;
}) {
  const t = walkCopy(locale);
  return (
    <dl className="route-summary">
      <div>
        <dt className="text-xs text-text-secondary">{t.duration}</dt>
        <dd className="font-bold">
          <Clock3 aria-hidden="true" />
          {formatMessage(t.minutes, { minutes: route.minutes })}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-text-secondary">{t.distance}</dt>
        <dd className="font-bold">
          <MapPin aria-hidden="true" />
          {formatDistance(route.distance, locale)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-text-secondary">{t.stops}</dt>
        <dd className="font-bold">
          <Route aria-hidden="true" />
          {route.places.length}{" "}
          <span className="text-xs font-normal">{t.stops}</span>
        </dd>
      </div>
    </dl>
  );
}
export function Itinerary({ places }: { places: readonly DiscoveryPlace[] }) {
  return (
    <ol className="walk-itinerary">
      {places.map((place, index) => (
        <li key={place.slug}>
          <a href={place.detailHref} className="itinerary-row">
            <span className="itinerary-number">{index + 1}</span>
            {place.image ? (
              <span className="itinerary-photo relative shrink-0 overflow-hidden">
                <Image
                  src={place.image}
                  alt=""
                  fill
                  sizes="70px"
                  unoptimized={isApplicationMediaPath(place.image)}
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="itinerary-photo itinerary-placeholder">
                <MapPin aria-hidden="true" />
              </span>
            )}
            <span
              className="min-w-0 flex-1"
              lang={place.actualLocale}
              dir={place.contentDirection}
            >
              <span className="block break-words font-semibold">
                {place.name}
              </span>
              <span className="mt-1 block text-xs text-text-secondary">
                {place.duration} ·{" "}
                {
                  getTranslations(place.requestedLocale).placeCategories[
                    place.category
                  ]
                }
              </span>
            </span>
            <ChevronRight
              size={16}
              className="shrink-0 text-text-secondary rtl:rotate-180"
            />
          </a>
        </li>
      ))}
    </ol>
  );
}
