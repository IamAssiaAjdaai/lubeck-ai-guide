import AppHeader from "@/components/walk/AppHeader";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import CityHubActions from "@/components/walk/CityHubActions";
import WalkPlanner from "@/components/walk/WalkPlanner";
import BottomNavigation from "@/components/walk/BottomNavigation";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
import { MediaAttribution } from "@/components/travel/MediaAttribution";
import PlaceDiscovery, {
  type DiscoveryPlace,
} from "@/components/travel/PlaceDiscovery";
import TourCard, { type TourCardStop } from "@/components/travel/TourCard";
import { localizePlaceCategories } from "@/data/placeCategories";
import type { Place, PlaceCoordinates } from "@/data/places";
import {
  resolveCityHeroImage,
  resolveCityHeroMedia,
} from "@/lib/content/homeMedia";
import {
  resolvePlaceImage,
  resolvePlaceImageMedia,
} from "@/lib/content/placeMedia";
import {
  resolvePublicLocalization,
  type PublicCitySnapshot,
  type PublicTour,
} from "@/lib/content/publicRepository.server";
import type { ContentSource } from "@/lib/content/source";
import {
  formatMessage,
  getDirection,
  getTranslations,
  languages,
  type Locale,
} from "@/lib/i18n";
import { prepareMapPlaces } from "@/lib/mapPlaces";
import { getCityScopedTourId } from "@/lib/tourIdentity";

type CityExperienceProps = Readonly<{
  locale: Locale;
  snapshot: PublicCitySnapshot;
  contentSource: ContentSource;
  heading?: string;
  headingLocale?: Locale;
  legacyCityImage?: string;
  plannerId?: string;
  tourAnalyticsIds?: Readonly<Record<string, string>>;
}>;

type ResolvedTour = Readonly<{
  tour: PublicTour;
  title: string;
  description?: string;
  contentLocale: Locale;
  duration?: string;
  stopsLabel: string;
  stops: readonly TourCardStop[];
  startPlace: Place;
}>;

export default function CityExperience({
  locale,
  snapshot,
  contentSource,
  legacyCityImage,
  tourAnalyticsIds,
}: CityExperienceProps) {
  const translations = getTranslations(locale);
  const interfaceDirection = getDirection(locale);
  const BackIcon = interfaceDirection === "rtl" ? ArrowRight : ArrowLeft;
  const city = resolvePublicLocalization(snapshot.city.content, locale);

  if (!city) {
    throw new Error("Published city has no authored localization.");
  }

  const categories = localizePlaceCategories(translations);
  const preparedPlaces = prepareMapPlaces(snapshot.places, locale, {
    getDetailHref: (place) => `/${locale}/${snapshot.city.slug}/${place.slug}`,
  }).map((place) => {
    const media = snapshot.media?.places[place.slug];
    const selectedImage = resolvePlaceImageMedia(
      contentSource,
      media,
      locale,
      "card",
    );

    return {
      ...place,
      image: resolvePlaceImage(
        contentSource,
        media,
        locale,
        place.image,
        "card",
      ),
      ...(selectedImage?.attribution
        ? { imageAttribution: selectedImage.attribution }
        : {}),
    };
  });
  const catalogPlaces: readonly DiscoveryPlace[] = preparedPlaces.map(
    (place) => ({
      ...place,
      duration: formatMessage(translations.placeCatalog.placeDuration, {
        minutes: new Intl.NumberFormat(locale).format(place.durationMinutes),
      }),
      ...(place.didFallback
        ? {
            fallbackLabel: formatMessage(
              translations.placeCatalog.contentFallback,
              { language: languages[place.actualLocale].nativeName },
            ),
          }
        : {}),
    }),
  );
  const tours = resolveTours(snapshot, locale, translations);
  const plannerOrigin = resolveCityPlannerOrigin(snapshot);
  const cityHeroMedia = resolveCityHeroMedia(
    contentSource,
    snapshot.media?.city,
    locale,
  );
  const cityImage = resolveCityHeroImage(
    contentSource,
    snapshot.media?.city,
    locale,
    legacyCityImage,
  );
  const titleLocale = city.resolvedLocale;
  const v2 = walkCopy(locale);

  return (
    <main lang={locale} dir={interfaceDirection} className="app-shell">
      <section className="content-container pt-6">
        <AppHeader />
        <Link
          href="/"
          aria-label={translations.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue-200 hover:text-accent"
        >
          <BackIcon aria-hidden="true" size={19} strokeWidth={1.8} />
        </Link>

        <header className="walk-hero walk-city-hero">
          {cityImage ? (
            <figure>
              <MediaAttribution
                as="figcaption"
                attribution={cityHeroMedia?.attribution}
                className="px-6 pt-3"
              />
            </figure>
          ) : null}
          <div className="relative z-10 pt-8">
            <h1
              lang={titleLocale}
              dir={getDirection(titleLocale)}
              className="text-[2.8rem] font-bold leading-tight tracking-[-0.03em]"
            >
              {city.content.name}
            </h1>
            <p
              className="mt-3 text-text-secondary"
              lang={walkCopyLocale(locale)}
            >
              {v2.hubSubtitle}
            </p>
          </div>
        </header>

        {plannerOrigin ? (
          <div className="mt-6">
            <WalkPlanner
              places={catalogPlaces}
              locale={locale}
              citySlug={snapshot.city.slug}
              cityName={city.content.name}
            />
          </div>
        ) : null}

        <CityHubActions
          locale={locale}
          citySlug={snapshot.city.slug}
          place={catalogPlaces[0]}
        />
        {city.content.shortDescription && (
          <details
            lang={city.resolvedLocale}
            dir={getDirection(city.resolvedLocale)}
            className="mt-4 text-sm leading-6 text-text-secondary"
          >
            <summary className="cursor-pointer">
              {city.content.shortDescription}
            </summary>
            {city.content.description && (
              <p className="mt-2">{city.content.description}</p>
            )}
          </details>
        )}
        {tours.length > 0 ? (
          <section
            aria-label={translations.explore.walkingTour}
            className="mt-7 grid gap-4"
          >
            <h2 className="text-xl font-bold" lang={walkCopyLocale(locale)}>
              {v2.suggested}
            </h2>
            {tours.map((resolvedTour) => (
              <TourCard
                key={resolvedTour.tour.slug}
                image={
                  preparedPlaces.find(
                    (place) => place.slug === resolvedTour.startPlace.slug,
                  )?.image
                }
                eyebrow={translations.explore.walkingTour}
                title={resolvedTour.title}
                description={resolvedTour.description}
                contentLanguage={resolvedTour.contentLocale}
                contentDirection={getDirection(resolvedTour.contentLocale)}
                duration={resolvedTour.duration}
                stops={resolvedTour.stopsLabel}
                stopNames={resolvedTour.stops}
                ctaLabel={translations.explore.startTour}
                href={`/${locale}/${snapshot.city.slug}/${resolvedTour.startPlace.slug}`}
                locale={locale}
                tourId={
                  tourAnalyticsIds?.[resolvedTour.tour.slug] ??
                  getCityScopedTourId(
                    snapshot.city.slug,
                    resolvedTour.tour.slug,
                  )
                }
                startLandmarkSlug={resolvedTour.startPlace.slug}
              />
            ))}
          </section>
        ) : null}

        <section id="places" className="mt-9 scroll-mt-6">
          <h2
            id="place-category-heading"
            className="text-xl font-semibold tracking-[-0.02em]"
          >
            {translations.explore.places}
          </h2>

          <PlaceDiscovery
            places={catalogPlaces}
            categories={categories}
            locale={locale}
            city={snapshot.city.slug}
            direction={interfaceDirection}
            labelledBy="place-category-heading"
            locationLabels={translations.location}
            mapLabels={translations.map}
            distanceLabels={translations.distance}
            storyLabel={translations.landmark.listenStory}
            hiddenGemLabel={translations.tourPreferences["hidden-gems"]}
          />
        </section>
      </section>
      <BottomNavigation
        locale={locale}
        citySlug={snapshot.city.slug}
        active="explore"
      />
    </main>
  );
}

function resolveTours(
  snapshot: PublicCitySnapshot,
  locale: Locale,
  translations: ReturnType<typeof getTranslations>,
): readonly ResolvedTour[] {
  const placesBySlug = new Map(
    snapshot.places.map((place) => [place.slug, place] as const),
  );

  return snapshot.tours.flatMap((tour): ResolvedTour[] => {
    const content = resolvePublicLocalization(tour.content, locale);
    const orderedStops = [...tour.stops].sort(
      (first, second) => first.position - second.position,
    );
    const startPlace = orderedStops[0]
      ? placesBySlug.get(orderedStops[0].placeSlug)
      : undefined;

    if (!content || !startPlace) return [];

    const stops = orderedStops.flatMap((stop): TourCardStop[] => {
      const place = placesBySlug.get(stop.placeSlug);
      if (!place) return [];
      const placeContent = resolvePublicLocalization(place.content, locale);
      return placeContent
        ? [
            {
              name: placeContent.content.name,
              language: placeContent.resolvedLocale,
              direction: getDirection(placeContent.resolvedLocale),
            },
          ]
        : [];
    });

    return [
      {
        tour,
        title: content.content.title,
        description: [
          content.content.shortDescription,
          content.content.description,
        ].find((value) => value && value !== translations.explore.walkingTour),
        contentLocale: content.resolvedLocale,
        ...(tour.estimatedDurationMinutes
          ? {
              duration: formatMessage(translations.tourBuilder.minutesFormat, {
                minutes: new Intl.NumberFormat(locale).format(
                  tour.estimatedDurationMinutes,
                ),
              }),
            }
          : {}),
        stopsLabel: `${new Intl.NumberFormat(locale).format(stops.length)} ${translations.tourBuilder.stops}`,
        stops,
        startPlace,
      },
    ];
  });
}

export function resolveCityPlannerOrigin(
  snapshot: PublicCitySnapshot,
): PlaceCoordinates | undefined {
  const placesBySlug = new Map(
    snapshot.places.map((place) => [place.slug, place] as const),
  );
  const firstTourStop = snapshot.tours[0]
    ? [...snapshot.tours[0].stops].sort(
        (first, second) => first.position - second.position,
      )[0]
    : undefined;

  return (
    (firstTourStop
      ? placesBySlug.get(firstTourStop.placeSlug)?.coordinates
      : undefined) ?? snapshot.places[0]?.coordinates
  );
}
