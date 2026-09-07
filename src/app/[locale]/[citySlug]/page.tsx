import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";

import { localizePlaceCategories } from "@/data/placeCategories";
import { resolveFeaturedCityImage } from "@/lib/content/homeMedia";
import {
  getPublicCitySnapshot,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { getContentSource } from "@/lib/content/source";
import {
  formatMessage,
  getDirection,
  getTranslations,
  isLocale,
} from "@/lib/i18n";

type GenericCityPageProps = Readonly<{
  params: Promise<{
    locale: string;
    citySlug: string;
  }>;
}>;

export default function GenericCityPage(props: GenericCityPageProps) {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <GenericCityContent {...props} />
    </Suspense>
  );
}

export async function GenericCityContent({ params }: GenericCityPageProps) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();

  const contentSource = getContentSource();
  if (contentSource !== "code") await connection();

  const snapshot = await loadDiscoverableCity(citySlug, contentSource);
  const city = resolvePublicLocalization(snapshot.city.content, locale);
  if (!city) notFound();

  const translations = getTranslations(locale);
  const interfaceDirection = getDirection(locale);
  const contentDirection = getDirection(city.resolvedLocale);
  const BackIcon = interfaceDirection === "rtl" ? ArrowRight : ArrowLeft;
  const categoryLabels = new Map(
    localizePlaceCategories(translations).flatMap((category) =>
      category.category ? [[category.category, category.label] as const] : [],
    ),
  );
  const places = snapshot.places.flatMap((place) => {
    const resolved = resolvePublicLocalization(place.content, locale);
    return resolved ? [{ place, ...resolved }] : [];
  });
  const cityImage = resolveFeaturedCityImage(
    contentSource,
    snapshot.media?.city,
    locale,
  );

  return (
    <main lang={locale} dir={interfaceDirection} className="app-shell">
      <section className="content-container py-8 sm:py-12">
        <Link
          href="/"
          aria-label={translations.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue-200 hover:text-accent"
        >
          <BackIcon aria-hidden="true" size={19} strokeWidth={1.8} />
        </Link>

        <header className="mt-5 overflow-hidden rounded-3xl border border-border bg-white">
          {cityImage ? (
            <div className="relative aspect-[16/9] bg-surface">
              <Image
                src={cityImage}
                alt={city.content.name}
                fill
                priority
                sizes="(max-width: 480px) calc(100vw - 48px), 432px"
                className="object-cover"
              />
            </div>
          ) : null}
          <div
            lang={city.resolvedLocale}
            dir={contentDirection}
            className="p-6"
          >
            <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">
              {city.content.name}
            </h1>
            {city.content.shortDescription ? (
              <p className="mt-3 text-[15px] leading-6 text-text-secondary">
                {city.content.shortDescription}
              </p>
            ) : null}
          </div>
        </header>

        <section className="mt-9" aria-labelledby="generic-city-places">
          <h2
            id="generic-city-places"
            className="text-xl font-semibold tracking-[-0.02em]"
          >
            {translations.explore.places}
          </h2>
          <div className="mt-4 grid gap-3">
            {places.map(({ place, content, resolvedLocale }) => (
              <article
                key={place.slug}
                lang={resolvedLocale}
                dir={getDirection(resolvedLocale)}
                className="surface-card p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
                    aria-hidden="true"
                  >
                    <MapPin size={19} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-[-0.02em]">
                      {content.name}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {categoryLabels.get(place.category)} · {formatMessage(
                        translations.placeCatalog.placeDuration,
                        {
                          minutes: new Intl.NumberFormat(locale).format(
                            place.durationMinutes,
                          ),
                        },
                      )}
                    </p>
                    <p className="mt-2 text-[15px] leading-6 text-text-secondary">
                      {content.shortDescription}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
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
