import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import CityExperience from "@/components/travel/CityExperience";
import {
  getPublicCitySnapshot,
  type PublicCitySnapshot,
} from "@/lib/content/publicRepository.server";
import { getContentSource, type ContentSource } from "@/lib/content/source";
import { isLocale } from "@/lib/i18n";

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

  return (
    <CityExperience
      locale={locale}
      snapshot={snapshot}
      contentSource={contentSource}
    />
  );
}

async function loadDiscoverableCity(
  citySlug: string,
  source: ContentSource,
): Promise<PublicCitySnapshot> {
  try {
    return await getPublicCitySnapshot(citySlug, source);
  } catch {
    notFound();
  }
}
