import Link from "next/link";
import { cookies } from "next/headers";
import { Route } from "lucide-react";

import LanguageSelector from "@/components/LanguageSelector";
import { ComingSoonCityCard, FeaturedCityCard } from "@/components/travel/CityCard";
import CityHero from "@/components/travel/CityHero";
import { brandHeroImage, cities, upcomingCities } from "@/data/cities";
import { getDirection, getTranslations, isLocale, languages, locales } from "@/lib/i18n";

export default async function Home() {
  const savedLocale = (await cookies()).get("preferred_locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "de";
  const t = getTranslations(locale);
  const city = cities.lubeck;
  const languageOptions = locales.map((item) => ({
    locale: item,
    nativeName: languages[item].nativeName,
  }));

  return (
    <main lang={locale} dir={getDirection(locale)} className="app-shell">
      <section className="content-container pb-14 pt-5 sm:pb-20 sm:pt-8">
        <div className="mb-6 flex min-h-11 items-center justify-between gap-4">
          <Link href="/" aria-label={t.common.appName} className="flex min-h-11 items-center gap-2 text-[15px] font-black tracking-[0.08em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><Route aria-hidden="true" size={19} strokeWidth={2} /></span>
            {t.common.appName}
          </Link>
          <LanguageSelector compact currentLocale={locale} label={t.home.chooseLanguage} closeLabel={t.common.back} options={languageOptions} />
        </div>

        <CityHero image={brandHeroImage} imageAlt={t.home.title} title={t.home.title} description={t.home.subtitle} />

        <section className="mt-10">
          <p className="eyebrow text-accent">{t.home.availableNow}</p>
          <div className="mt-3">
            <FeaturedCityCard
              href={`/${locale}/${city.slug}`}
              image={city.heroImage}
              name={city.name}
              country={t.home.germany}
              description={t.home.featuredCityDescription}
              ctaLabel={t.explore.title}
            />
          </div>
        </section>

        <section className="mt-10">
          <p className="eyebrow">{t.home.moreCities}</p>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {upcomingCities.map((upcomingCity) => (
              <ComingSoonCityCard key={upcomingCity.slug} name={upcomingCity.name} status={t.home.comingSoon} />
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-[13px] text-text-secondary">{t.common.noAccount}</p>
      </section>
    </main>
  );
}
