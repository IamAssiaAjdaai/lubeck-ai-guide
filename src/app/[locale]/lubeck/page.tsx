import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight } from "lucide-react";

import CustomTourPlanner from "@/components/travel/CustomTourPlanner";
import PlaceDiscovery, {
  type DiscoveryPlace,
} from "@/components/travel/PlaceDiscovery";
import TourCard from "@/components/travel/TourCard";
import { cities } from "@/data/cities";
import { localizePlaceCategories } from "@/data/placeCategories";
import { resolvePlaceImage } from "@/lib/content/placeMedia";
import { getContentSource } from "@/lib/content/source";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
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
  const contentSource = getContentSource();
  if (contentSource !== "code") await connection();
  const publicSnapshot = await getPublicCitySnapshot("lubeck", contentSource);
  const t = getTranslations(currentLocale);
  const direction = getDirection(currentLocale);
  const city = cities.lubeck;
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const [durationLabel, stopsLabel = ""] = t.explore.duration.split("•").map((value) => value.trim());
  const categories = localizePlaceCategories(t);
  const preparedPlaces = prepareMapPlaces(
    publicSnapshot.places,
    currentLocale,
    {
      getDetailHref: (place) =>
        `/${currentLocale}/${city.slug}/${place.slug}`,
    },
  ).map((place) => ({
    ...place,
    image: resolvePlaceImage(
      contentSource,
      publicSnapshot.media?.places[place.slug],
      currentLocale,
      place.image,
      "card",
    ),
  }));
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
  const tourStart = publicSnapshot.places.find(
    (place) =>
      place.slug === city.startLandmarkSlug,
  );

  if (!tourStart) {
    throw new Error(
      `Missing tour start place ${city.startLandmarkSlug}.`,
    );
  }

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
          aria-label={t.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue-200 hover:text-accent"
        >
          <BackIcon aria-hidden="true" size={19} strokeWidth={1.8} />
        </Link>

        {/* Header */}
        <header className="mt-5">
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {t.explore.title}
          </h1>
        </header>

        {/* Walking Tour Card */}
        <div className="mt-7"><TourCard eyebrow={t.explore.walkingTour} title={t.explore.historicCenter} duration={durationLabel} stops={stopsLabel} ctaLabel={t.explore.startTour} href={`/${currentLocale}/${city.slug}/${city.startLandmarkSlug}`} locale={currentLocale} tourId={city.tourId} startLandmarkSlug={city.startLandmarkSlug} /></div>

        <div className="mt-3">
          <CustomTourPlanner
            places={catalogPlaces}
            categories={categories}
            preferenceLabels={t.tourPreferences}
            builderLabels={t.tourBuilder}
            locale={currentLocale}
            tourId={city.tourId}
            origin={tourStart.coordinates}
          />
        </div>

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
            distanceLabels={t.distance}
            storyLabel={t.landmark.listenStory}
            hiddenGemLabel={t.tourPreferences["hidden-gems"]}
          />
        </section>
      </section>
    </main>
  );
}
