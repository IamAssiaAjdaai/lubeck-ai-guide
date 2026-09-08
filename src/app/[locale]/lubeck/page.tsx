import { notFound } from "next/navigation";
import { connection } from "next/server";

import CityExperience from "@/components/travel/CityExperience";
import { cities } from "@/data/cities";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { getContentSource } from "@/lib/content/source";
import { getTranslations, isLocale, locales } from "@/lib/i18n";

type LubeckPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LubeckPage({ params }: LubeckPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const contentSource = getContentSource();
  if (contentSource !== "code") await connection();

  const snapshot = await getPublicCitySnapshot("lubeck", contentSource);
  const city = cities.lubeck;

  return (
    <CityExperience
      locale={locale}
      snapshot={snapshot}
      contentSource={contentSource}
      heading={getTranslations(locale).explore.title}
      headingLocale={locale}
      legacyCityImage={city.heroImage}
      plannerId={city.tourId}
      tourAnalyticsIds={{
        "historic-center-walk": city.tourId,
      }}
    />
  );
}
