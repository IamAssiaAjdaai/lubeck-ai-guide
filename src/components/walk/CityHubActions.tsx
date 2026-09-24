"use client";
import Link from "next/link";
import { Map, MapPin, Heart } from "lucide-react";
import AskGuide from "@/components/AskGuide";
import { getDirection, getTranslations, type Locale } from "@/lib/i18n";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
export default function CityHubActions({
  locale,
  citySlug,
  place,
}: {
  locale: Locale;
  citySlug: string;
  place?: DiscoveryPlace;
}) {
  const t = walkCopy(locale);
  return (
    <div
      className="hub-actions my-5 grid grid-cols-4 gap-2"
      lang={walkCopyLocale(locale)}
    >
      <Link href="#places" className="button-secondary">
        <Map aria-hidden="true" />
        {t.places}
      </Link>
      <button
        className="button-secondary"
        onClick={() => {
          document
            .getElementById("places")
            ?.scrollIntoView({ behavior: "smooth" });
          window.dispatchEvent(new Event("citywalk:nearby"));
        }}
      >
        <MapPin aria-hidden="true" />
        {t.near}
      </button>
      <Link href={`/${locale}/walks`} className="button-secondary">
        <Heart aria-hidden="true" />
        {t.saved}
      </Link>
      {place && (
        <AskGuide
          compact
          citySlug={citySlug}
          placeSlug={place.slug}
          placeName={place.name}
          locale={locale}
          direction={getDirection(locale)}
          buttonLabel={t.ask}
          closeLabel={t.back}
          labels={getTranslations(locale).ai}
          suggestions={[]}
        />
      )}
    </div>
  );
}
