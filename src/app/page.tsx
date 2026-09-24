import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
import AppHeader from "@/components/walk/AppHeader";
import { cookies } from "next/headers";
import { connection } from "next/server";
import LanguageSelector from "@/components/LanguageSelector";
import CitySelector, { type CityChoice } from "@/components/walk/CitySelector";
import BottomNavigation from "@/components/walk/BottomNavigation";
import { cityLaunches } from "@/data/cityAvailability";
import { resolveFeaturedCityImage } from "@/lib/content/homeMedia";
import {
  getPublicCitySummaries,
  resolvePublicLocalization,
} from "@/lib/content/publicRepository.server";
import { getContentSource } from "@/lib/content/source";
import {
  getDirection,
  getTranslations,
  isLocale,
  languages,
  locales,
} from "@/lib/i18n";

export default async function Home() {
  const source = getContentSource();
  if (source !== "code") await connection();
  const [cookieStore, summaries] = await Promise.all([
    cookies(),
    getPublicCitySummaries(source),
  ]);
  const savedLocale = cookieStore.get("preferred_locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "de";
  const t = getTranslations(locale);
  const choices: CityChoice[] = summaries.flatMap((snapshot) => {
    const localized = resolvePublicLocalization(snapshot.city.content, locale);
    if (!localized) return [];
    const launch = cityLaunches[snapshot.city.slug];
    return [
      {
        slug: snapshot.city.slug,
        name: localized.content.name,
        description: localized.content.shortDescription,
        contentLocale: localized.resolvedLocale,
        status: launch?.status ?? "available",
        coordinates: launch?.coordinates,
        credit: launch?.credit,
        image: resolveFeaturedCityImage(
          source,
          snapshot.media,
          locale,
          launch?.heroImage,
        ),
      },
    ];
  });
  for (const [slug, launch] of Object.entries(cityLaunches)) {
    if (
      launch.status === "coming_soon" &&
      !choices.some((city) => city.slug === slug)
    )
      choices.push({
        slug,
        ...launch,
        image: launch.heroImage,
        contentLocale: walkCopyLocale(locale),
        description:
          slug === "hamburg"
            ? walkCopy(locale).hamburgDescription
            : walkCopy(locale).duesseldorfDescription,
      });
  }
  return (
    <main lang={locale} dir={getDirection(locale)} className="app-shell">
      <div className="content-container pt-6">
        <AppHeader>
          <LanguageSelector
            compact
            currentLocale={locale}
            label={t.home.chooseLanguage}
            closeLabel={t.common.back}
            options={locales.map((value) => ({
              locale: value,
              nativeName: languages[value].nativeName,
            }))}
          />
        </AppHeader>
        <CitySelector locale={locale} cities={choices} />
      </div>
      <BottomNavigation locale={locale} />
    </main>
  );
}
