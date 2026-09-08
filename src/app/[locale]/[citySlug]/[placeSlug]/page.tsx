import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PlaceExperience } from "@/components/travel/PlaceExperience";
import { resolveExactLocalePublicAudio } from "@/lib/content/placeAudio";
import { resolvePlaceImage } from "@/lib/content/placeMedia";
import {
  getPublicCitySnapshot,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { getContentSource } from "@/lib/content/source";
import { getGuideEligibility } from "@/lib/guideEligibility.server";
import { formatMessage, getTranslations, isLocale } from "@/lib/i18n";

type GenericPlacePageProps = Readonly<{
  params: Promise<{
    locale: string;
    citySlug: string;
    placeSlug: string;
  }>;
}>;

export default function GenericPlacePage(props: GenericPlacePageProps) {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <GenericPlaceContent {...props} />
    </Suspense>
  );
}

export async function GenericPlaceContent({ params }: GenericPlacePageProps) {
  const { locale, citySlug, placeSlug } = await params;
  if (!isLocale(locale)) notFound();

  const contentSource = getContentSource();
  if (contentSource !== "code") await connection();

  const snapshot = await loadDiscoverableCity(citySlug, contentSource);
  const place = snapshot.places.find((candidate) => candidate.slug === placeSlug);
  if (!place) notFound();

  const resolvedContent = resolvePublicLocalization(place.content, locale);
  if (!resolvedContent) notFound();

  const translations = getTranslations(locale);
  const media = snapshot.media?.places[place.slug];
  const image = resolvePlaceImage(
    contentSource,
    media,
    locale,
    place.image,
    "detail",
  );
  const audio = contentSource === "code"
    ? undefined
    : resolveExactLocalePublicAudio(media, locale);
  const guideEnabled = await getGuideEligibility({
    citySlug,
    placeSlug: place.slug,
    source: contentSource,
    snapshot,
  });

  return (
    <PlaceExperience
      locale={locale}
      citySlug={citySlug}
      placeSlug={place.slug}
      contentLocale={resolvedContent.resolvedLocale}
      content={resolvedContent.content}
      image={image}
      audio={audio}
      categoryLabel={translations.placeCategories[place.category]}
      visitDurationLabel={formatMessage(
        translations.placeCatalog.placeDuration,
        {
          minutes: new Intl.NumberFormat(locale).format(place.durationMinutes),
        },
      )}
      backHref={`/${locale}/${citySlug}`}
      translations={translations}
      guideEnabled={guideEnabled}
    />
  );
}

async function loadDiscoverableCity(
  citySlug: string,
  source: ReturnType<typeof getContentSource>,
) {
  try {
    return await getPublicCitySnapshot(citySlug, source);
  } catch {
    notFound();
  }
}
