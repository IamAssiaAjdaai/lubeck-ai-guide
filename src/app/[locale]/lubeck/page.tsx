import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import TrackedLink from "@/components/TrackedLink";
import { landmarks } from "@/data/landmarks";
import {
  locales,
  translations,
  type Locale,
} from "@/data/translations";

type LubeckPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LubeckPage({
  params,
}: LubeckPageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const currentLocale = locale as Locale;
  const t = translations[currentLocale];

  const isArabic = currentLocale === "ar";

  const labels = {
    en: {
      walkingTour: "Walking Tour",
      historicCenter: "Lübeck Historic Center",
      duration: "~45 min • 5 stops",
      places: "Places",
    },

    de: {
      walkingTour: "Stadtrundgang",
      historicCenter: "Historisches Zentrum von Lübeck",
      duration: "~45 Min. • 5 Stopps",
      places: "Orte",
    },

    fr: {
      walkingTour: "Visite à pied",
      historicCenter: "Centre historique de Lübeck",
      duration: "~45 min • 5 étapes",
      places: "Lieux",
    },

    ar: {
      walkingTour: "جولة سيراً على الأقدام",
      historicCenter: "المركز التاريخي لمدينة لوبيك",
      duration: "حوالي 45 دقيقة • 5 محطات",
      places: "الأماكن",
    },
  }[currentLocale];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-black"
    >
      <section className="mx-auto w-full max-w-md px-6 py-10">

        {/* Back */}
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 transition hover:text-black"
        >
          {isArabic ? "→" : "←"} {t.back}
        </Link>

        {/* Header */}
        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {t.discover}
          </h1>

          <p className="mt-2 text-zinc-600">
            {t.places}
          </p>
        </header>

        {/* Walking Tour Card */}
        <section className="mt-8 rounded-3xl bg-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">
            {labels.walkingTour}
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {labels.historicCenter}
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            {labels.duration}
          </p>

          <TrackedLink
            href={`/${currentLocale}/lubeck/holstentor`}
            eventName="tour_started"
            properties={{
              locale: currentLocale,
              start_landmark_slug: "holstentor",
              tour_id: "lubeck_historic_center",
            }}
            className="mt-5 flex h-14 items-center justify-center rounded-xl bg-black px-5 font-semibold text-white transition hover:bg-zinc-800"
          >
            {t.startTour}
          </TrackedLink>
        </section>

        {/* Places */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            {labels.places}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            {landmarks.map((landmark) => {
              const content =
                landmark.content[currentLocale];

              return (
                <TrackedLink
                  key={landmark.slug}
                  href={`/${currentLocale}/lubeck/${landmark.slug}`}
                  eventName="landmark_selected"
                  properties={{
                    landmark_slug: landmark.slug,
                    locale: currentLocale,
                  }}
                  className="group flex items-center gap-4 rounded-2xl border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  {/* Image */}
                  {landmark.image ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                      <Image
                        src={landmark.image}
                        alt={content.name}
                        fill
                        sizes="80px"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-xl bg-zinc-200" />
                  )}

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      {content.name}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      🎧 {content.duration}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className="text-xl text-zinc-400">
                    {isArabic ? "←" : "→"}
                  </span>
                </TrackedLink>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}