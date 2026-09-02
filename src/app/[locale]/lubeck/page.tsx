import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import TrackedLink from "@/components/TrackedLink";
import { landmarks } from "@/data/landmarks";
import {
  getDirection,
  getTranslations,
  isLocale,
  locales,
} from "@/lib/i18n";

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
  const t = getTranslations(currentLocale);
  const direction = getDirection(currentLocale);
  const forwardArrow = direction === "rtl" ? "←" : "→";
  const backArrow = direction === "rtl" ? "→" : "←";

  return (
    <main
      lang={currentLocale}
      dir={direction}
      className="min-h-screen bg-white text-black"
    >
      <section className="mx-auto w-full max-w-md px-6 py-10">

        {/* Back */}
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 transition hover:text-black"
        >
          {backArrow} {t.common.back}
        </Link>

        {/* Header */}
        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {t.explore.title}
          </h1>

          <p className="mt-2 text-zinc-600">
            {t.explore.subtitle}
          </p>
        </header>

        {/* Walking Tour Card */}
        <section className="mt-8 rounded-3xl bg-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">
            {t.explore.walkingTour}
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {t.explore.historicCenter}
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            {t.explore.duration}
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
            {t.explore.startTour}
          </TrackedLink>
        </section>

        {/* Places */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            {t.explore.places}
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
                    {forwardArrow}
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
