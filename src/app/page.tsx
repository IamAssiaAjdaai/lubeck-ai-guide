import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight, CircleCheck, Route } from "lucide-react";

import LanguageSelector from "@/components/LanguageSelector";
import { FeaturedCityCard } from "@/components/travel/CityCard";
import CityHero from "@/components/travel/CityHero";
import { brandHeroImage, cities } from "@/data/cities";
import { resolveFeaturedCityImage } from "@/lib/content/homeMedia";
import {
  getPublicCitySummaries,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { getContentSource } from "@/lib/content/source";
import { formatMessage, getDirection, getTranslations, isLocale, languages, locales } from "@/lib/i18n";

export default async function Home() {
  const contentSource = getContentSource();
  if (contentSource !== "code") await connection();
  const [cookieStore, publicCities] = await Promise.all([
    cookies(),
    getPublicCitySummaries(contentSource),
  ]);
  const savedLocale = cookieStore.get("preferred_locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "de";
  const t = getTranslations(locale);
  const direction = getDirection(locale);
  const ExploreIcon = direction === "rtl" ? ArrowLeft : ArrowRight;
  const availableCities = publicCities.flatMap((snapshot) => {
    const resolved = resolvePublicLocalization(snapshot.city.content, locale);
    if (!resolved) return [];
    const legacyCity = snapshot.city.slug === cities.lubeck.slug ? cities.lubeck : undefined;
    return [{
      slug: snapshot.city.slug,
      image: resolveFeaturedCityImage(
        contentSource,
        snapshot.media,
        locale,
        legacyCity?.heroImage,
      ),
      ...resolved,
    }];
  });
  const languageOptions = locales.map((item) => ({
    locale: item,
    nativeName: languages[item].nativeName,
  }));

  return (
    <main lang={locale} dir={direction} className="app-shell">
      <section className="content-container pb-14 pt-5 sm:pb-20 sm:pt-8">
        <div className="mb-6 flex min-h-11 items-center justify-between gap-4">
          <Link href="/" aria-label={t.common.appName} className="flex min-h-11 items-center gap-2 text-[15px] font-black tracking-[0.08em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><Route aria-hidden="true" size={19} strokeWidth={2} /></span>
            {t.common.appName}
          </Link>
          <LanguageSelector compact currentLocale={locale} label={t.home.chooseLanguage} closeLabel={t.common.back} options={languageOptions} />
        </div>

        <CityHero image={brandHeroImage} imageAlt={t.home.title} title={t.home.title} description={t.home.subtitle} />

        <div className="mx-auto mt-6 max-w-sm text-center">
          <Link
            href="#available-cities"
            data-testid="home-primary-action"
            className="button-primary w-full"
          >
            {t.home.discoverCity}
            <ExploreIcon aria-hidden="true" size={19} strokeWidth={1.8} />
          </Link>
          <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-text-secondary">
            <CircleCheck aria-hidden="true" size={15} strokeWidth={1.9} className="text-success" />
            {t.common.noSignUp}
          </p>
        </div>

        <section id="available-cities" className="mt-9 scroll-mt-5" aria-labelledby="available-cities-title">
          <h2 id="available-cities-title" className="eyebrow text-accent">{t.home.availableCities}</h2>
          <div className="mt-3 grid justify-items-center gap-5">
            {availableCities.map((city) => (
              <div key={city.slug} data-testid={`available-city-${city.slug}`} className="w-full max-w-[22.5rem]">
                <FeaturedCityCard
                  image={city.image}
                  name={city.content.name}
                  description={city.content.shortDescription}
                  href={`/${locale}/${city.slug}`}
                  actionLabel={formatMessage(t.home.exploreCity, { city: city.content.name })}
                  contentLocale={city.resolvedLocale}
                  contentDirection={getDirection(city.resolvedLocale)}
                  interfaceLocale={locale}
                  interfaceDirection={direction}
                />
              </div>
            ))}
          </div>
        </section>

      </section>
    </main>
  );
}
