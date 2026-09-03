import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, House } from "lucide-react";

import PlaceDiscovery, {
  type DiscoveryPlace,
} from "@/components/travel/PlaceDiscovery";
import TourCard from "@/components/travel/TourCard";
import { cities } from "@/data/cities";
import { localizePlaceCategories } from "@/data/placeCategories";
import {
  lubeckLandmarks,
  lubeckPlaces,
} from "@/data/places";
import {
  formatMessage,
  getDirection,
  getTranslations,
  isLocale,
  languages,
  locales,
} from "@/lib/i18n";
import { prepareMapPlaces } from "@/lib/mapPlaces";

type LubeckPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LubeckPage({
  params,
}: LubeckPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const currentLocale = locale;
  const t = getTranslations(currentLocale);
  const direction = getDirection(currentLocale);
  const city = cities.lubeck;
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const [durationLabel, stopsLabel = ""] = t.explore.duration.split("•").map((value) => value.trim());
  const tourStopSlugs = new Set(lubeckLandmarks.map((place) => place.slug));
  const categories = localizePlaceCategories(t);
  const preparedPlaces = prepareMapPlaces(lubeckPlaces, currentLocale, {
    getDetailHref: (place) =>
      tourStopSlugs.has(place.slug)
        ? `/${currentLocale}/${city.slug}/${place.slug}`
        : undefined,
  });
  const catalogPlaces: readonly DiscoveryPlace[] = preparedPlaces.map(
    (place) => ({
      ...place,
      duration: formatMessage(t.placeCatalog.placeDuration, {
        minutes: new Intl.NumberFormat(currentLocale).format(
          place.durationMinutes,
        ),
      }),
      ...(place.didFallback
        ? {
            fallbackLabel: formatMessage(t.placeCatalog.contentFallback, {
              language: languages[place.actualLocale].nativeName,
            }),
          }
        : {}),
    }),
  );

  return (
    <main
      lang={currentLocale}
      dir={direction}
      className="app-shell"
    >
      <section className="content-container py-8 sm:py-12">

        {/* Back */}
        <Link
          href="/"
          className="button-tertiary -ms-3 min-h-11 px-3 text-sm"
        >
          <BackIcon aria-hidden="true" size={18} strokeWidth={1.8} /> <House aria-hidden="true" size={16} strokeWidth={1.8} /> {t.common.back}
        </Link>

        {/* Header */}
        <header className="mt-5">
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {t.explore.title}
          </h1>

          <p className="mt-2 leading-7 text-text-secondary">
            {t.explore.subtitle}
          </p>
        </header>

        {/* Walking Tour Card */}
        <div className="mt-7"><TourCard eyebrow={t.explore.walkingTour} title={t.explore.historicCenter} duration={durationLabel} stops={stopsLabel} ctaLabel={t.explore.startTour} href={`/${currentLocale}/${city.slug}/${city.startLandmarkSlug}`} locale={currentLocale} tourId={city.tourId} startLandmarkSlug={city.startLandmarkSlug} /></div>

        {/* Places */}
        <section className="mt-9">
          <h2
            id="place-category-heading"
            className="text-xl font-semibold tracking-[-0.02em]"
          >
            {t.explore.places}
          </h2>

          <PlaceDiscovery
            places={catalogPlaces}
            categories={categories}
            locale={currentLocale}
            city={city.slug}
            direction={direction}
            labelledBy="place-category-heading"
            locationLabels={t.location}
            mapLabels={t.map}
          />
        </section>
      </section>
    </main>
  );
}
